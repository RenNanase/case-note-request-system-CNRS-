<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Request as CaseNoteRequest;
use App\Models\RequestEvent;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class IndividualRequestController extends Controller
{
    /**
     * Get user's individual case note requests
     */
    public function index(HttpRequest $request): JsonResponse
    {
        $user = Auth::user();

        // Only CA users can access this endpoint
        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access individual requests'
            ], 403);
        }

        $query = CaseNoteRequest::with([
            'patient',
            'department',
            'doctor',
            'location',
            'requestedBy',
            'approvedBy',
            'completedBy'
        ])->where('requested_by_user_id', $user->id)
          ->where('status', CaseNoteRequest::STATUS_PENDING); // Only show pending requests waiting for MR staff approval

        // Apply filters
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('priority') && $request->priority !== 'all') {
            $query->where('priority', $request->priority);
        }

        if ($request->has('department_id') && $request->department_id !== 'all') {
            $query->where('department_id', $request->department_id);
        }

        // Search by patient name or MRN
        if ($request->has('search') && !empty($request->search)) {
            $searchTerm = $request->search;
            $query->whereHas('patient', function($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                  ->orWhere('mrn', 'like', "%{$searchTerm}%");
            });
        }

        // Date range filter
        if ($request->has('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('created_at', '<=', $request->date_to . ' 23:59:59');
        }

        // Pagination
        $perPage = $request->get('per_page', 20);
        $requests = $query->orderBy('created_at', 'desc')->paginate($perPage);



        Log::info('Individual requests loaded for user:', [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'user_roles' => $user->roles->pluck('name')->toArray(),
            'request_count' => $requests->count(),
            'total_requests' => $requests->total(),
            'has_requests' => $requests->count() > 0,
        ]);

        return response()->json([
            'success' => true,
            'data' => $requests,
        ]);
    }

    /**
     * Create a new individual case note request
     */
    public function store(HttpRequest $request): JsonResponse
    {
        $user = Auth::user();

        // Only CA users can create individual requests
        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can create individual case note requests'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|exists:patients,id',
            'department_id' => 'required|exists:departments,id',
            'doctor_id' => 'nullable|exists:doctors,id',
            'location_id' => 'nullable|exists:locations,id',
            'priority' => 'required|in:low,normal,high,urgent',
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

        try {
            DB::beginTransaction();

            // Create individual case note request
                    $caseNoteRequest = CaseNoteRequest::create([
            'request_number' => CaseNoteRequest::generateRequestNumber(),
                'patient_id' => $request->patient_id,
                'requested_by_user_id' => $user->id,
                'department_id' => $request->department_id,
                'doctor_id' => $request->doctor_id,
                'location_id' => $request->location_id,
                'priority' => $request->priority,
                'purpose' => $request->purpose,
                'needed_date' => $request->needed_date,
                'remarks' => $request->remarks,
                'status' => CaseNoteRequest::STATUS_PENDING,
                'current_pic_user_id' => $user->id,
                'handover_status' => 'none',
            ]);

            // Create timeline event for case note creation
            $caseNoteRequest->events()->create([
                'type' => RequestEvent::TYPE_CREATED,
                'actor_user_id' => $user->id,
                'reason' => 'Individual case note request created',
                'occurred_at' => now(),
                'metadata' => [
                    'created_individually' => true,
                    'created_at' => now()->toISOString(),
                ]
            ]);

            DB::commit();

            Log::info('Individual case note request created successfully', [
                'request_id' => $caseNoteRequest->id,
                'request_number' => $caseNoteRequest->request_number,
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Case note request created successfully',
                'request' => $caseNoteRequest->load(['patient', 'department', 'doctor', 'location']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating individual case note request:', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error creating case note request'
            ], 500);
        }
    }

    /**
     * Get individual request details
     */
    public function show($id): JsonResponse
    {
        $user = Auth::user();
        $requestId = (int) $id;
        $request = CaseNoteRequest::with([
            'patient',
            'department',
            'doctor',
            'location',
            'requestedBy',
            'approvedBy',
            'completedBy',
            'events'
        ])->find($requestId);

        if (!$request) {
            return response()->json([
                'success' => false,
                'message' => 'Case note request not found'
            ], 404);
        }

        // CA users can only see their own requests
        if ($user->hasRole('CA', 'api') && $request->requested_by_user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied'
            ], 403);
        }



        return response()->json([
            'success' => true,
            'request' => $request,
        ]);
    }

    /**
     * Update individual request
     */
    public function update(HttpRequest $httpRequest, $id): JsonResponse
    {
        $user = Auth::user();
        $requestId = (int) $id;
        $request = CaseNoteRequest::find($requestId);

        if (!$request) {
            return response()->json([
                'success' => false,
                'message' => 'Case note request not found'
            ], 404);
        }

        // Only the requesting CA can update their own requests
        if ($request->requested_by_user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You can only update your own requests'
            ], 403);
        }

        // Can only update pending requests
        if ($request->status !== CaseNoteRequest::STATUS_PENDING) {
            return response()->json([
                'success' => false,
                'message' => 'Can only update pending requests'
            ], 400);
        }

        $validator = Validator::make($httpRequest->all(), [
            'department_id' => 'sometimes|required|exists:departments,id',
            'doctor_id' => 'nullable|exists:doctors,id',
            'location_id' => 'nullable|exists:locations,id',
            'priority' => 'sometimes|required|in:low,normal,high,urgent',
            'purpose' => 'sometimes|required|string|max:1000',
            'needed_date' => 'sometimes|required|date|after_or_equal:today',
            'remarks' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Update the request
            $request->update($httpRequest->only([
                'department_id',
                'doctor_id',
                'location_id',
                'priority',
                'purpose',
                'needed_date',
                'remarks'
            ]));

            // Create update event
            $request->events()->create([
                'type' => 'submitted',
                'actor_user_id' => $user->id,
                'reason' => 'Request updated by CA',
                'occurred_at' => now(),
                'metadata' => [
                    'updated_fields' => array_keys($httpRequest->only([
                        'department_id',
                        'doctor_id',
                        'location_id',
                        'priority',
                        'purpose',
                        'needed_date',
                        'remarks'
                    ])),
                ]
            ]);

            DB::commit();

            Log::info('Individual case note request updated successfully', [
                'request_id' => $request->id,
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Case note request updated successfully',
                'request' => $request->fresh(['patient', 'department', 'doctor', 'location']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating individual case note request:', [
                'request_id' => $id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error updating case note request'
            ], 500);
        }
    }

    /**
     * Delete individual request (only if pending)
     */
    public function destroy($id): JsonResponse
    {
        $user = Auth::user();
        $requestId = (int) $id;
        $request = CaseNoteRequest::find($requestId);

        if (!$request) {
            return response()->json([
                'success' => false,
                'message' => 'Case note request not found'
            ], 404);
        }

        // Only the requesting CA can delete their own requests
        if ($request->requested_by_user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You can only delete your own requests'
            ], 403);
        }

        // Can only delete pending requests
        if ($request->status !== CaseNoteRequest::STATUS_PENDING) {
            return response()->json([
                'success' => false,
                'message' => 'Can only delete pending requests'
            ], 400);
        }

        try {
            DB::beginTransaction();

            // Create deletion event before deleting
            $request->events()->create([
                'type' => 'rejected',
                'actor_user_id' => $user->id,
                'reason' => 'Request deleted by CA',
                'occurred_at' => now(),
            ]);

            // Delete the request
            $request->delete();

            DB::commit();

            Log::info('Individual case note request deleted successfully', [
                'request_id' => $id,
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Case note request deleted successfully',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting individual case note request:', [
                'request_id' => $id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error deleting case note request'
            ], 500);
        }
    }

    /**
     * Get statistics for individual requests
     */
    public function getStats(): JsonResponse
    {
        $user = Auth::user();

        // Debug logging
        Log::info('IndividualRequestController getStats called', [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'user_roles' => $user->roles->pluck('name')->toArray(),
            'has_ca_role' => $user->hasRole('CA', 'api'),
            'has_ca_role_no_guard' => $user->hasRole('CA'),
        ]);

        // Only CA users can access this endpoint
        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access individual request statistics. User roles: ' . implode(', ', $user->roles->pluck('name')->toArray())
            ], 403);
        }

        try {
            $stats = [
                'total_requests' => CaseNoteRequest::where('requested_by_user_id', $user->id)->count(),
                'pending_requests' => CaseNoteRequest::where('requested_by_user_id', $user->id)
                    ->where('status', CaseNoteRequest::STATUS_PENDING)->count(),
                'approved_requests' => CaseNoteRequest::where('requested_by_user_id', $user->id)
                    ->where('status', CaseNoteRequest::STATUS_APPROVED)->count(),
                'completed_requests' => CaseNoteRequest::where('requested_by_user_id', $user->id)
                    ->where('status', CaseNoteRequest::STATUS_COMPLETED)->count(),
                'rejected_requests' => CaseNoteRequest::where('requested_by_user_id', $user->id)
                    ->where('status', CaseNoteRequest::STATUS_REJECTED)->count(),
                'overdue_requests' => CaseNoteRequest::where('requested_by_user_id', $user->id)
                    ->where('needed_date', '<', now()->startOfDay())
                    ->whereNotIn('status', [CaseNoteRequest::STATUS_COMPLETED, CaseNoteRequest::STATUS_REJECTED])
                    ->count(),
                'today_requests' => CaseNoteRequest::where('requested_by_user_id', $user->id)
                    ->whereDate('created_at', today())->count(),
                'this_week_requests' => CaseNoteRequest::where('requested_by_user_id', $user->id)
                    ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
                'this_month_requests' => CaseNoteRequest::where('requested_by_user_id', $user->id)
                    ->whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year)->count(),
                'pending_verifications' => CaseNoteRequest::where('requested_by_user_id', $user->id)
                    ->where('status', CaseNoteRequest::STATUS_APPROVED)
                    ->where('is_received', false)
                    ->whereNotNull('approved_at')
                    ->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting individual request statistics:', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error retrieving statistics: ' . $e->getMessage()
            ], 500);
        }
    }
}
