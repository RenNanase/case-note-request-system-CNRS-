<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Request;
use App\Models\RequestEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class CaseNoteVerificationController extends Controller
{
    /**
     * Get approved case notes waiting for verification
     * Grouped by approval date for CA users
     */
    public function getApprovedForVerification(): JsonResponse
    {
        $user = Auth::user();

        // Only CA users can access this endpoint
        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access case note verification'
            ], 403);
        }

        try {
            // Get approved case notes that the current CA originally requested
            // CAs can only verify their own case notes
            $caseNotes = Request::with([
                'patient',
                'department',
                'doctor',
                'location',
                'approvedBy',
                'receivedBy'
            ])
            ->where('status', Request::STATUS_APPROVED)
            ->where('requested_by_user_id', $user->id) // Only show case notes originally requested by current CA
            ->whereNotNull('approved_at')
            ->orderBy('approved_at', 'desc')
            ->get();

            // Transform data for frontend
            $transformedCaseNotes = $caseNotes->map(function ($caseNote) {
                return [
                    'id' => $caseNote->id,
                    'request_number' => $caseNote->request_number,
                    'patient' => [
                        'id' => $caseNote->patient->id,
                        'name' => $caseNote->patient->name,
                        'mrn' => $caseNote->patient->mrn,
                        'nationality_id' => $caseNote->patient->nationality_id,
                    ],
                    'batch_id' => null, // Individual requests don't have batch_id
                    'batch_number' => null, // Individual requests don't have batch numbers
                    'approved_at' => $caseNote->approved_at->toISOString(),
                    'approved_by' => $caseNote->approvedBy ? [
                        'name' => $caseNote->approvedBy->name,
                    ] : null,
                    'is_received' => $caseNote->is_received ?? false,
                    'received_at' => $caseNote->received_at?->toISOString(),
                    'received_by' => $caseNote->receivedBy ? [
                        'name' => $caseNote->receivedBy->name,
                    ] : null,
                    'priority' => $caseNote->priority,
                    'purpose' => $caseNote->purpose,
                    'department' => $caseNote->department ? [
                        'name' => $caseNote->department->name,
                    ] : null,
                    'doctor' => $caseNote->doctor ? [
                        'name' => $caseNote->doctor->name,
                    ] : null,
                ];
            });

            Log::info('Approved case notes loaded for verification', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'case_notes_count' => $transformedCaseNotes->count(),
                'pending_verification_count' => $transformedCaseNotes->where('is_received', false)->count(),
            ]);

            return response()->json([
                'success' => true,
                'case_notes' => $transformedCaseNotes,
            ]);

        } catch (\Exception $e) {
            Log::error('Error loading approved case notes for verification:', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error loading case notes for verification'
            ], 500);
        }
    }

    /**
     * Verify that specific case notes have been received
     * Individual case note verification
     */
    public function verifyReceived(HttpRequest $request): JsonResponse
    {
        $user = Auth::user();

        // Only CA users can verify receipt
        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can verify case note receipt'
            ], 403);
        }

        // Validate request data
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

        try {
            DB::beginTransaction();

            $caseNoteIds = $request->case_note_ids;
            $verificationNotes = $request->verification_notes;

            // Get the case notes to verify
            // Security: only allow verification of case notes originally requested by current CA
            $caseNotes = Request::whereIn('id', $caseNoteIds)
                ->where('status', Request::STATUS_APPROVED)
                ->where('requested_by_user_id', $user->id)
                ->get();

            if ($caseNotes->count() !== count($caseNoteIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Some case notes were not found or you do not have permission to verify them'
                ], 404);
            }

            $verifiedCount = 0;
            $alreadyVerified = 0;

            foreach ($caseNotes as $caseNote) {
                if ($caseNote->is_received) {
                    $alreadyVerified++;
                    continue;
                }

                // Mark as received (this will also create a timeline event)
                $caseNote->markAsReceived($user->id, $verificationNotes);

                $verifiedCount++;
            }

            // Individual requests don't have batch relationships anymore
            // No batch verification status to update

            DB::commit();

            Log::info('Case notes verified as received', [
                'user_id' => $user->id,
                'case_note_ids' => $caseNoteIds,
                'verified_count' => $verifiedCount,
                'already_verified_count' => $alreadyVerified,
                'verification_notes' => $verificationNotes,
            ]);

            $message = "Successfully verified receipt of {$verifiedCount} case note(s).";
            if ($alreadyVerified > 0) {
                $message .= " {$alreadyVerified} case note(s) were already verified.";
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'verified_count' => $verifiedCount,
                'already_verified_count' => $alreadyVerified,
                'total_processed' => $verifiedCount + $alreadyVerified,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error verifying case note receipt:', [
                'user_id' => $user->id,
                'case_note_ids' => $request->case_note_ids ?? [],
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error verifying case note receipt'
            ], 500);
        }
    }

    /**
     * Get approved case notes for a specific user (for on behalf verification)
     */
    public function getApprovedForUser(int $userId): JsonResponse
    {
        $currentUser = Auth::user();

        // Only CA users can access this endpoint
        if (!$currentUser->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access case note verification'
            ], 403);
        }

        try {
            // Get approved case notes for the specified user that are pending verification
            $caseNotes = Request::with([
                'patient',
                'department',
                'doctor',
                'location',
                'approvedBy',
                'receivedBy',
                'verifiedOnBehalfBy'
            ])
            ->where('status', Request::STATUS_APPROVED)
            ->where('requested_by_user_id', $userId)
            ->whereNotNull('approved_at')
            ->orderBy('approved_at', 'desc')
            ->get();

            // Transform data for frontend
            $transformedCaseNotes = $caseNotes->map(function ($caseNote) {
                return [
                    'id' => $caseNote->id,
                    'request_number' => $caseNote->request_number,
                    'patient' => [
                        'id' => $caseNote->patient->id,
                        'name' => $caseNote->patient->name,
                        'mrn' => $caseNote->patient->mrn,
                        'nationality_id' => $caseNote->patient->nationality_id,
                    ],
                    'batch_id' => null,
                    'batch_number' => null,
                    'approved_at' => $caseNote->approved_at->toISOString(),
                    'approved_by' => $caseNote->approvedBy ? [
                        'name' => $caseNote->approvedBy->name,
                    ] : null,
                    'is_received' => $caseNote->is_received ?? false,
                    'received_at' => $caseNote->received_at?->toISOString(),
                    'received_by' => $caseNote->receivedBy ? [
                        'name' => $caseNote->receivedBy->name,
                    ] : null,
                    'verified_on_behalf_by' => $caseNote->verifiedOnBehalfBy ? [
                        'name' => $caseNote->verifiedOnBehalfBy->name,
                    ] : null,
                    'priority' => $caseNote->priority,
                    'purpose' => $caseNote->purpose,
                    'department' => $caseNote->department ? [
                        'name' => $caseNote->department->name,
                    ] : null,
                    'doctor' => $caseNote->doctor ? [
                        'name' => $caseNote->doctor->name,
                    ] : null,
                    'approval_remarks' => $caseNote->approval_remarks,
                ];
            });

            return response()->json([
                'success' => true,
                'case_notes' => $transformedCaseNotes,
            ]);

        } catch (\Exception $e) {
            Log::error('Error loading approved case notes for user:', [
                'current_user_id' => $currentUser->id,
                'target_user_id' => $userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to load approved case notes for user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify case notes on behalf of another user
     */
    public function verifyOnBehalf(HttpRequest $request): JsonResponse
    {
        $currentUser = Auth::user();

        // Only CA users can verify on behalf
        if (!$currentUser->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can acknowledge case notes on behalf'
            ], 403);
        }

        // Validate request data
        $validator = Validator::make($request->all(), [
            'case_note_ids' => 'required|array|min:1',
            'case_note_ids.*' => 'required|integer|exists:requests,id',
            'verification_notes' => 'nullable|string|max:1000',
            'on_behalf_of_user_id' => 'required|integer|exists:users,id',
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

            $caseNoteIds = $request->case_note_ids;
            $verificationNotes = $request->verification_notes;
            $onBehalfOfUserId = $request->on_behalf_of_user_id;

            // Verify that the target user is a CA
            $targetUser = \App\Models\User::find($onBehalfOfUserId);
            if (!$targetUser || !$targetUser->hasRole('CA', 'api')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Target user must be a valid Clinic Assistant'
                ], 400);
            }

            // Get the case notes to verify
            $caseNotes = Request::whereIn('id', $caseNoteIds)
                ->where('status', Request::STATUS_APPROVED)
                ->where('requested_by_user_id', $onBehalfOfUserId)
                ->get();

            if ($caseNotes->count() !== count($caseNoteIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Some case notes were not found or do not belong to the specified user'
                ], 404);
            }

            $verifiedCount = 0;
            $alreadyVerified = 0;

            foreach ($caseNotes as $caseNote) {
                if ($caseNote->is_received) {
                    $alreadyVerified++;
                    continue;
                }

                // Mark as received with on behalf information
                $caseNote->markAsReceivedOnBehalf($currentUser->id, $onBehalfOfUserId, $verificationNotes);

                $verifiedCount++;
            }

            DB::commit();

            Log::info('Case notes verified on behalf:', [
                'verifying_user_id' => $currentUser->id,
                'on_behalf_of_user_id' => $onBehalfOfUserId,
                'case_note_ids' => $caseNoteIds,
                'verified_count' => $verifiedCount,
                'already_verified_count' => $alreadyVerified,
                'verification_notes' => $verificationNotes,
            ]);

            $message = "Successfully verified receipt of {$verifiedCount} case note(s) on behalf of {$targetUser->name}.";
            if ($alreadyVerified > 0) {
                $message .= " {$alreadyVerified} case note(s) were already verified.";
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'verified_count' => $verifiedCount,
                'already_verified_count' => $alreadyVerified,
                'total_processed' => $verifiedCount + $alreadyVerified,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error verifying case notes on behalf:', [
                'verifying_user_id' => $currentUser->id,
                'on_behalf_of_user_id' => $request->on_behalf_of_user_id,
                'case_note_ids' => $caseNoteIds ?? [],
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to verify case notes on behalf: ' . $e->getMessage()
            ], 500);
        }
    }
}
