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

class RequestController extends Controller
{
    /**
     * Display a listing of case note requests
     */
    public function index(HttpRequest $request): JsonResponse
    {
        $user = Auth::user();
        $query = \App\Models\Request::with(['patient', 'requestedBy', 'department', 'doctor', 'location', 'approvedBy', 'completedBy']);

        // Role-based filtering
        if ($user->hasRole('CA', 'api')) {
            // Check if this is a request for "My Requests" page (all involvement)
            $includeAllInvolvement = $request->get('include_all_involvement', false);

            if ($includeAllInvolvement) {
                // For "My Requests" page: show all requests where user is involved (created OR assigned)
                $query->where(function($q) use ($user) {
                    $q->where('requested_by_user_id', $user->id)  // Created by me
                      ->orWhere('current_pic_user_id', $user->id); // Currently assigned to me
                });

                Log::info('CA user requesting all involvement data:', [
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                    'query_conditions' => [
                        'requested_by_user_id' => $user->id,
                        'current_pic_user_id' => $user->id,
                    ]
                ]);
            } else {
                // For dashboard: only show requests where user is the current PIC
                $query->where('current_pic_user_id', $user->id);

                Log::info('CA user requesting dashboard data:', [
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                    'query_conditions' => [
                        'current_pic_user_id' => $user->id,
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
            $query->byStatus($request->status);
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

        // Pagination
        $perPage = $request->get('per_page', 15);
        $requests = $query->paginate($perPage);

        // Log the results for CA users
        if ($user->hasRole('CA', 'api')) {
            Log::info('CA user data returned:', [
                'user_id' => $user->id,
                'total_requests' => $requests->total(),
                'current_page' => $requests->currentPage(),
                'per_page' => $requests->perPage(),
                'request_ids' => $requests->pluck('id')->toArray(),
                'request_details' => $requests->map(function($req) {
                    return [
                        'id' => $req->id,
                        'requested_by_user_id' => $req->requested_by_user_id,
                        'current_pic_user_id' => $req->current_pic_user_id,
                        'status' => $req->status,
                    ];
                })->toArray(),
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

        $caseRequest = \App\Models\Request::create([
            'request_number' => \App\Models\Request::generateRequestNumber(),
            'patient_id' => $request->patient_id,
            'requested_by_user_id' => $user->id,
            'department_id' => $request->department_id,
            'doctor_id' => $request->doctor_id,
            'location_id' => $request->location_id,
            'priority' => $request->priority,
            'status' => \App\Models\Request::STATUS_PENDING,
            'purpose' => $request->purpose,
            'needed_date' => $request->needed_date,
            'remarks' => $request->remarks,
            'current_pic_user_id' => $user->id, // Set creator as initial PIC
            'handover_status' => 'none', // Initial handover status
        ]);

        // Create initial event
        $caseRequest->events()->create([
            'type' => RequestEvent::TYPE_CREATED,
            'actor_user_id' => $user->id,
            'reason' => 'Request created',
            'occurred_at' => now(),
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
                    'current_pic_user_id' => $caseRequest->current_pic_user_id,
                    'is_owner' => $user->id == $caseRequest->requested_by_user_id,
                    'is_current_pic' => $user->id == $caseRequest->current_pic_user_id
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
        $timeline = $events->map->toTimelineItem();

        Log::info('Timeline data being returned:', [
            'request_id' => $caseRequest->id,
            'total_events' => $events->count(),
            'event_types' => $events->pluck('type')->toArray(),
            'handover_events' => $events->where('type', 'handed_over')->count(),
            'timeline_count' => $timeline->count(),
            'events_with_metadata' => $events->whereNotNull('metadata')->count(),
        ]);

        return response()->json([
            'success' => true,
            'request' => $caseRequest,
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

        $validator = Validator::make($httpRequest->all(), [
            'reason' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
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
}
