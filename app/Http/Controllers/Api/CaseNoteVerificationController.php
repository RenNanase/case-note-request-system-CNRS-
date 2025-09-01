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
}
