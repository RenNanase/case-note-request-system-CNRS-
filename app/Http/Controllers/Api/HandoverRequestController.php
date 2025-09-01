<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Request;
use App\Models\RequestEvent;
use App\Models\HandoverRequest;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class HandoverRequestController extends Controller
{
    /**
     * Request handover for a case note
     */
    public function requestHandover(HttpRequest $request, int $caseNoteId): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can request handovers'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500',
            'priority' => 'required|in:low,normal,high,urgent',
            'department_id' => 'required|exists:departments,id',
            'location_id' => 'nullable|exists:locations,id',
            'doctor_id' => 'nullable|exists:doctors,id',
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

            // Check if case note exists and is not available
            $caseNote = Request::with(['patient', 'currentPIC'])->find($caseNoteId);

            if (!$caseNote) {
                return response()->json([
                    'success' => false,
                    'message' => 'Case note not found'
                ], 404);
            }

            // Check if case note is available (not currently held by anyone)
            if ($caseNote->is_available) {
                return response()->json([
                    'success' => false,
                    'message' => 'This case note is available and can be requested directly'
                ], 400);
            }

            // Check if user is already the current holder
            if ($caseNote->current_pic_user_id === $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already have this case note'
                ], 400);
            }

            // Check if there's already a pending handover request for this case note
            $existingRequest = HandoverRequest::where('case_note_id', $caseNoteId)
                ->where('status', 'pending')
                ->where('requested_by_user_id', $user->id)
                ->first();

            if ($existingRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already have a pending handover request for this case note'
                ], 400);
            }

            // Create handover request
            $handoverRequest = HandoverRequest::create([
                'case_note_id' => $caseNoteId,
                'requested_by_user_id' => $user->id,
                'current_holder_user_id' => $caseNote->current_pic_user_id,
                'reason' => $request->reason,
                'priority' => $request->priority,
                'department_id' => $request->department_id,
                'location_id' => $request->location_id,
                'doctor_id' => $request->doctor_id,
                'status' => 'pending',
                'requested_at' => now(),
            ]);

            // Log the handover request event
            RequestEvent::create([
                'request_id' => $caseNoteId,
                'type' => 'handover_requested',
                'actor_user_id' => $user->id,
                'occurred_at' => now(),
                'reason' => "Handover requested by {$user->name}",
                'metadata' => [
                    'handover_request_id' => $handoverRequest->id,
                    'reason' => $request->reason,
                    'priority' => $request->priority,
                    'requested_by_name' => $user->name,
                    'current_holder_name' => $caseNote->currentPIC?->name ?? 'Unknown',
                    'doctor_id' => $request->doctor_id,
                    'doctor_name' => $request->doctor_id ? \App\Models\Doctor::find($request->doctor_id)?->name : null,
                    'department_id' => $request->department_id,
                    'department_name' => $request->department_id ? \App\Models\Department::find($request->department_id)?->name : null,
                    'location_id' => $request->location_id,
                    'location_name' => $request->location_id ? \App\Models\Location::find($request->location_id)?->name : null
                ]
            ]);

            Log::info('Handover request created', [
                'user_id' => $user->id,
                'case_note_id' => $caseNoteId,
                'handover_request_id' => $handoverRequest->id,
                'current_holder_id' => $caseNote->current_pic_user_id
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Handover request submitted successfully',
                'handover_request' => $handoverRequest
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating handover request', [
                'user_id' => $user->id,
                'case_note_id' => $caseNoteId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to submit handover request'
            ], 500);
        }
    }

    /**
     * Get handover requests for current user (as requester)
     */
    public function getMyHandoverRequests(): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access this endpoint'
            ], 403);
        }

        try {
            $handoverRequests = HandoverRequest::with([
                'caseNote.patient',
                'caseNote.department',
                'currentHolder',
                'department',
                'location',
                'doctor'
            ])
            ->where('requested_by_user_id', $user->id)
            ->orderBy('requested_at', 'desc')
            ->get();

            return response()->json([
                'success' => true,
                'handover_requests' => $handoverRequests
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching handover requests', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch handover requests'
            ], 500);
        }
    }

    /**
     * Get handover requests for current user (as current holder)
     */
    public function getIncomingHandoverRequests(): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access this endpoint'
            ], 403);
        }

        try {
            $handoverRequests = HandoverRequest::with([
                'caseNote.patient',
                'caseNote.department',
                'requester',
                'department',
                'location',
                'doctor'
            ])
            ->where('current_holder_user_id', $user->id)
            ->where('status', 'pending')
            ->orderBy('requested_at', 'desc')
            ->get();

            return response()->json([
                'success' => true,
                'handover_requests' => $handoverRequests
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching incoming handover requests', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch incoming handover requests'
            ], 500);
        }
    }

    /**
     * Approve or reject a handover request
     */
    public function respondToHandoverRequest(HttpRequest $request, int $handoverRequestId): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can respond to handover requests'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'action' => 'required|in:approve,reject',
            'notes' => 'nullable|string|max:500',
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

            $handoverRequest = HandoverRequest::with(['caseNote', 'requester'])->find($handoverRequestId);

            if (!$handoverRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'Handover request not found'
                ], 404);
            }

            // Check if user is the current holder
            if ($handoverRequest->current_holder_user_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not authorized to respond to this handover request'
                ], 403);
            }

            // Check if request is still pending
            if ($handoverRequest->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'This handover request has already been processed'
                ], 400);
            }

            $action = $request->action;
            $notes = $request->notes;

            if ($action === 'approve') {
                // Approve the handover request - now goes to pending verification status
                $handoverRequest->update([
                    'status' => HandoverRequest::STATUS_APPROVED_PENDING_VERIFICATION,
                    'responded_at' => now(),
                    'response_notes' => $notes
                ]);

                // Update the case note to transfer ownership and apply new details
                $handoverRequest->caseNote->update([
                    'current_pic_user_id' => $handoverRequest->requested_by_user_id,
                    'handover_status' => 'approved_pending_verification',
                    'doctor_id' => $handoverRequest->doctor_id, // Update with new doctor
                    'department_id' => $handoverRequest->department_id, // Update with new department
                    'location_id' => $handoverRequest->location_id, // Update with new location
                ]);

                // Log the approval event
                RequestEvent::create([
                    'request_id' => $handoverRequest->case_note_id,
                    'type' => 'handover_approved',
                    'actor_user_id' => $user->id,
                    'occurred_at' => now(),
                    'reason' => "Handover approved by {$user->name}",
                    'metadata' => [
                        'handover_request_id' => $handoverRequest->id,
                        'approved_by_name' => $user->name,
                        'transferred_to_name' => $handoverRequest->requester->name,
                        'notes' => $notes,
                        'new_doctor_id' => $handoverRequest->doctor_id,
                        'new_doctor_name' => $handoverRequest->doctor ? $handoverRequest->doctor->name : null,
                        'new_department_id' => $handoverRequest->department_id,
                        'new_department_name' => $handoverRequest->department ? $handoverRequest->department->name : null,
                        'new_location_id' => $handoverRequest->location_id,
                        'new_location_name' => $handoverRequest->location ? $handoverRequest->location->name : null,
                    ]
                ]);

                $message = 'Handover request approved successfully';

            } else {
                // Reject the handover request
                $handoverRequest->update([
                    'status' => 'rejected',
                    'responded_at' => now(),
                    'response_notes' => $notes
                ]);

                // Log the rejection event
                RequestEvent::create([
                    'request_id' => $handoverRequest->case_note_id,
                    'type' => 'handover_rejected',
                    'actor_user_id' => $user->id,
                    'occurred_at' => now(),
                    'reason' => "Handover rejected by {$user->name}",
                    'metadata' => [
                        'handover_request_id' => $handoverRequest->id,
                        'rejected_by_name' => $user->name,
                        'notes' => $notes
                    ]
                ]);

                $message = 'Handover request rejected';
            }

            Log::info('Handover request responded to', [
                'user_id' => $user->id,
                'handover_request_id' => $handoverRequestId,
                'action' => $action
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $message,
                'handover_request' => $handoverRequest
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error responding to handover request', [
                'user_id' => $user->id,
                'handover_request_id' => $handoverRequestId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to respond to handover request'
            ], 500);
        }
    }

    /**
     * Get handover requests pending verification by the requesting CA
     */
    public function getHandoverRequestsPendingVerification(): JsonResponse
    {
        $user = Auth::user();

        Log::info('getHandoverRequestsPendingVerification called', [
            'user_id' => $user ? $user->id : 'null',
            'user_name' => $user ? $user->name : 'null',
            'user_role' => $user ? $user->role : 'null'
        ]);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        if ($user->role !== 'CA') {
            Log::warning('User does not have CA role', [
                'user_id' => $user->id,
                'user_role' => $user->role
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access this endpoint'
            ], 403);
        }

        try {
            $handoverRequests = HandoverRequest::with([
                'caseNote.patient',
                'caseNote.department',
                'currentHolder',
                'department',
                'location',
                'doctor'
            ])
            ->where('requested_by_user_id', $user->id)
            ->where('status', HandoverRequest::STATUS_APPROVED_PENDING_VERIFICATION)
            ->orderBy('responded_at', 'desc')
            ->get();

            Log::info('Handover requests pending verification found', [
                'user_id' => $user->id,
                'count' => $handoverRequests->count(),
                'handover_requests' => $handoverRequests->map(function($hr) {
                    return [
                        'id' => $hr->id,
                        'status' => $hr->status,
                        'current_holder_name' => $hr->currentHolder ? $hr->currentHolder->name : 'null',
                        'responded_at' => $hr->responded_at
                    ];
                })
            ]);

            return response()->json([
                'success' => true,
                'handover_requests' => $handoverRequests
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching handover requests pending verification', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch handover requests pending verification'
            ], 500);
        }
    }

    /**
     * Get all incoming handover requests for statistics (all statuses)
     */
    public function getAllIncomingHandoverRequests(): JsonResponse
    {
        $user = Auth::user();

        Log::info('getAllIncomingHandoverRequests called', [
            'user_id' => $user ? $user->id : 'null',
            'user_name' => $user ? $user->name : 'null',
            'user_role' => $user ? $user->role : 'null'
        ]);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        if ($user->role !== 'CA') {
            Log::warning('User does not have CA role', [
                'user_id' => $user->id,
                'user_role' => $user->role
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access this endpoint'
            ], 403);
        }

        try {
            $handoverRequests = HandoverRequest::with([
                'caseNote.patient',
                'caseNote.department',
                'requester',
                'department',
                'location',
                'doctor'
            ])
            ->where('current_holder_user_id', $user->id)
            ->orderBy('requested_at', 'desc')
            ->get();

            Log::info('Handover requests found', [
                'user_id' => $user->id,
                'count' => $handoverRequests->count(),
                'handover_requests' => $handoverRequests->map(function($hr) {
                    return [
                        'id' => $hr->id,
                        'status' => $hr->status,
                        'requester_name' => $hr->requester ? $hr->requester->name : 'null',
                        'current_holder_user_id' => $hr->current_holder_user_id
                    ];
                })
            ]);

            return response()->json([
                'success' => true,
                'handover_requests' => $handoverRequests
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching all incoming handover requests', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch incoming handover requests'
            ], 500);
        }
    }

    /**
     * Verify handover request by the requesting CA
     */
    public function verifyHandoverRequest(HttpRequest $request, int $handoverRequestId): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can verify handover requests'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'action' => 'required|in:approve,reject',
            'verification_notes' => 'nullable|string|max:500',
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

            $handoverRequest = HandoverRequest::with(['caseNote', 'currentHolder'])->find($handoverRequestId);

            if (!$handoverRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'Handover request not found'
                ], 404);
            }

            // Check if user is the one who requested the handover
            if ($handoverRequest->requested_by_user_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only verify handover requests you requested'
                ], 403);
            }

            // Check if request is in approved_pending_verification status
            if ($handoverRequest->status !== HandoverRequest::STATUS_APPROVED_PENDING_VERIFICATION) {
                return response()->json([
                    'success' => false,
                    'message' => 'This handover request is not ready for verification'
                ], 400);
            }

            $action = $request->action;
            $verificationNotes = $request->verification_notes;

            if ($action === 'approve') {
                // Verify the handover request
                $handoverRequest->update([
                    'status' => HandoverRequest::STATUS_VERIFIED,
                    'verified_at' => now(),
                    'verified_by_user_id' => $user->id,
                    'verification_notes' => $verificationNotes
                ]);

                // Update the case note to finalize the handover
                $handoverRequest->caseNote->update([
                    'handover_status' => 'verified',
                    'handover_verified_at' => now(),
                ]);

                // Log the verification event
                RequestEvent::create([
                    'request_id' => $handoverRequest->case_note_id,
                    'type' => 'handover_verified',
                    'actor_user_id' => $user->id,
                    'occurred_at' => now(),
                    'reason' => "Handover verified by {$user->name}",
                    'metadata' => [
                        'handover_request_id' => $handoverRequest->id,
                        'verified_by_user_name' => $user->name,
                        'verification_notes' => $verificationNotes,
                        'doctor_id' => $handoverRequest->doctor_id,
                        'doctor_name' => $handoverRequest->doctor?->name,
                        'department_id' => $handoverRequest->department_id,
                        'department_name' => $handoverRequest->department?->name,
                        'location_id' => $handoverRequest->location_id,
                        'location_name' => $handoverRequest->location?->name,
                    ]
                ]);

                $message = 'Handover request verified successfully';

            } else {
                // Reject the handover request
                $handoverRequest->update([
                    'status' => HandoverRequest::STATUS_REJECTED,
                    'verified_at' => now(),
                    'verified_by_user_id' => $user->id,
                    'verification_notes' => $verificationNotes
                ]);

                // Revert the case note ownership back to the original holder
                $handoverRequest->caseNote->update([
                    'current_pic_user_id' => $handoverRequest->current_holder_user_id,
                    'handover_status' => 'rejected',
                    'handover_rejected_at' => now(),
                ]);

                // Log the rejection event
                RequestEvent::create([
                    'request_id' => $handoverRequest->case_note_id,
                    'type' => 'handover_rejected',
                    'actor_user_id' => $user->id,
                    'occurred_at' => now(),
                    'reason' => "Handover rejected by {$user->name}",
                    'metadata' => [
                        'handover_request_id' => $handoverRequest->id,
                        'rejected_by_user_name' => $user->name,
                        'verification_notes' => $verificationNotes,
                        'doctor_id' => $handoverRequest->doctor_id,
                        'doctor_name' => $handoverRequest->doctor?->name,
                        'department_id' => $handoverRequest->department_id,
                        'department_name' => $handoverRequest->department?->name,
                        'location_id' => $handoverRequest->location_id,
                        'location_name' => $handoverRequest->location?->name,
                    ]
                ]);

                $message = 'Handover request rejected';
            }

            Log::info('Handover request verification processed', [
                'user_id' => $user->id,
                'handover_request_id' => $handoverRequestId,
                'action' => $action
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $message,
                'handover_request' => $handoverRequest
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error verifying handover request', [
                'user_id' => $user->id,
                'handover_request_id' => $handoverRequestId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to verify handover request'
            ], 500);
        }
    }
}
