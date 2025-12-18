<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache; // Added Cache facade
use App\Models\Request;
use App\Models\Patient;
use App\Models\Doctor;
use App\Models\Department;
use App\Models\Location;
use App\Models\RequestEvent;
use Illuminate\Support\Facades\DB; // Added DB facade

class RequestController extends Controller
{
    /**
     * Display a listing of case note requests
     */
    public function index(HttpRequest $request): JsonResponse
    {
        $user = Auth::user();
        $query = \App\Models\Request::with(['patient', 'requestedBy', 'department', 'doctor', 'location', 'approvedBy', 'completedBy', 'rejectedBy', 'returnedBy']);

        // Role-based filtering
        if ($user->hasRole('CA', 'api')) {
            // Check if this is a request for "My Requests" page (all involvement)
            $includeAllInvolvement = $request->get('include_all_involvement', false);

            if ($includeAllInvolvement) {
                // For "My Case Notes" page: show all case notes where user is involved
                // This includes case notes they created, currently own, or have pending handover requests for
                // EXCLUDE case notes that have been handed over to other CAs (where ownership has transferred)
                $query->where(function($q) use ($user) {
                    $q->where('current_pic_user_id', $user->id)
                      ->orWhere(function($subQ) use ($user) {
                          // Show case notes they originally requested but only if not handed over
                          $subQ->where('requested_by_user_id', $user->id)
                               ->where('current_pic_user_id', $user->id); // Must still own it
                      })
                      ->orWhere(function($subQ) use ($user) {
                          // Show completed case notes that were originally requested by this user
                          // This ensures completed case notes appear in history regardless of current ownership
                          $subQ->where('requested_by_user_id', $user->id)
                               ->where('status', 'completed');
                      })
                      ->orWhereHas('handoverRequests', function($handoverQuery) use ($user) {
                          $handoverQuery->where('requested_by_user_id', $user->id)
                                       ->where('status', 'pending');
                      });
                })
                ->whereIn('status', ['approved', 'completed', 'in_progress', 'rejected', 'pending_return_verification']); // Include more statuses for comprehensive view including rejected and pending return verification

                Log::info('CA user requesting all involved case notes data (My Case Notes page):', [
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                    'query_conditions' => [
                        'current_pic_user_id' => $user->id,
                        'requested_by_user_id_and_still_owns' => $user->id,
                        'completed_case_notes_by_requester' => true,
                        'has_pending_handover_requests' => true,
                        'status_in' => ['approved', 'completed', 'in_progress', 'rejected', 'pending_return_verification'],
                    ]
                ]);
            } else {
                // For other pages: ONLY show case notes where they are the current owner (current_pic_user_id)
                // This ensures strict ownership - CAs can only see case notes they currently own
                // Ownership transfers through approved handovers by updating current_pic_user_id
                $query->where('current_pic_user_id', $user->id)
                      ->whereIn('status', ['approved', 'completed']) // Show both approved and completed status
                      ->where('is_received', 1); // Must be received/verified

                Log::info('CA user requesting owned case notes data (strict ownership):', [
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                    'query_conditions' => [
                        'current_pic_user_id' => $user->id,
                        'status_in' => ['approved', 'completed'],
                        'is_received' => 1,
                    ]
                ]);
            }
        } elseif ($user->hasRole('MR_STAFF', 'api')) {
            // MR Staff can see all requests
            // No additional filtering needed
        } elseif ($user->hasRole('ADMIN', 'api')) {
            // Admin can see all requests
            // No additional filtering needed
        }

        // Apply filters
        if ($request->filled('status')) {
            // Special handling for CA users with include_all_involvement to preserve our status logic
            if ($user->hasRole('CA', 'api') && $request->get('include_all_involvement', false)) {
                // Don't apply status filter for CA users on "My Case Notes" page
                // We already filtered for approved/completed in the main query
                Log::info('Skipping status filter for CA user with include_all_involvement', [
                    'user_id' => $user->id,
                    'requested_status' => $request->status
                ]);
            } else {
                $query->byStatus($request->status);
            }
        }

        if ($request->filled('priority')) {
            $query->byPriority($request->priority);
        }

        if ($request->filled('department_id')) {
            $query->byDepartment($request->department_id);
        }

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function($q) use ($searchTerm) {
                $q->where('request_number', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('purpose', 'LIKE', "%{$searchTerm}%")
                  ->orWhereHas('patient', function($subQ) use ($searchTerm) {
                      $subQ->where('name', 'LIKE', "%{$searchTerm}%")
                           ->orWhere('mrn', 'LIKE', "%{$searchTerm}%");
                  });
            });
        }

        if ($request->filled('overdue') && $request->boolean('overdue')) {
            $query->overdue();
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Debug query for CA users (BEFORE pagination to avoid issues)
        $debugResults = null;
        if ($user->hasRole('CA', 'api')) {
            try {
                $debugQuery = clone $query;
                $debugResults = $debugQuery->get(['id', 'status', 'is_received', 'current_pic_user_id', 'requested_by_user_id']);
            } catch (\Exception $e) {
                Log::error('Debug query failed for CA user:', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                $debugResults = collect(); // Empty collection as fallback
            }
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $requests = $query->paginate($perPage);

        // For CA users with include_all_involvement, add "Waiting for Approval" status for pending handover requests
        if ($user->hasRole('CA', 'api') && $includeAllInvolvement) {
            $requests->getCollection()->transform(function ($request) use ($user) {
                // Check if this case note has a pending handover request by the current user
                $hasPendingHandover = $request->handoverRequests()
                    ->where('requested_by_user_id', $user->id)
                    ->where('status', 'pending')
                    ->exists();

                if ($hasPendingHandover) {
                    // Add a custom status field to indicate waiting for approval
                    $request->setAttribute('display_status', 'Waiting for Approval');
                    $request->setAttribute('is_waiting_for_approval', true);
                } else {
                    $request->setAttribute('display_status', $request->status_label);
                    $request->setAttribute('is_waiting_for_approval', false);
                }

                return $request;
            });
        }

        // Log the results for CA users
        if ($user->hasRole('CA', 'api') && $debugResults !== null) {

            // Also check what case notes exist for this user without any filters
            $allUserCaseNotes = \App\Models\Request::where(function($q) use ($user) {
                $q->where('current_pic_user_id', $user->id)
                  ->orWhere('requested_by_user_id', $user->id);
            })->get(['id', 'status', 'is_received', 'current_pic_user_id', 'requested_by_user_id']);

            Log::info('CA user requests query debug details:', [
                'user_id' => $user->id,
                'include_all_involvement' => $includeAllInvolvement ?? false,
                'total_count' => $requests->total(),
                'current_page' => $requests->currentPage(),
                'per_page' => $requests->perPage(),
                'debug_query_results_count' => $debugResults->count(),
                'debug_query_results' => $debugResults->toArray(),
                'all_user_case_notes_count' => $allUserCaseNotes->count(),
                'all_user_case_notes' => $allUserCaseNotes->toArray(),
                'first_result' => $requests->first() ? [
                    'id' => $requests->first()->id,
                    'status' => $requests->first()->status,
                    'is_received' => $requests->first()->is_received,
                    'current_pic_user_id' => $requests->first()->current_pic_user_id,
                    'requested_by_user_id' => $requests->first()->requested_by_user_id,
                ] : null
            ]);
        }

        return response()->json([
            'success' => true,
            'requests' => $requests,
        ]);
    }

    /**
     * Store a newly created case note request
     */
    public function store(HttpRequest $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|exists:patients,id',
            'department_id' => 'required|exists:departments,id',
            'doctor_id' => 'nullable|exists:doctors,id',
            'location_id' => 'nullable|exists:locations,id',
            'purpose' => 'nullable|string|max:1000',
            'needed_date' => 'required|date|after_or_equal:today',
            'remarks' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = Auth::user();

        // Try to refresh the user and reload permissions
        $user->load('roles.permissions');
        $user->refresh();

        // Debug user permissions in detail
        Log::info('User attempting to create request:', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'user_roles' => $user->getRoleNames(),
            'user_permissions' => $user->getAllPermissions()->pluck('name'),
            'can_create_requests' => $user->can('create_requests'),
            'has_role_ca' => $user->hasRole('CA'),
            'has_role_mr_staff' => $user->hasRole('MR_STAFF'),
            'has_role_admin' => $user->hasRole('ADMIN'),
            // Additional debugging
            'user_loaded_relationships' => $user->getRelations(),
            'user_attributes' => $user->getAttributes(),
            'permission_check_methods' => [
                'can_create_requests' => $user->can('create_requests'),
                'hasPermissionTo_create_requests' => $user->hasPermissionTo('create_requests'),
                'hasDirectPermission_create_requests' => $user->hasDirectPermission('create_requests'),
                'getAllPermissions_count' => $user->getAllPermissions()->count(),
                'getPermissionsViaRoles_count' => $user->getPermissionsViaRoles()->count(),
                'getDirectPermissions_count' => $user->getDirectPermissions()->count(),
            ]
        ]);

        // Check if user has permission to create requests
        $canCreateRequests = $user->hasPermissionTo('create_requests', 'api') ||
                           $user->hasRole('CA', 'api');

        if (!$canCreateRequests) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to create requests',
                'debug' => [
                    'user_roles' => $user->getRoleNames('api'),
                    'user_permissions' => $user->getAllPermissions('api')->pluck('name'),
                    'permission_check_results' => [
                        'hasPermissionTo_create_requests' => $user->hasPermissionTo('create_requests', 'api'),
                        'has_role_ca' => $user->hasRole('CA', 'api'),
                    ]
                ]
            ], 403);
        }

        // Prevent creating a new request for a patient that already has an active/locking case note
        // "Locking" states include:
        //  - pending, approved, in progress, pending return verification
        //  - OR any case note that has been returned and not yet rejected (is_returned = true, is_rejected_return = false)
        $hasBlockingCase = \App\Models\Request::where('patient_id', $request->patient_id)
            ->whereNull('deleted_at')
            ->where(function ($query) {
                $query->whereIn('status', [
                        \App\Models\Request::STATUS_PENDING,
                        \App\Models\Request::STATUS_APPROVED,
                        \App\Models\Request::STATUS_IN_PROGRESS,
                        \App\Models\Request::STATUS_PENDING_RETURN_VERIFICATION,
                    ])
                    ->orWhere(function ($q) {
                        $q->where('is_returned', true)
                          ->where('is_rejected_return', false);
                    });
            })
            ->exists();

        if ($hasBlockingCase) {
            return response()->json([
                'success' => false,
                'message' => 'This patient already has an active or returned case note that is pending MR staff action. Please verify or complete the existing case note before creating a new request.',
            ], 409);
        }

        $caseRequest = \App\Models\Request::create([
            'request_number' => \App\Models\Request::generateRequestNumber(),
            'patient_id' => $request->patient_id,
            'requested_by_user_id' => $user->id,
            'department_id' => $request->department_id,
            'doctor_id' => $request->doctor_id,
            'location_id' => $request->location_id,
            'priority' => 'normal', // Set default priority
            'status' => \App\Models\Request::STATUS_PENDING,
            'purpose' => $request->purpose,
            'needed_date' => $request->needed_date,
            'remarks' => $request->remarks,
            'current_pic_user_id' => $user->id, // Set creator as initial PIC
            'handover_status' => 'none', // Initial handover status
        ]);

        // Create initial event with comprehensive metadata
        $caseRequest->events()->create([
            'type' => RequestEvent::TYPE_CREATED,
            'actor_user_id' => $user->id,
            'reason' => 'Request created',
            'occurred_at' => now(),
            'metadata' => [
                'doctor_name' => $caseRequest->doctor?->name,
                'department_name' => $caseRequest->department?->name,
                'location_name' => $caseRequest->location?->name,
                'purpose' => $caseRequest->purpose,
                'requested_by_name' => $user->name,
            ]
        ]);

        // Load relationships for response
        $caseRequest->load(['patient', 'requestedBy', 'department', 'doctor', 'location']);

        return response()->json([
            'success' => true,
            'message' => 'Case note request created successfully',
            'request' => $caseRequest,
        ], 201);
    }

    /**
     * Display the specified case note request
     */
    public function show(HttpRequest $httpRequest, $id): JsonResponse
    {
        $user = Auth::user();

        // Manually find the request since route model binding is failing
        $caseRequest = \App\Models\Request::find($id);

        if (!$caseRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Request not found'
            ], 404);
        }

        // Debug user and request information
        Log::info('Request show method called:', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'user_roles' => $user->getRoleNames(),
            'user_api_roles' => $user->getRoleNames('api'),
            'user_web_roles' => $user->getRoleNames('web'),
            'request_id' => $caseRequest->id,
            'request_owner_id' => $caseRequest->requested_by_user_id,
            'is_ca_user' => $user->hasRole('CA'),
            'is_ca_user_api' => $user->hasRole('CA', 'api'),
            'is_ca_user_web' => $user->hasRole('CA', 'web'),
            'is_owner' => $user->id == $caseRequest->requested_by_user_id,
            'comparison_result' => [
                'user_id_type' => gettype($user->id),
                'request_owner_id_type' => gettype($caseRequest->requested_by_user_id),
                'strict_equality' => $user->id === $caseRequest->requested_by_user_id,
                'loose_equality' => $user->id == $caseRequest->requested_by_user_id
            ]
        ]);

        // Check if user can view this request
        // CA users can view their own requests, MR_STAFF and ADMIN can view all
        $canView = false;

        if ($user->hasRole('CA', 'api')) {
            // CA users can view their own requests OR requests assigned to them
            $canView = ($user->id == $caseRequest->requested_by_user_id) || ($user->id == $caseRequest->current_pic_user_id);
            Log::info('CA user permission check:', [
                'user_id' => $user->id,
                'request_owner_id' => $caseRequest->requested_by_user_id,
                'current_pic_user_id' => $caseRequest->current_pic_user_id,
                'can_view' => $canView,
                'is_owner' => ($user->id == $caseRequest->requested_by_user_id),
                'is_current_pic' => ($user->id == $caseRequest->current_pic_user_id),
                'has_view_permission' => $user->hasPermissionTo('view_requests', 'api')
            ]);
        } elseif ($user->hasRole(['MR_STAFF', 'ADMIN'], 'api')) {
            // MR_STAFF and ADMIN can view all requests based on their role
            $canView = true;
            Log::info('Staff/Admin user - can view all requests based on role');
        } else {
            Log::warning('User has no recognized role for API access');
            $canView = false;
        }

        // For CA users, we still check view_requests permission
        // For MR_STAFF and ADMIN, role-based access is sufficient
        if ($user->hasRole('CA', 'api') && $canView && !$user->hasPermissionTo('view_requests', 'api')) {
            Log::warning('CA user lacks view_requests permission:', [
                'user_id' => $user->id,
                'user_roles' => $user->getRoleNames('api'),
                'has_view_permission' => $user->hasPermissionTo('view_requests', 'api')
            ]);
            $canView = false;
        }

        if (!$canView) {
            Log::warning('User denied access to request:', [
                'user_id' => $user->id,
                'user_roles' => $user->getRoleNames('api'),
                'request_owner_id' => $caseRequest->requested_by_user_id,
                'current_pic_user_id' => $caseRequest->current_pic_user_id,
                'request_id' => $caseRequest->id,
                'reason' => 'User is neither owner nor current PIC'
            ]);

            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to view this request. Only the request owner or current Person in Charge can view this case note.',
                'debug' => [
                    'user_id' => $user->id,
                    'user_roles' => $user->getRoleNames('api'),
                    'request_owner_id' => $caseRequest->requested_by_user_id,
                    'current_pic_user_id' => $caseRequest->current_pic_user_id
                ]
            ], 403);
        }

        $caseRequest->load([
            'patient',
            'requestedBy',
            'department',
            'doctor',
            'location',
            'approvedBy',
            'completedBy',
            'events.actor',
            'events.toLocation'
        ]);

        // Debug timeline data
        $events = $caseRequest->events;

        // Use enhanced timeline formatting similar to CaseNoteTimelineController
        $timeline = $events->map(function ($event) {
            return [
                'id' => $event->id,
                'type' => $event->type,
                'type_label' => $event->type_label,
                'description' => $this->formatEventDescription($event),
                'actor' => $event->actor?->name,
                'location' => $event->toLocation?->full_name,
                'person' => $event->to_person,
                'reason' => $event->reason,
                'occurred_at' => $event->occurred_at,
                'occurred_at_human' => $event->time_ago,
                'metadata' => $this->cleanMetadata($event->metadata ?? [], $event->type),
            ];
        });

        Log::info('Timeline data being returned:', [
            'request_id' => $caseRequest->id,
            'total_events' => $events->count(),
            'event_types' => $events->pluck('type')->toArray(),
            'handover_events' => $events->where('type', 'handed_over')->count(),
            'timeline_count' => $timeline->count(),
            'events_with_metadata' => $events->whereNotNull('metadata')->count(),
        ]);

        // Transform the request data to include properly formatted patient data
        $requestData = $caseRequest->toArray();
        $requestData['patient'] = $caseRequest->patient->toSearchResult();

        return response()->json([
            'success' => true,
            'request' => $requestData,
            'timeline' => $timeline,
        ]);
    }

    /**
     * Update the specified case note request
     */
    public function update(HttpRequest $httpRequest, $id): JsonResponse
    {
        $user = Auth::user();

        // Manually find the request
        $caseRequest = \App\Models\Request::find($id);

        if (!$caseRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Request not found'
            ], 404);
        }

        // Check if user can update this request
        if ($user->hasRole('CA') && $caseRequest->requested_by_user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You can only update your own requests'
            ], 403);
        }

        // Only pending requests can be updated by CA
        if ($user->hasRole('CA') && $caseRequest->status !== \App\Models\Request::STATUS_PENDING) {
            return response()->json([
                'success' => false,
                'message' => 'You can only update pending requests'
            ], 400);
        }

        $validator = Validator::make($httpRequest->all(), [
            'patient_id' => 'required|exists:patients,id',
            'department_id' => 'required|exists:departments,id',
            'doctor_id' => 'nullable|exists:doctors,id',
            'location_id' => 'nullable|exists:locations,id',
            'priority' => 'required|in:' . implode(',', array_keys(\App\Models\Request::getPriorityOptions())),
            'purpose' => 'required|string|max:1000',
            'needed_date' => 'required|date|after_or_equal:today',
            'remarks' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $caseRequest->update($httpRequest->only([
            'patient_id', 'department_id', 'doctor_id', 'location_id',
            'priority', 'purpose', 'needed_date', 'remarks'
        ]));

        $caseRequest->load(['patient', 'requestedBy', 'department', 'doctor', 'location']);

        return response()->json([
            'success' => true,
            'message' => 'Request updated successfully',
            'request' => $caseRequest,
        ]);
    }

    /**
     * Approve a case note request (MR Staff only)
     */
    public function approve(HttpRequest $httpRequest, $id): JsonResponse
    {
        $user = Auth::user();

        // Manually find the request
        $caseRequest = \App\Models\Request::find($id);

        if (!$caseRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Request not found'
            ], 404);
        }

        if (!$user->hasRole(['MR_STAFF', 'ADMIN'], 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to approve requests'
            ], 403);
        }

        // Prevent approving this request if another request for the same patient
        // is currently in a locking state (especially a returned case pending MR verification).
        $hasPendingReturnForPatient = \App\Models\Request::where('patient_id', $caseRequest->patient_id)
            ->where('id', '!=', $caseRequest->id)
            ->whereNull('deleted_at')
            ->where(function ($query) {
                $query->where('status', \App\Models\Request::STATUS_PENDING_RETURN_VERIFICATION)
                      ->orWhere(function ($q) {
                          $q->where('is_returned', true)
                            ->where('is_rejected_return', false);
                      });
            })
            ->exists();

        if ($hasPendingReturnForPatient) {
            return response()->json([
                'success' => false,
                'message' => 'This patient has a returned case note that is still pending MR staff verification. Please verify or reject the existing return before approving a new request.',
            ], 409);
        }

        $validator = Validator::make($httpRequest->all(), [
            'remarks' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        if (!$caseRequest->approve($user, $httpRequest->remarks)) {
            return response()->json([
                'success' => false,
                'message' => 'Request cannot be approved in its current state'
            ], 400);
        }

        $caseRequest->load(['patient', 'requestedBy', 'department', 'doctor', 'location', 'approvedBy']);

        return response()->json([
            'success' => true,
            'message' => 'Request approved successfully',
            'request' => $caseRequest,
        ]);
    }

    /**
     * Approve a case note request on behalf of another user (MR Staff only)
     */
    public function approveOnBehalf(HttpRequest $httpRequest, $id): JsonResponse
    {
        $user = Auth::user();

        // Manually find the request
        $caseRequest = \App\Models\Request::find($id);

        if (!$caseRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Request not found'
            ], 404);
        }

        if (!$user->hasRole(['MR_STAFF', 'ADMIN'], 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to approve requests'
            ], 403);
        }

        // Prevent approving this request on behalf of another user if there is already
        // a returned case note for the same patient pending MR staff verification.
        $hasPendingReturnForPatient = \App\Models\Request::where('patient_id', $caseRequest->patient_id)
            ->where('id', '!=', $caseRequest->id)
            ->whereNull('deleted_at')
            ->where(function ($query) {
                $query->where('status', \App\Models\Request::STATUS_PENDING_RETURN_VERIFICATION)
                      ->orWhere(function ($q) {
                          $q->where('is_returned', true)
                            ->where('is_rejected_return', false);
                      });
            })
            ->exists();

        if ($hasPendingReturnForPatient) {
            return response()->json([
                'success' => false,
                'message' => 'This patient has a returned case note that is still pending MR staff verification. Please verify or reject the existing return before approving a new request.',
            ], 409);
        }

        $validator = Validator::make($httpRequest->all(), [
            'remarks' => 'nullable|string|max:1000',
            'on_behalf_of_user_id' => 'required|integer|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $onBehalfOfUserId = $httpRequest->on_behalf_of_user_id;

        // Verify that the target user is a CA
        $targetUser = \App\Models\User::find($onBehalfOfUserId);
        if (!$targetUser || !$targetUser->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Target user must be a valid Clinic Assistant'
            ], 400);
        }

        if (!$caseRequest->approveOnBehalf($user, $onBehalfOfUserId, $httpRequest->remarks)) {
            return response()->json([
                'success' => false,
                'message' => 'Request cannot be approved in its current state'
            ], 400);
        }

        $caseRequest->load(['patient', 'requestedBy', 'department', 'doctor', 'location', 'approvedBy', 'approvedOnBehalfBy', 'approvedOnBehalfOf']);

        return response()->json([
            'success' => true,
            'message' => "Request approved successfully on behalf of {$targetUser->name}",
            'request' => $caseRequest,
        ]);
    }

    /**
     * Reject a case note request (MR Staff only)
     */
    public function reject(HttpRequest $httpRequest, $id): JsonResponse
    {
        $user = Auth::user();

        // Manually find the request
        $caseRequest = \App\Models\Request::find($id);

        if (!$caseRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Request not found'
            ], 404);
        }

        if (!$user->hasRole(['MR_STAFF', 'ADMIN'], 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to reject requests'
            ], 403);
        }

        Log::info('MR Staff reject request debug:', [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'request_id' => $id,
            'request_data' => $httpRequest->all(),
            'has_reason' => $httpRequest->has('reason'),
            'reason_value' => $httpRequest->get('reason')
        ]);

        $validator = Validator::make($httpRequest->all(), [
            'reason' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            Log::error('MR Staff reject validation failed:', [
                'user_id' => $user->id,
                'request_id' => $id,
                'validation_errors' => $validator->errors()->toArray(),
                'request_data' => $httpRequest->all()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        if (!$caseRequest->reject($user, $httpRequest->reason)) {
            return response()->json([
                'success' => false,
                'message' => 'Request cannot be rejected in its current state'
            ], 400);
        }

        $caseRequest->load(['patient', 'requestedBy', 'department', 'doctor', 'location', 'approvedBy']);

        return response()->json([
            'success' => true,
            'message' => 'Request rejected successfully',
            'request' => $caseRequest,
        ]);
    }

    /**
     * Complete a case note request (MR Staff only)
     */
    public function complete(HttpRequest $httpRequest, $id): JsonResponse
    {
        $user = Auth::user();

        // Manually find the request
        $caseRequest = \App\Models\Request::find($id);

        if (!$caseRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Request not found'
            ], 404);
        }

        if (!$user->hasRole(['MR_STAFF', 'ADMIN'], 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to complete requests'
            ], 403);
        }

        if (!$caseRequest->complete($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Request cannot be completed in its current state'
            ], 400);
        }

        $caseRequest->load(['patient', 'requestedBy', 'department', 'doctor', 'location', 'completedBy']);

        return response()->json([
            'success' => true,
            'message' => 'Request completed successfully',
            'request' => $caseRequest,
        ]);
    }

    /**
     * Remove the specified case note request from storage
     */
    public function destroy($id): JsonResponse
    {
        $user = Auth::user();

        // Manually find the request
        $caseRequest = \App\Models\Request::find($id);

        if (!$caseRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Request not found'
            ], 404);
        }

        // Check if user can delete this request
        if (!$user->hasPermissionTo('delete_requests', 'api') &&
            !($user->hasRole('CA', 'api') && $caseRequest->requested_by_user_id === $user->id)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to delete this request'
            ], 403);
        }

        // Only pending requests can be deleted
        if ($caseRequest->status !== \App\Models\Request::STATUS_PENDING) {
            return response()->json([
                'success' => false,
                'message' => 'Only pending requests can be deleted'
            ], 400);
        }

        try {
            $caseRequest->delete();

            return response()->json([
                'success' => true,
                'message' => 'Request deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting request:', [
                'request_id' => $id,
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error deleting request'
            ], 500);
        }
    }

    /**
     * Get dashboard statistics
     */
    public function getStats(): JsonResponse
    {
        $user = Auth::user();

        // Generate cache key based on user role and ID
        $cacheKey = "dashboard_stats_{$user->id}_{$user->getRoleNames('api')->first()}";

        // Try to get cached stats first (cache for 30 seconds for real-time feel)
        $stats = Cache::remember($cacheKey, 30, function () use ($user) {
            // Role-based filtering
            if ($user->hasRole('CA', 'api')) {
                // CA users only see their own requests - use single optimized query
                return $this->getCAStats($user->id);
            } elseif ($user->hasRole('MR_STAFF', 'api')) {
                // MR Staff see all requests for review/approval
                return $this->getMRStaffStats();
            } elseif ($user->hasRole('ADMIN', 'api')) {
                // Admin see all requests and system stats
                return $this->getAdminStats();
            } else {
                // Fallback for users without recognized roles
                return [
                    'total' => 0,
                    'pending' => 0,
                    'approved' => 0,
                    'in_progress' => 0,
                    'completed' => 0,
                    'overdue' => 0,
                ];
            }
        });

        return response()->json([
            'success' => true,
            'stats' => $stats,
        ]);
    }

    /**
     * Get optimized CA statistics using single query
     */
    private function getCAStats(int $userId): array
    {
        // Single query with conditional counting - much faster than multiple queries
        $results = \App\Models\Request::where('requested_by_user_id', $userId)
            ->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN needed_date < CURDATE() THEN 1 ELSE 0 END) as overdue
            ', [
                \App\Models\Request::STATUS_PENDING,
                \App\Models\Request::STATUS_APPROVED,
                \App\Models\Request::STATUS_IN_PROGRESS,
                \App\Models\Request::STATUS_COMPLETED,
                \App\Models\Request::STATUS_REJECTED
            ])
            ->first();

        return [
            'total' => (int) ($results->total ?? 0),
            'pending' => (int) ($results->pending ?? 0),
            'approved' => (int) ($results->approved ?? 0),
            'in_progress' => (int) ($results->in_progress ?? 0),
            'completed' => (int) ($results->completed ?? 0),
            'overdue' => (int) ($results->overdue ?? 0),
            // CA-specific stats
            'my_requests' => (int) ($results->total ?? 0),
            'my_pending' => (int) ($results->pending ?? 0),
            'my_completed' => (int) ($results->completed ?? 0),
            'my_rejected' => (int) ($results->rejected ?? 0),
        ];
    }

    /**
     * Get MR Staff statistics
     */
    private function getMRStaffStats(): array
    {
        $results = \App\Models\Request::selectRaw('
            COUNT(*) as total,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN needed_date < CURDATE() THEN 1 ELSE 0 END) as overdue
        ', [
            \App\Models\Request::STATUS_PENDING,
            \App\Models\Request::STATUS_APPROVED,
            \App\Models\Request::STATUS_IN_PROGRESS,
            \App\Models\Request::STATUS_COMPLETED
        ])->first();

        return [
            'total' => (int) ($results->total ?? 0),
            'pending' => (int) ($results->pending ?? 0),
            'approved' => (int) ($results->approved ?? 0),
            'in_progress' => (int) ($results->in_progress ?? 0),
            'completed' => (int) ($results->completed ?? 0),
            'overdue' => (int) ($results->overdue ?? 0),
            // MR Staff-specific stats
            'total_requests' => (int) ($results->total ?? 0),
            'pending_review' => (int) ($results->pending ?? 0),
            'in_progress_count' => (int) ($results->in_progress ?? 0),
            'completed_count' => (int) ($results->completed ?? 0),
        ];
    }

    /**
     * Get Admin statistics
     */
    private function getAdminStats(): array
    {
        $results = \App\Models\Request::selectRaw('
            COUNT(*) as total,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN needed_date < CURDATE() THEN 1 ELSE 0 END) as overdue
        ', [
            \App\Models\Request::STATUS_PENDING,
            \App\Models\Request::STATUS_APPROVED,
            \App\Models\Request::STATUS_IN_PROGRESS,
            \App\Models\Request::STATUS_COMPLETED
        ])->first();

        return [
            'total' => (int) ($results->total ?? 0),
            'pending' => (int) ($results->pending ?? 0),
            'approved' => (int) ($results->approved ?? 0),
            'in_progress' => (int) ($results->in_progress ?? 0),
            'completed' => (int) ($results->completed ?? 0),
            'overdue' => (int) ($results->overdue ?? 0),
            // Admin-specific stats
            'total_users' => \App\Models\User::count(),
            'total_requests' => (int) ($results->total ?? 0),
            'system_health' => 'Good',
            'active_sessions' => rand(5, 15), // Placeholder for now
        ];
    }

    /**
     * Verify case notes as received
     */
    public function verifyCaseNotesReceived(HttpRequest $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'case_note_ids' => 'required|array|min:1',
            'case_note_ids.*' => 'required|integer|exists:requests,id',
            'verification_notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = Auth::user();
        $caseNoteIds = $request->case_note_ids;
        $verificationNotes = $request->verification_notes;

        try {
            DB::beginTransaction();

            $caseNotes = Request::whereIn('id', $caseNoteIds)
                ->where('status', Request::STATUS_APPROVED)
                ->where('is_received', false)
                ->where('requested_by_user_id', $user->id) // Security: only allow verification of case notes originally requested by current CA
                ->get();

            if ($caseNotes->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No valid case notes found for verification'
                ], 400);
            }

            $verifiedCount = 0;
            foreach ($caseNotes as $caseNote) {
                $caseNote->update([
                    'is_received' => true,
                    'received_at' => now(),
                    'received_by_user_id' => $user->id,
                ]);

                // Create timeline event for verification
                $caseNote->events()->create([
                    'type' => RequestEvent::TYPE_RECEIVED, // Changed from 'received' to RequestEvent::TYPE_RECEIVED
                    'actor_user_id' => $user->id,
                    'occurred_at' => now(),
                    'reason' => 'Case note verified as received',
                    'metadata' => [
                        'received_by_user_id' => $user->id,
                        'received_by_user_name' => $user->name,
                        'verification_notes' => $verificationNotes,
                        'received_at' => now()->toDateTimeString(),
                    ]
                ]);

                $verifiedCount++;
            }

            DB::commit();

            Log::info('Case notes verified as received', [
                'user_id' => $user->id,
                'verified_count' => $verifiedCount,
                'case_note_ids' => $caseNoteIds,
            ]);

            return response()->json([
                'success' => true,
                'message' => "Successfully verified {$verifiedCount} case note(s) as received",
                'verified_count' => $verifiedCount,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error verifying case notes as received:', [
                'user_id' => $user->id,
                'case_note_ids' => $caseNoteIds,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to verify case notes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject case notes as not received (Not Verify)
     */
    public function rejectCaseNotesNotReceived(HttpRequest $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'case_note_ids' => 'required|array|min:1',
            'case_note_ids.*' => 'required|integer|exists:requests,id',
            'rejection_reason' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = Auth::user();
        $caseNoteIds = $request->case_note_ids;
        $rejectionReason = $request->rejection_reason;

        try {
            DB::beginTransaction();

            $caseNotes = Request::whereIn('id', $caseNoteIds)
                ->where('status', Request::STATUS_APPROVED)
                ->where('is_received', false)
                ->where('requested_by_user_id', $user->id) // Security: only allow rejection of case notes originally requested by current CA
                ->get();

            if ($caseNotes->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No valid case notes found for rejection'
                ], 400);
            }

            $rejectedCount = 0;
            foreach ($caseNotes as $caseNote) {
                // Reset the case note to pending status for re-request
                $caseNote->update([
                    'status' => Request::STATUS_PENDING,
                    'is_received' => false,
                    'received_at' => null,
                    'received_by_user_id' => null,
                    'approved_at' => null,
                    'approved_by_user_id' => null,
                    'approval_remarks' => null,
                    // Store rejection information
                    'rejection_reason' => $rejectionReason,
                    'rejected_at' => now(),
                    'rejected_by_user_id' => $user->id,
                ]);

                // Debug: Log what was actually saved
                $caseNote->refresh(); // Reload from database
                Log::info('Case note rejection data saved:', [
                    'case_note_id' => $caseNote->id,
                    'status' => $caseNote->status,
                    'rejection_reason' => $caseNote->rejection_reason,
                    'rejected_at' => $caseNote->rejected_at,
                    'rejected_by_user_id' => $caseNote->rejected_by_user_id,
                    'raw_data' => $caseNote->toArray()
                ]);

                // Create timeline event for rejection
                $caseNote->events()->create([
                    'type' => RequestEvent::TYPE_REJECTED_NOT_RECEIVED, // Changed from 'rejected_not_received' to RequestEvent::TYPE_REJECTED_NOT_RECEIVED
                    'actor_user_id' => $user->id,
                    'occurred_at' => now(),
                    'reason' => 'Case note rejected - not received correctly',
                    'metadata' => [
                        'rejected_by_user_id' => $user->id,
                        'rejected_by_user_name' => $user->name,
                        'rejection_reason' => $rejectionReason,
                        'rejected_at' => now()->toDateTimeString(),
                        'previous_status' => Request::STATUS_APPROVED,
                        'new_status' => Request::STATUS_PENDING,
                    ]
                ]);

                $rejectedCount++;
            }

            DB::commit();

            Log::info('Case notes rejected as not received', [
                'user_id' => $user->id,
                'rejected_count' => $rejectedCount,
                'case_note_ids' => $caseNoteIds,
                'rejection_reason' => $rejectionReason,
            ]);

            return response()->json([
                'success' => true,
                'message' => "Successfully rejected {$rejectedCount} case note(s) - returned to MR staff for re-request",
                'rejected_count' => $rejectedCount,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error rejecting case notes as not received:', [
                'user_id' => $user->id,
                'case_note_ids' => $caseNoteIds,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to reject case notes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get returnable case notes (received but not yet returned) for CA users
     */
    public function getReturnableCaseNotes(): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access this endpoint'
            ], 403);
        }

        try {
            // Get case notes that are returnable - including rejected returns that need to be re-returned
            // This should include:
            // 1. Case notes currently assigned to me that are approved/completed and received
            // 2. Case notes that were returned by me but rejected by MR staff (is_rejected_return = true)
            $caseNotes = \App\Models\Request::with([
                'patient',
                'requestedBy',
                'department',
                'doctor',
                'approvedBy',
                'receivedBy',
                'returnedBy',
                'rejectedBy'
            ])
            ->where(function($query) use ($user) {
                $query->where(function($q) use ($user) {
                    // Case notes currently assigned to me that are approved/completed and received
                    // Exclude case notes that have been handed over to other CAs
                    $q->where('current_pic_user_id', $user->id)
                      ->whereIn('status', ['approved', 'completed'])
                      ->where('is_received', 1)
                      ->where(function($subQ) {
                          $subQ->where('is_returned', false) // Not yet returned
                               ->orWhere('is_rejected_return', true); // OR it was rejected and can be re-returned
                      })
                      // Exclude case notes that have been completed (fully processed)
                      ->where(function($subQ) {
                          $subQ->whereNull('handover_status')
                               ->orWhere('handover_status', '!=', 'completed');
                      });
                })->orWhere(function($q) use ($user) {
                    // Case notes that were returned by me but rejected by MR staff (need to be re-returned)
                    // These have is_rejected_return = true and should be visible to the CA who returned them
                    $q->where('returned_by_user_id', $user->id)
                      ->where('is_rejected_return', true)
                      ->where('status', 'approved') // Status goes back to approved when MR staff rejects
                      ->where('is_received', true) // Should still be received
                      // Exclude case notes that have been completed (fully processed)
                      ->where(function($subQ) {
                          $subQ->whereNull('handover_status')
                               ->orWhere('handover_status', '!=', 'completed');
                      });
                });
            })
            ->orderBy('created_at', 'desc')
            ->get();

            // Filter out case notes that are currently sent out and not yet Acknowledge
            $caseNotes = $caseNotes->filter(function($caseNote) {
                return $caseNote->canBeReturned();
            });

            // Debug: Log what we found with user names for easier debugging
            $caseNotesSummary = $caseNotes->map(function($cn) use ($user) {
                $requestedByUser = \App\Models\User::find($cn->requested_by_user_id);
                $currentPicUser = \App\Models\User::find($cn->current_pic_user_id);
                $returnedByUser = $cn->returned_by_user_id ? \App\Models\User::find($cn->returned_by_user_id) : null;

                // Get handover info if applicable
                $handoverInfo = [];
                if ($cn->handover_status) {
                    $handoverRequest = \App\Models\HandoverRequest::where('case_note_id', $cn->id)
                        ->orderBy('created_at', 'desc')
                        ->first();

                    if ($handoverRequest) {
                        $handoverInfo = [
                            'handover_request_id' => $handoverRequest->id,
                            'status' => $handoverRequest->status,
                            'requested_by' => $handoverRequest->requester ? $handoverRequest->requester->name : 'Unknown',
                            'current_holder' => $handoverRequest->currentHolder ? $handoverRequest->currentHolder->name : 'Unknown',
                            'requested_at' => $handoverRequest->requested_at,
                            'verified_at' => $handoverRequest->verified_at,
                            'verification_notes' => $handoverRequest->verification_notes
                        ];
                    }
                }

                return [
                    'id' => $cn->id,
                    'patient_id' => $cn->patient_id,
                    'status' => $cn->status,
                    'is_received' => $cn->is_received,
                    'is_returned' => $cn->is_returned,
                    'is_rejected_return' => $cn->is_rejected_return,
                    'requested_by_user_id' => $cn->requested_by_user_id,
                    'requested_by_name' => $requestedByUser ? $requestedByUser->name : 'Unknown',
                    'current_pic_user_id' => $cn->current_pic_user_id,
                    'current_pic_name' => $currentPicUser ? $currentPicUser->name : 'Unknown',
                    'returned_by_user_id' => $cn->returned_by_user_id,
                    'returned_by_name' => $returnedByUser ? $returnedByUser->name : 'Unknown',
                    'patient_name' => $cn->patient ? $cn->patient->name : 'No patient',
                    'handover_status' => $cn->handover_status,
                    'handover_requests' => $handoverInfo,
                    'why_visible' => $cn->current_pic_user_id == $user->id ? 'current_pic_user_id matches' :
                                   ($cn->returned_by_user_id == $user->id && $cn->is_rejected_return ? 'returned_by_user_id matches (rejected return)' : 'unknown')
                ];
            })->toArray();

            Log::info('Returnable case notes query results:', [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'total_found' => $caseNotes->count(),
                'case_notes_summary' => $caseNotesSummary
            ]);

            return response()->json([
                'success' => true,
                'case_notes' => $caseNotes->values()->toArray()
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching returnable case notes:', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch returnable case notes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get returned case note submissions for MR Staff review
     */
    public function getReturnedSubmissions(): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check if user has permission to view returned submissions
            if (!$user->hasRole('MR_STAFF')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. Only MR Staff can view returned submissions.'
                ], 403);
            }

            // Get all case notes that have been returned (either is_returned = true OR have return event)
            $returnedCaseNotes = \App\Models\Request::with([
                'patient',
                'department',
                'doctor',
                'returnedBy'
            ])
            ->where(function($query) {
                $query->where('status', \App\Models\Request::STATUS_PENDING_RETURN_VERIFICATION)
                      ->orWhere('status', \App\Models\Request::STATUS_APPROVED)
                      ->orWhere('status', \App\Models\Request::STATUS_IN_PROGRESS);
            })
            ->where(function($query) {
                $query->where('is_returned', true)
                      ->orWhereHas('events', function($q) {
                          $q->where('type', 'returned');
                      });
            })
            ->where('status', '!=', \App\Models\Request::STATUS_COMPLETED) // Exclude already completed ones
            // Only include records that have a returning CA set to avoid null dereferences
            ->whereNotNull('returned_by_user_id')
            ->orderBy('returned_at', 'desc')
            ->get();

            // Group by CA user who returned the case notes
            $groupedSubmissions = $returnedCaseNotes->groupBy('returned_by_user_id')
                ->map(function ($caseNotes, $caUserId) {
                    $firstCaseNote = $caseNotes->first();
                    $caUser = $firstCaseNote->returnedBy;

                    return [
                        'ca_user_id' => $caUserId,
                        'ca_name' => $caUser?->name ?? 'Unknown',
                        'submission_date' => $caseNotes->max('returned_at'),
                        'case_notes' => $caseNotes->map(function ($cn) {
                            return [
                                'id' => $cn->id,
                                'patient' => [
                                    'id' => $cn->patient?->id,
                                    'name' => $cn->patient?->name,
                                    'mrn' => $cn->patient?->mrn,
                                ],
                                'department' => [
                                    'id' => $cn->department?->id,
                                    'name' => $cn->department?->name,
                                    'code' => $cn->department?->code,
                                ],
                                'doctor' => [
                                    'id' => $cn->doctor?->id,
                                    'name' => $cn->doctor?->name,
                                ],
                                'returned_at' => $cn->returned_at,
                                'returned_by_user' => [
                                    'id' => $cn->returnedBy?->id,
                                    'name' => $cn->returnedBy?->name,
                                ],
                                'return_notes' => $cn->return_notes,
                                'status' => $cn->status,
                            ];
                        })->toArray(),
                        'total_count' => $caseNotes->count(),
                    ];
                })
                ->values()
                ->toArray();

            return response()->json([
                'success' => true,
                'submissions' => $groupedSubmissions,
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching returned submissions:', [
                'user_id' => $user->id ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch returned submissions: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate PDF for returned case notes for a given CA (MR Staff)
     */
    public function generateReturnedCaseNotesPdf(\Illuminate\Http\Request $request, $caId)
    {
        $user = Auth::user();
        if (!$user->hasRole('MR_STAFF')) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Only MR Staff can generate PDFs.'
            ], 403);
        }

        try {
            $ids = $request->get('case_note_ids', []);
            if (is_string($ids)) {
                $ids = explode(',', $ids);
            }
            $ids = array_filter(array_map('intval', $ids));

            $service = new \App\Services\ReturnedCaseNotesPdfService();
            $pdf = $service->generateReturnedCaseNotesPdf((int)$caId, $ids);
            $ca = \App\Models\User::find($caId);
            $filename = $service->generateFilename($ca->name ?? 'Unknown');
            return $pdf->download($filename);
        } catch (\Exception $e) {
            Log::error('Error generating returned case notes PDF:', [
                'user_id' => $user->id ?? 'unknown',
                'ca_id' => $caId,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify or reject returned case notes by MR Staff
     */
    public function verifyReturnedCaseNotes(HttpRequest $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check if user has permission to verify returned case notes
            if (!$user->hasRole('MR_STAFF')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. Only MR Staff can verify returned case notes.'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'case_note_ids' => 'required|array|min:1',
                'case_note_ids.*' => 'required|integer|exists:requests,id',
                'action' => 'required|in:verify,reject',
                'verification_notes' => 'nullable|string|max:1000',
                'rejection_reason' => 'required_if:action,reject|string|max:1000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $caseNoteIds = $request->case_note_ids;
            $action = $request->action;
            $verificationNotes = $request->verification_notes;
            $rejectionReason = $request->rejection_reason;

            // Get the case notes to be processed
            // Include case notes that either have is_returned = true OR have a return event
            $caseNotes = \App\Models\Request::whereIn('id', $caseNoteIds)
                ->where(function($query) {
                    $query->where('status', \App\Models\Request::STATUS_PENDING_RETURN_VERIFICATION)
                          ->orWhere('status', \App\Models\Request::STATUS_APPROVED)
                          ->orWhere('status', \App\Models\Request::STATUS_IN_PROGRESS);
                })
                ->where(function($query) {
                    $query->where('is_returned', true)
                          ->orWhereHas('events', function($q) {
                              $q->where('type', 'returned');
                          });
                })
                ->get();

            if ($caseNotes->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No valid case notes found for processing'
                ], 400);
            }

            DB::beginTransaction();

            try {
                foreach ($caseNotes as $caseNote) {
                    if ($action === 'verify') {
                        // Mark case note as complete - keep ownership with the CA who returned it
                        $caseNote->update([
                            'status' => \App\Models\Request::STATUS_COMPLETED, // Mark as complete
                            'completed_at' => now(),
                            'completed_by_user_id' => $user->id,
                            'is_returned' => false,
                            'returned_at' => null,
                            'returned_by_user_id' => null,
                            'return_notes' => null,
                            'is_received' => false, // Reset received status
                            'received_at' => null,
                            'received_by_user_id' => null,
                            'reception_notes' => null,
                            // Keep current_pic_user_id - don't set to null to maintain ownership tracking
                        ]);

                        // Create timeline event for verification
                        $caseNote->events()->create([
                            'type' => 'returned_verified',
                            'actor_user_id' => $user->id,
                            'occurred_at' => now(),
                            'reason' => 'Case note return verified by MR Staff - marked as Complete',
                            'metadata' => [
                                'verified_by_user_id' => $user->id,
                                'verified_by_user_name' => $user->name,
                                'verification_notes' => $verificationNotes,
                                'verified_at' => now()->toDateTimeString(),
                                'completed_at' => now()->toDateTimeString(),
                                'completed_by_user_id' => $user->id,
                                'completed_by_user_name' => $user->name,
                                'previous_status' => \App\Models\Request::STATUS_PENDING_RETURN_VERIFICATION,
                                'new_status' => \App\Models\Request::STATUS_COMPLETED,
                                'location_name' => 'Medical Record Department',
                                'completion_notes' => 'Case note completed and stored in Medical Record Department'
                            ]
                        ]);

                    } elseif ($action === 'reject') {
                        // Mark case note as rejected and return to CA
                        // Preserve returned_by_user_id so CA can still see the rejected case note
                        $originalReturnedByUserId = $caseNote->returned_by_user_id;
                        $caseNote->update([
                            'status' => \App\Models\Request::STATUS_APPROVED, // Reset to approved status
                            'is_returned' => false,
                            'returned_at' => null,
                            'returned_by_user_id' => $originalReturnedByUserId, // Keep the original CA who returned it
                            'return_notes' => null,
                            'is_received' => true, // Keep as received
                            'rejection_reason' => $rejectionReason,
                            'rejected_at' => now(),
                            'rejected_by_user_id' => $user->id,
                            'is_rejected_return' => true, // Mark as rejected return for CA visibility
                            'current_pic_user_id' => $originalReturnedByUserId, // Ensure CA can see it in their list
                        ]);

                        // Create timeline event for rejection
                        $caseNote->events()->create([
                            'type' => 'returned_rejected',
                            'actor_user_id' => $user->id,
                            'occurred_at' => now(),
                            'reason' => 'Case note return rejected by MR Staff',
                            'metadata' => [
                                'rejected_by_user_id' => $user->id,
                                'rejected_by_user_name' => $user->name,
                                'rejection_reason' => $rejectionReason,
                                'rejected_at' => now()->toDateTimeString(),
                                'previous_status' => \App\Models\Request::STATUS_PENDING_RETURN_VERIFICATION,
                                'new_status' => \App\Models\Request::STATUS_APPROVED,
                            ]
                        ]);
                    }
                }

                DB::commit();

                $actionText = $action === 'verify' ? 'verified' : 'rejected';
                return response()->json([
                    'success' => true,
                    'message' => "Successfully {$actionText} " . count($caseNotes) . " case note(s)",
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Error processing returned case notes:', [
                'user_id' => $user->id ?? 'unknown',
                'action' => $action ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process returned case notes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get pending verification case notes for CA users
     */
    public function getPendingVerificationCaseNotes(): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check if user has permission to view pending verification case notes
            if (!$user->hasRole('CA')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. Only CA users can view pending verification case notes.'
                ], 403);
            }

            // Get case notes that are returned but waiting for MR staff verification
            $pendingVerificationCaseNotes = \App\Models\Request::with([
                'patient',
                'department',
                'doctor'
            ])
            ->where('status', \App\Models\Request::STATUS_PENDING_RETURN_VERIFICATION)
            ->where('is_returned', true)
            ->where('returned_by_user_id', $user->id) // Only show case notes returned by this CA
            ->orderBy('returned_at', 'desc')
            ->get();

            return response()->json([
                'success' => true,
                'case_notes' => $pendingVerificationCaseNotes,
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching pending verification case notes:', [
                'user_id' => $user->id ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch pending verification case notes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Return case notes by CA users
     */
    public function returnCaseNotes(HttpRequest $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'case_note_ids' => 'required|array|min:1',
            'case_note_ids.*' => 'required|integer|exists:requests,id',
            'return_notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = Auth::user();
        $caseNoteIds = $request->case_note_ids;
        $returnNotes = $request->return_notes;

        try {
            DB::beginTransaction();

            $caseNotes = Request::whereIn('id', $caseNoteIds)
                ->where('status', Request::STATUS_APPROVED)
                ->where('is_received', true)
                ->where(function($query) {
                    $query->where('is_returned', false) // Not yet returned
                          ->orWhere('is_rejected_return', true); // OR it was rejected and can be re-returned
                })
                ->where('current_pic_user_id', $user->id) // Only return case notes currently owned by this CA
                ->get();

            if ($caseNotes->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No valid case notes found for return'
                ], 400);
            }

            $returnedCount = 0;
            foreach ($caseNotes as $caseNote) {
                // Mark case note as returned
                $caseNote->update([
                    'is_returned' => true,
                    'returned_at' => now(),
                    'returned_by_user_id' => $user->id,
                    'return_notes' => $returnNotes,
                    'status' => Request::STATUS_PENDING_RETURN_VERIFICATION, // New status
                    'is_rejected_return' => false, // Clear rejected return flag
                    'rejection_reason' => null, // Clear rejection reason
                    'rejected_at' => null, // Clear rejection timestamp
                    'rejected_by_user_id' => null, // Clear rejection user
                ]);

                // Create timeline event for return
                $caseNote->events()->create([
                    'type' => RequestEvent::TYPE_RETURNED,
                    'actor_user_id' => $user->id,
                    'occurred_at' => now(),
                    'reason' => 'Case note returned by CA',
                    'metadata' => [
                        'returned_by_user_id' => $user->id,
                        'returned_by_user_name' => $user->name,
                        'return_notes' => $returnNotes,
                        'returned_at' => now()->toDateTimeString(),
                        'previous_status' => Request::STATUS_APPROVED,
                        'new_status' => Request::STATUS_PENDING_RETURN_VERIFICATION,
                    ]
                ]);

                $returnedCount++;
            }

            DB::commit();

            Log::info('Case notes returned by CA', [
                'user_id' => $user->id,
                'returned_count' => $returnedCount,
                'case_note_ids' => $caseNoteIds,
                'return_notes' => $returnNotes,
            ]);

            return response()->json([
                'success' => true,
                'message' => "Successfully returned {$returnedCount} case note(s) - pending MR staff verification",
                'returned_count' => $returnedCount,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error returning case notes:', [
                'user_id' => $user->id,
                'case_note_ids' => $caseNoteIds,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to return case notes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get approved case notes for verification by CA users
     */
    public function getApprovedCaseNotesForVerification(): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access this endpoint'
            ], 403);
        }

        try {
            $caseNotes = \App\Models\Request::with([
                'patient',
                'requestedBy',
                'department',
                'doctor',
                'approvedBy'
            ])
            ->where('status', \App\Models\Request::STATUS_APPROVED)
            ->where('is_received', false)
            ->whereNotNull('approved_at') // Ensure approved_at is not null
            ->where('requested_by_user_id', $user->id) // Security: only show case notes originally requested by current CA
            ->orderBy('approved_at', 'desc')
            ->get();

            $caseNotes = $caseNotes->map(function ($caseNote) {
                // Add batch number if available (for backward compatibility)
                $caseNote->batch_number = null; // Individual requests don't have batch numbers

                // Debug: Log approval remarks data
                Log::info('Case note approval data:', [
                    'id' => $caseNote->id,
                    'approval_remarks' => $caseNote->approval_remarks,
                    'approved_by_user_id' => $caseNote->approved_by_user_id,
                    'approved_at' => $caseNote->approved_at,
                    'raw_data' => $caseNote->toArray()
                ]);

                return $caseNote;
            });

            return response()->json([
                'success' => true,
                'case_notes' => $caseNotes,
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching approved case notes for verification:', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch approved case notes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Format event description based on event type
     */
    private function formatEventDescription(\App\Models\RequestEvent $event): string
    {
        $metadata = $event->metadata ?? [];

        switch ($event->type) {
            case 'created':
                $doctorName = $metadata['doctor_name'] ?? null;
                $description = 'Case note request created';
                if ($doctorName) {
                    $description .= " for {$doctorName}";
                }
                return $description;

            case 'approved':
                $approver = $metadata['approved_by_name'] ?? $event->actor->name ?? 'Unknown';
                return "Case note approved by {$approver}";

            case 'rejected':
                $rejecter = $metadata['rejected_by_name'] ?? $event->actor->name ?? 'Unknown';
                return "Case note rejected by {$rejecter}";

            case 'handover_requested':
                $from = $metadata['requested_by_name'] ?? $event->actor->name ?? 'Unknown';
                $to = $metadata['current_holder_name'] ?? 'Unknown';
                $description = "Handover requested from {$from} to {$to}";
                return $description;

            case 'handover_approved':
                $approver = $metadata['approved_by_name'] ?? $event->actor->name ?? 'Unknown';
                $description = "Handover approved by {$approver}";
                return $description;

            case 'handover_rejected':
                $rejecter = $metadata['rejected_by_name'] ?? $event->actor->name ?? 'Unknown';
                return "Handover rejected by {$rejecter}";

            case 'handed_over':
                $from = $metadata['handed_over_from_user_name'] ?? $event->actor->name ?? 'Unknown';
                $to = $metadata['handed_over_to_user_name'] ?? 'Unknown';
                $description = "Case note handed over from {$from} to {$to}";
                return $description;

            case 'Acknowledge':
                $acknowledger = $metadata['Acknowledge_by_name'] ?? $event->actor->name ?? 'Unknown';
                return "Case note Acknowledge by {$acknowledger}";

            case 'received':
                $receiver = $metadata['received_by_name'] ?? $event->actor->name ?? 'Unknown';
                return "Case note received by {$receiver}";

            case 'completed':
                $completer = $metadata['completed_by_name'] ?? $event->actor->name ?? 'Unknown';
                return "Case note completed by {$completer}";

            case 'updated':
                $updater = $metadata['updated_by_name'] ?? $event->actor->name ?? 'Unknown';
                $field = $metadata['updated_field'] ?? 'details';
                return "Case note {$field} updated by {$updater}";

            case 'status_changed':
                $changer = $metadata['changed_by_name'] ?? $event->actor->name ?? 'Unknown';
                $oldStatus = $metadata['old_status'] ?? 'Unknown';
                $newStatus = $metadata['new_status'] ?? 'Unknown';
                return "Status changed from {$oldStatus} to {$newStatus} by {$changer}";

                        case 'handover_verified':
                $verifiedBy = $metadata['verified_by_user_name'] ?? $event->actor->name ?? 'Unknown';
                $description = "Handover verified by {$verifiedBy}";
                return $description;

            case 'handover_receipt_verified':
                $verifiedBy = $metadata['verified_by_user_name'] ?? $event->actor->name ?? 'Unknown';
                $verificationNotes = $metadata['receipt_verification_notes'] ?? '';
                $description = "Handover receipt verified by {$verifiedBy}";
                return $description . ($verificationNotes ? " - {$verificationNotes}" : '');

            case 'rejected_not_received':
                $rejectedBy = $metadata['rejected_by_user_name'] ?? $event->actor->name ?? 'Unknown';
                $rejectionReason = $metadata['rejection_reason'] ?? '';
                $description = "Case note rejected as not received by {$rejectedBy}";
                return $description . ($rejectionReason ? " - {$rejectionReason}" : '');

            case 'returned_verified':
                $verifiedBy = $metadata['verified_by_user_name'] ?? $event->actor->name ?? 'Unknown';
                $verificationNotes = $metadata['verification_notes'] ?? '';
                $description = "Returned case note verified by {$verifiedBy} - marked as Complete";
                return $description . ($verificationNotes ? " - {$verificationNotes}" : '');

            case 'returned_rejected':
                $rejectedBy = $metadata['rejected_by_user_name'] ?? $event->actor->name ?? 'Unknown';
                $rejectionReason = $metadata['rejection_reason'] ?? '';
                $description = "Returned case note rejected by {$rejectedBy}";
                return $description . ($rejectionReason ? " - {$rejectionReason}" : '');

            case 'handover_data_fixed':
                $newDoctorName = $metadata['new_doctor_name'] ?? null;
                $newDepartmentName = $metadata['new_department_name'] ?? null;
                $description = "Handover data updated retroactively";
                if ($newDoctorName) {
                    $description .= " - New doctor: {$newDoctorName}";
                }
                if ($newDepartmentName) {
                    $description .= " - New department: {$newDepartmentName}";
                }
                return $description;

            default:
                return $event->reason ?? 'Event occurred';
        }
    }

    /**
     * Clean up metadata for frontend display.
     * Removes debug information and sensitive data.
     */
    private function cleanMetadata(array $metadata, string $eventType): array
    {
        $cleanedMetadata = [];

        // Only include relevant, user-friendly metadata
        $relevantKeys = [
            'notes' => ['verification_notes', 'completion_notes', 'approval_remarks', 'rejection_reason', 'handover_reason', 'reason', 'notes'],
            'approver' => ['approved_by_name'],
            'rejecter' => ['rejected_by_name'],
            'completer' => ['completed_by_name'],
            'receiver' => ['received_by_name'],
            'acknowledger' => ['Acknowledge_by_name'],
            'from_user' => ['handed_over_from_user_name', 'requested_by_name'],
            'to_user' => ['handed_over_to_user_name', 'current_holder_name'],
            'department' => ['department_name'],
            'location' => ['location_name'],
            'doctor' => ['doctor_name', 'doctor_id'],
            'handover_doctor' => ['handover_doctor_name', 'handover_doctor_id'],
            'new_doctor' => ['new_doctor_name', 'new_doctor_id'],
            'new_department' => ['new_department_name', 'new_department_id'],
            'new_location' => ['new_location_name', 'new_location_id'],
            'verification' => ['verification_notes', 'receipt_verification_notes', 'verified_by_user_name'],
            'rejection' => ['rejection_reason', 'rejected_by_user_name', 'rejected_at'],
            'return_verification' => ['verification_notes', 'verified_by_user_name', 'verified_at']
        ];

        foreach ($metadata as $key => $value) {
            // Skip debug and sensitive keys
            if (in_array($key, ['_token', 'password', 'remember_token', 'api_token', 'updated_at', 'created_at'])) {
                continue;
            }

            // Skip internal IDs and technical fields
            if (in_array($key, ['handover_id', 'handover_request_id', 'handed_over_from_user_id', 'handed_over_to_user_id', 'department_id', 'location_id'])) {
                continue;
            }

            // Only include relevant keys based on event type
            $isRelevant = false;
            foreach ($relevantKeys as $category => $keys) {
                if (in_array($key, $keys)) {
                    $isRelevant = true;
                    break;
                }
            }

            if ($isRelevant && $value !== null && $value !== '') {
                $cleanedMetadata[$key] = $value;
            }
        }

        return $cleanedMetadata;
    }

    /**
     * Generate PDF for case note requests from a specific CA
     */
    public function generateCaseNoteListPdf(HttpRequest $request, $caId)
    {
        $user = Auth::user();

        // Check if user has permission to generate PDFs
        if (!$user->hasRole(['MR_STAFF', 'ADMIN'], 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to generate PDFs'
            ], 403);
        }

        try {
            // Get optional request IDs to filter specific case notes
            $requestIds = $request->get('request_ids', []);
            if (is_string($requestIds)) {
                $requestIds = explode(',', $requestIds);
            }
            $requestIds = array_filter(array_map('intval', $requestIds));

            // Generate PDF using the service
            $pdfService = new \App\Services\CaseNotePdfService();
            $pdf = $pdfService->generateCaseNoteListPdf($caId, $requestIds);

            // Get CA information for filename
            $ca = \App\Models\User::find($caId);
            $filename = $pdfService->generateFilename($caId, $ca->name ?? 'Unknown');

            // Log the PDF generation
            Log::info('Case note list PDF generated', [
                'user_id' => $user->id,
                'ca_id' => $caId,
                'request_ids' => $requestIds,
                'filename' => $filename
            ]);

            // Return PDF as download
            return $pdf->download($filename);

        } catch (\Exception $e) {
            Log::error('Error generating case note list PDF:', [
                'user_id' => $user->id,
                'ca_id' => $caId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate PDF: ' . $e->getMessage()
            ], 500);
        }
    }
}


