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
                    'current_holder_name' => $caseNote->currentPIC?->name ?? 'Unknown'
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
                // Approve the handover request
                $handoverRequest->update([
                    'status' => 'approved',
                    'responded_at' => now(),
                    'response_notes' => $notes
                ]);

                // Update the case note to transfer ownership
                $handoverRequest->caseNote->update([
                    'current_pic_user_id' => $handoverRequest->requested_by_user_id,
                    'handover_status' => 'transferred'
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
                        'notes' => $notes
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
}
