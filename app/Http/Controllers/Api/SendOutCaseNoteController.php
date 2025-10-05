<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SendOutCaseNote;
use App\Models\Request;
use App\Models\User;
use App\Models\Department;
use App\Models\Doctor;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class SendOutCaseNoteController extends Controller
{
    /**
     * Get available case notes for sending out
     */
    public function getAvailableCaseNotes(HttpRequest $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check if user has CA role
            if (!$user->hasRole('CA')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. Only CA users can send out case notes.'
                ], 403);
            }

            // Get case notes that are available for sending out (same as returnable case notes)
            // Use the same logic as the returnable case notes endpoint
            $caseNotes = Request::with([
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

            Log::info('Send out available case notes debug:', [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'total_case_notes_before_filter' => $caseNotes->count(),
                'case_note_ids' => $caseNotes->pluck('id')->toArray()
            ]);

            // Filter case notes that can be returned
            $availableCaseNotes = $caseNotes->filter(function($caseNote) {
                $canBeReturned = $caseNote->canBeReturned();
                if (!$canBeReturned) {
                    Log::info('Case note cannot be returned:', [
                        'case_note_id' => $caseNote->id,
                        'status' => $caseNote->status,
                        'is_received' => $caseNote->is_received,
                        'is_returned' => $caseNote->is_returned,
                        'is_rejected_return' => $caseNote->is_rejected_return,
                        'is_sent_out' => $caseNote->is_sent_out
                    ]);
                }
                return $canBeReturned;
            });

            Log::info('Send out available case notes after filter:', [
                'user_id' => $user->id,
                'available_count' => $availableCaseNotes->count(),
                'available_ids' => $availableCaseNotes->pluck('id')->toArray()
            ]);

            return response()->json([
                'success' => true,
                'case_notes' => $availableCaseNotes->values()->toArray()
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting available case notes for send out:', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get available case notes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get CA users for sending out
     */
    public function getCAUsers(HttpRequest $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check if user has CA role
            if (!$user->hasRole('CA')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. Only CA users can access this feature.'
                ], 403);
            }

            // Get all CA users except the current user
            $caUsers = User::whereHas('roles', function($query) {
                $query->where('name', 'CA');
            })
            ->where('id', '!=', $user->id)
            ->where('is_active', true)
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

            return response()->json([
                'success' => true,
                'users' => $caUsers
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting CA users for send out:', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get CA users: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send out case notes to another CA
     */
    public function sendOutCaseNotes(HttpRequest $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check if user has CA role
            if (!$user->hasRole('CA')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. Only CA users can send out case notes.'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'sent_to_user_id' => 'required|integer|exists:users,id',
                'department_id' => 'required|integer|exists:departments,id',
                'doctor_id' => 'required|integer|exists:doctors,id',
                'case_note_ids' => 'required|array|min:1|max:20',
                'case_note_ids.*' => 'required|integer|exists:requests,id',
                'notes' => 'nullable|string|max:1000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $sentToUserId = $request->sent_to_user_id;
            $departmentId = $request->department_id;
            $doctorId = $request->doctor_id;
            $caseNoteIds = $request->case_note_ids;
            $notes = $request->notes;

            // Validate that the target user is a CA
            $targetUser = User::whereHas('roles', function($query) {
                $query->where('name', 'CA');
            })->find($sentToUserId);

            if (!$targetUser) {
                return response()->json([
                    'success' => false,
                    'message' => 'Target user must be a CA user.'
                ], 422);
            }

            // Validate that all case notes belong to the current user and are available for sending
            $caseNotes = Request::whereIn('id', $caseNoteIds)
                ->where('current_pic_user_id', $user->id)
                ->where('status', Request::STATUS_APPROVED)
                ->where('is_received', true)
                ->where('is_returned', false)
                ->where('is_rejected_return', false)
                ->get();

            if ($caseNotes->count() !== count($caseNoteIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Some case notes are not available for sending out.'
                ], 422);
            }

            DB::beginTransaction();

            try {
                // Create send out record
                $sendOut = SendOutCaseNote::create([
                    'send_out_number' => SendOutCaseNote::generateSendOutNumber(),
                    'sent_by_user_id' => $user->id,
                    'sent_to_user_id' => $sentToUserId,
                    'department_id' => $departmentId,
                    'doctor_id' => $doctorId,
                    'case_note_ids' => $caseNoteIds,
                    'case_note_count' => count($caseNoteIds),
                    'status' => SendOutCaseNote::STATUS_PENDING,
                    'notes' => $notes,
                    'sent_at' => now(),
                ]);

                // Update case notes to reflect they are sent out
                // Get department and doctor names once to avoid multiple queries
                $department = Department::find($departmentId);
                $doctor = $doctorId ? Doctor::find($doctorId) : null;

                foreach ($caseNotes as $caseNote) {
                    // Mark as sent out and link to send out record
                    $caseNote->update([
                        'is_sent_out' => true,
                        'send_out_id' => $sendOut->id,
                    ]);

                    // Create timeline event for each case note
                    $caseNote->events()->create([
                        'type' => 'sent_out',
                        'actor_user_id' => $user->id,
                        'occurred_at' => now(),
                        'reason' => "Case note sent out to {$targetUser->name}" .
                                   ($department ? " - {$department->name}" : '') .
                                   ($doctor ? " ({$doctor->name})" : '') .
                                   ($notes ? " - Note: {$notes}" : ''),
                        'metadata' => [
                            'sent_by_user_id' => $user->id,
                            'sent_by_user_name' => $user->name,
                            'sent_to_user_id' => $sentToUserId,
                            'sent_to_user_name' => $targetUser->name,
                            'send_out_number' => $sendOut->send_out_number,
                            'department_id' => $departmentId,
                            'department_name' => $department ? $department->name : null,
                            'doctor_id' => $doctorId,
                            'doctor_name' => $doctor ? $doctor->name : null,
                            'sent_at' => now()->toDateTimeString(),
                            'notes' => $notes,
                        ]
                    ]);
                }

                DB::commit();

                Log::info('Case notes sent out successfully:', [
                    'send_out_id' => $sendOut->id,
                    'send_out_number' => $sendOut->send_out_number,
                    'sent_by_user_id' => $user->id,
                    'sent_to_user_id' => $sentToUserId,
                    'case_note_count' => count($caseNoteIds),
                    'case_note_ids' => $caseNoteIds,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Case notes sent out successfully',
                    'send_out' => $sendOut
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Error sending out case notes:', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send out case notes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get received case notes for a CA
     */
    public function getReceivedCaseNotes(HttpRequest $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check if user has CA role
            if (!$user->hasRole('CA')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. Only CA users can access this feature.'
                ], 403);
            }

            $receivedSendOuts = SendOutCaseNote::where('sent_to_user_id', $user->id)
                ->where('status', SendOutCaseNote::STATUS_PENDING)
                ->with(['sentBy', 'department', 'doctor'])
                ->orderBy('sent_at', 'desc')
                ->get();

            // Group by sender
            $groupedBySender = $receivedSendOuts->groupBy('sent_by_user_id')->map(function ($items, $senderId) {
                $sender = $items->first()->sentBy;
                $totalCaseNotes = $items->sum(function ($sendOut) {
                    return count($sendOut->case_note_ids);
                });

                Log::info('Received case notes debug:', [
                    'user_id' => Auth::id(),
                    'sender_id' => $sender->id,
                    'sender_name' => $sender->name,
                    'pending_send_outs' => $items->count(),
                    'total_case_notes' => $totalCaseNotes,
                    'case_note_ids' => $items->pluck('case_note_ids')->flatten()->toArray()
                ]);

                return [
                    'sender_id' => $sender->id,
                    'sender_name' => $sender->name,
                    'sender_email' => $sender->email, // Added missing field
                    'pending_case_notes' => $totalCaseNotes, // Fixed field name
                    'send_out_count' => $items->count(), // Added missing field
                    'latest_send_out_date' => $items-> max('sent_at'),
                    'send_outs' => $items->map(function ($sendOut) {
                        return [
                            'id' => $sendOut->id,
                            'send_out_number' => $sendOut->send_out_number,
                            'case_note_ids' => $sendOut->case_note_ids,
                            'department_name' => $sendOut->department->name,
                            'doctor_name' => $sendOut->doctor ? $sendOut->doctor->name : 'N/A',
                            'notes' => $sendOut->notes,
                            'sent_at' => $sendOut->sent_at,
                        ];
                    })
                ];
            })->values();

            return response()->json([
                'success' => true,
                'received_case_notes' => $groupedBySender
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting received case notes:', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get received case notes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get case notes from a specific sender
     */
    public function getCaseNotesFromSender(HttpRequest $request, $senderId): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check if user has CA role
            if (!$user->hasRole('CA')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. Only CA users can access this feature.'
                ], 403);
            }

            $sender = User::find($senderId);
            if (!$sender) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sender not found.'
                ], 404);
            }

            $pendingSendOuts = SendOutCaseNote::where('sent_to_user_id', $user->id)
                ->where('sent_by_user_id', $senderId)
                ->where('status', SendOutCaseNote::STATUS_PENDING)
                ->with(['department', 'doctor'])
                ->get();

            $caseNoteIds = $pendingSendOuts->pluck('case_note_ids')->flatten()->unique()->toArray();

            $caseNotes = Request::whereIn('id', $caseNoteIds)
                ->with(['patient', 'department', 'doctor'])
                ->get()
                ->map(function ($caseNote) use ($pendingSendOuts) {
                    // Find the specific send-out record that contains this case note
                    $sendOutRecord = $pendingSendOuts->first(function ($sendOut) use ($caseNote) {
                        return in_array($caseNote->id, $sendOut->case_note_ids);
                    });

                    return [
                        'id' => $caseNote->id,
                        'request_number' => $caseNote->request_number,
                        'patient' => [
                            'id' => $caseNote->patient->id,
                            'name' => $caseNote->patient->name,
                            'mrn' => $caseNote->patient->mrn,
                            'nric' => $caseNote->patient->nric ?? null,
                        ],
                        'department' => [
                            'id' => $sendOutRecord->department->id,
                            'name' => $sendOutRecord->department->name,
                        ],
                        'doctor' => $sendOutRecord->doctor ? [
                            'id' => $sendOutRecord->doctor->id,
                            'name' => $sendOutRecord->doctor->name,
                        ] : null,
                        'purpose' => $caseNote->purpose,
                        'notes' => $sendOutRecord->notes,
                        'sent_at' => $sendOutRecord->sent_at,
                        'created_at' => $sendOutRecord->sent_at, // Use sent_at as created_at for display
                        'send_out_number' => $sendOutRecord->send_out_number,
                        'is_acknowledged' => false, // Fixed field name
                    ];
                });

            Log::info('Case notes from sender debug:', [
                'user_id' => Auth::id(),
                'sender_id' => $senderId,
                'sender_name' => $sender->name,
                'pending_send_outs_count' => $pendingSendOuts->count(),
                'case_note_ids_expectted' => $caseNoteIds,
                'case_notes_returned_count' => $caseNotes->count()
            ]);

            return response()->json([
                'success' => true,
                'case_notes' => $caseNotes,
                'sender' => $sender
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting case notes from sender:', [
                'user_id' => Auth::id(),
                'sender_id' => $senderId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get case notes from sender: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Acknowledge received case notes
     */
    public function acknowledgeCaseNotes(HttpRequest $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check if user has CA role
            if (!$user->hasRole('CA')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. Only CA users can acknowledge case notes.'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'case_note_ids' => 'required|array|min:1',
                'case_note_ids.*' => 'required|integer|exists:requests,id',
                'acknowledgment_notes' => 'nullable|string|max:1000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $caseNoteIds = $request->case_note_ids;
            $acknowledgmentNotes = $request->acknowledgment_notes;

            // Debug logging
            Log::info('Acknowledge case notes request:', [
                'user_id' => $user->id,
                'case_note_ids' => $caseNoteIds,
                'acknowledgment_notes' => $acknowledgmentNotes,
            ]);

            // Get the send outs that contain these case notes
            $sendOuts = SendOutCaseNote::where('sent_to_user_id', $user->id)
                ->where('status', SendOutCaseNote::STATUS_PENDING)
                ->with(['sentBy', 'department', 'doctor'])
                ->get();

            $sendOutsToUpdate = [];
            foreach ($sendOuts as $sendOut) {
                $intersection = array_intersect($sendOut->case_note_ids, $caseNoteIds);
                if (!empty($intersection)) {
                    $sendOutsToUpdate[] = $sendOut;
                }
            }

            if (empty($sendOutsToUpdate)) {
                Log::warning('No valid send outs found for case notes:', [
                    'user_id' => $user->id,
                    'case_note_ids' => $caseNoteIds,
                    'available_send_outs' => $sendOuts->map(function($so) {
                        return [
                            'id' => $so->id,
                            'case_note_ids' => $so->case_note_ids,
                            'status' => $so->status,
                        ];
                    })->toArray()
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'No valid send outs found for the provided case notes.'
                ], 422);
            }

            DB::beginTransaction();

            try {
                foreach ($sendOutsToUpdate as $sendOut) {
                    $intersection = array_intersect($sendOut->case_note_ids, $caseNoteIds);
                    $newlyAcknowledged = array_diff($intersection, $sendOut->acknowledged_case_note_ids ?? []);

                    if (!empty($newlyAcknowledged)) {
                        // Update acknowledged case note IDs
                        $currentAcknowledged = $sendOut->acknowledged_case_note_ids ?? [];
                        $updatedAcknowledged = array_unique(array_merge($currentAcknowledged, $newlyAcknowledged));

                        $sendOut->update([
                            'acknowledged_case_note_ids' => $updatedAcknowledged,
                            'acknowledgment_notes' => $acknowledgmentNotes,
                        ]);

                        // Check if all case notes in this send out are acknowledged
                        if (count($updatedAcknowledged) === count($sendOut->case_note_ids)) {
                            $sendOut->update([
                                'status' => SendOutCaseNote::STATUS_ACKNOWLEDGED,
                                'acknowledged_at' => now(),
                                'acknowledged_by_user_id' => $user->id,
                            ]);
                        }

                        // Transfer ownership and create timeline events for each newly acknowledged case note
                        foreach ($newlyAcknowledged as $caseNoteId) {
                            $caseNote = Request::find($caseNoteId);
                            if ($caseNote) {
                                // Transfer current PIC to the acknowledging user and clear send-out flags
                                $caseNote->update([
                                    'current_pic_user_id' => $user->id,
                                    'is_sent_out' => false,
                                    'send_out_id' => null,
                                ]);

                                // Get sender information from the send-out record
                                $sender = $sendOut->sentBy;

                                $caseNote->events()->create([
                                    'type' => 'acknowledged_received',
                                    'actor_user_id' => $user->id,
                                    'occurred_at' => now(),
                                    'reason' => "Case note acknowledged as received from {$sender->name}" .
                                               ($sendOut->department ? " - {$sendOut->department->name}" : '') .
                                               ($sendOut->doctor ? " ({$sendOut->doctor->name})" : '') .
                                               ($acknowledgmentNotes ? " - Note: {$acknowledgmentNotes}" : ''),
                                    'metadata' => [
                                        'acknowledged_by_user_id' => $user->id,
                                        'acknowledged_by_user_name' => $user->name,
                                        'sent_by_user_id' => $sendOut->sent_by_user_id,
                                        'sent_by_user_name' => $sender->name,
                                        'send_out_number' => $sendOut->send_out_number,
                                        'department_id' => $sendOut->department_id,
                                        'department_name' => $sendOut->department ? $sendOut->department->name : null,
                                        'doctor_id' => $sendOut->doctor_id,
                                        'doctor_name' => $sendOut->doctor ? $sendOut->doctor->name : null,
                                        'acknowledged_at' => now()->toDateTimeString(),
                                        'acknowledgment_notes' => $acknowledgmentNotes,
                                        'original_sent_at' => $sendOut->sent_at,
                                    ]
                                ]);
                            }
                        }
                    }
                }

                DB::commit();

                Log::info('Case notes acknowledged successfully:', [
                    'user_id' => $user->id,
                    'case_note_ids' => $caseNoteIds,
                    'send_out_count' => count($sendOutsToUpdate),
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Case notes acknowledged successfully',
                    'acknowledged_count' => count($caseNoteIds)
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Error acknowledging case notes:', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to acknowledge case notes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get send out history for a CA
     */
    public function getSendOutHistory(HttpRequest $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check if user has CA role
            if (!$user->hasRole('CA')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. Only CA users can access this feature.'
                ], 403);
            }

            $type = $request->get('type', 'sent'); // 'sent' or 'received'

            if ($type === 'sent') {
                $sendOuts = SendOutCaseNote::where('sent_by_user_id', $user->id)
                    ->with(['sentTo', 'department', 'doctor'])
                    ->orderBy('sent_at', 'desc')
                    ->get();
            } else {
                $sendOuts = SendOutCaseNote::where('sent_to_user_id', $user->id)
                    ->with(['sentBy', 'department', 'doctor'])
                    ->orderBy('sent_at', 'desc')
                    ->get();
            }


            // Manually include the sentTo relationship data
            $sendOutsData = $sendOuts->map(function($sendOut) {
                $data = $sendOut->toArray();
                if ($sendOut->sentTo) {
                    $data['sentTo'] = [
                        'id' => $sendOut->sentTo->id,
                        'name' => $sendOut->sentTo->name,
                        'email' => $sendOut->sentTo->email,
                    ];
                }
                if ($sendOut->sentBy) {
                    $data['sentBy'] = [
                        'id' => $sendOut->sentBy->id,
                        'name' => $sendOut->sentBy->name,
                        'email' => $sendOut->sentBy->email,
                    ];
                }
                return $data;
            });

            return response()->json([
                'success' => true,
                'send_outs' => $sendOutsData
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting send out history:', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get send out history: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get send out details (case notes in a specific send out)
     */
    public function getSendOutDetails(HttpRequest $request, int $sendOutId): JsonResponse
    {
        try {
            $user = Auth::user();

            // Check if user has CA role
            if (!$user->hasRole('CA')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. Only CA users can access this endpoint.'
                ], 403);
            }

            // Get the send out record
            $sendOut = SendOutCaseNote::where('id', $sendOutId)
                ->where('sent_by_user_id', $user->id) // Only allow access to own send outs
                ->first();

            if (!$sendOut) {
                return response()->json([
                    'success' => false,
                    'message' => 'Send out record not found or access denied'
                ], 404);
            }

            // Get the case notes that were sent out
            $caseNotes = Request::whereIn('id', $sendOut->case_note_ids ?? [])
                ->with(['patient', 'department', 'doctor'])
                ->get();

            return response()->json([
                'success' => true,
                'case_notes' => $caseNotes
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting send out details:', [
                'user_id' => Auth::id(),
                'send_out_id' => $sendOutId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get send out details: ' . $e->getMessage()
            ], 500);
        }
    }
}
