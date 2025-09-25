<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Request;
use App\Models\RequestEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class CaseNoteTimelineController extends Controller
{
    /**
     * Search case notes by patient name, MRN, or nationality ID
     */
    public function search(HttpRequest $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('MR_STAFF', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Medical Records Staff can access this endpoint'
            ], 403);
        }

        $query = $request->get('q');

        if (empty($query)) {
            return response()->json([
                'success' => false,
                'message' => 'Search query is required'
            ], 400);
        }

        try {
            $caseNotes = Request::with([
                'patient',
                'department',
                'doctor',
                'location',
                'requestedBy',
                'approvedBy',
                'completedBy',
                'receivedBy',
                'currentPIC'
            ])
            ->where(function ($q) use ($query) {
                $q->whereHas('patient', function ($patientQuery) use ($query) {
                    $patientQuery->where('name', 'LIKE', "%{$query}%")
                                ->orWhere('mrn', 'LIKE', "%{$query}%")
                                ->orWhere('nationality_id', 'LIKE', "%{$query}%");
                })
                ->orWhere('request_number', 'LIKE', "%{$query}%");
            })
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

            Log::info('Case notes search performed', [
                'user_id' => $user->id,
                'query' => $query,
                'results_count' => $caseNotes->count()
            ]);

            return response()->json([
                'success' => true,
                'case_notes' => $caseNotes,
            ]);

        } catch (\Exception $e) {
            Log::error('Error searching case notes', [
                'user_id' => $user->id,
                'query' => $query,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to search case notes'
            ], 500);
        }
    }

    /**
     * Get timeline events for a specific case note
     */
    public function getTimeline(int $caseNoteId): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('MR_STAFF', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Medical Records Staff can access this endpoint'
            ], 403);
        }

        try {
            // Verify case note exists
            $caseNote = Request::find($caseNoteId);

            if (!$caseNote) {
                return response()->json([
                    'success' => false,
                    'message' => 'Case note not found'
                ], 404);
            }

            // Get all timeline events for this case note
            $events = RequestEvent::with(['actor.roles'])
                ->where('request_id', $caseNoteId)
                ->orderBy('occurred_at', 'asc') // Show events in chronological order
                ->get();

            // Additional verification - check if the query is working correctly
            $eventCount = RequestEvent::where('request_id', $caseNoteId)->count();
            $totalEventCount = RequestEvent::count();

            // Debug logging to help identify the issue
            Log::info('Timeline events query debug', [
                'case_note_id' => $caseNoteId,
                'query_condition' => 'request_id = ' . $caseNoteId,
                'raw_events_count' => $events->count(),
                'total_events_in_db' => $totalEventCount,
                'events_for_this_request' => $eventCount,
                'raw_events' => $events->map(function ($event) {
                    return [
                        'id' => $event->id,
                        'request_id' => $event->request_id,
                        'type' => $event->type,
                        'actor_user_id' => $event->actor_user_id,
                        'occurred_at' => $event->occurred_at,
                        'metadata' => $event->metadata
                    ];
                })->toArray()
            ]);

            // Verify that all events belong to the correct request
            $incorrectEvents = $events->filter(function ($event) use ($caseNoteId) {
                return $event->request_id != $caseNoteId;
            });

            if ($incorrectEvents->count() > 0) {
                Log::error('Found events with incorrect request_id', [
                    'case_note_id' => $caseNoteId,
                    'incorrect_events' => $incorrectEvents->toArray()
                ]);
            }

            $events = $events->map(function ($event) {
                return [
                    'id' => $event->id,
                    'event_type' => $event->type, // Map 'type' to 'event_type' for frontend
                    'description' => $this->formatEventDescription($event),
                    'created_at' => $event->occurred_at->toISOString(), // Use occurred_at instead of created_at
                    'user' => [
                        'id' => $event->actor->id,
                        'name' => $event->actor->name,
                        'role' => $event->actor->roles->first()?->name ?? 'Unknown'
                    ],
                    'metadata' => $this->cleanMetadata($event->metadata, $event->type)
                ];
            });

            // Also add a "created" event if it doesn't exist
            $hasCreatedEvent = $events->contains('event_type', 'created');
            if (!$hasCreatedEvent) {
                $events->prepend([
                    'id' => 'created_' . $caseNote->id,
                    'event_type' => 'created',
                    'description' => 'Case note request created',
                    'created_at' => $caseNote->created_at->toISOString(),
                    'user' => [
                        'id' => $caseNote->requestedBy->id,
                        'name' => $caseNote->requestedBy->name,
                        'role' => $caseNote->requestedBy->roles->first()?->name ?? 'CA'
                    ],
                    'metadata' => [
                        'request_number' => $caseNote->request_number,
                        'purpose' => $caseNote->purpose
                    ]
                ]);
            }

            Log::info('Case note timeline retrieved', [
                'user_id' => $user->id,
                'case_note_id' => $caseNoteId,
                'events_count' => $events->count()
            ]);

            return response()->json([
                'success' => true,
                'events' => $events,
            ]);

        } catch (\Exception $e) {
            Log::error('Error retrieving case note timeline', [
                'user_id' => $user->id,
                'case_note_id' => $caseNoteId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve timeline events'
            ], 500);
        }
    }

    /**
     * Update existing timeline events with doctor information
     */
    public function updateExistingEventsWithDoctorInfo(): JsonResponse
    {
        try {
            $updatedCount = 0;

            // Get all events that don't have doctor information
            $events = RequestEvent::where('type', 'created')
                ->orWhere('type', 'handover_requested')
                ->get();

            foreach ($events as $event) {
                $request = Request::find($event->request_id);
                if ($request && $request->doctor_id) {
                    $doctor = \App\Models\Doctor::find($request->doctor_id);
                    if ($doctor) {
                        $metadata = $event->metadata ?? [];
                        $metadata['doctor_id'] = $request->doctor_id;
                        $metadata['doctor_name'] = $doctor->name;

                        $event->update(['metadata' => $metadata]);
                        $updatedCount++;
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => "Updated {$updatedCount} timeline events with doctor information",
                'updated_count' => $updatedCount
            ]);

        } catch (\Exception $e) {
            Log::error('Error updating timeline events with doctor info:', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update timeline events: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Format event description based on event type
     */
    private function formatEventDescription(RequestEvent $event): string
    {
        $metadata = $event->metadata ?? [];

        switch ($event->type) {
            case 'created':
                $doctorName = $metadata['doctor_name'] ?? null;
                $departmentName = $metadata['department_name'] ?? null;
                $locationName = $metadata['location_name'] ?? null;
                $purpose = $metadata['purpose'] ?? null;

                $description = 'Case note request created';
                if ($doctorName) {
                    $description .= " for {$doctorName}";
                }
                if ($departmentName) {
                    $description .= " | Department: {$departmentName}";
                }
                if ($locationName && $locationName !== 'No specific location') {
                    $description .= " | Location: {$locationName}";
                }
                if ($purpose) {
                    $description .= " | Purpose: {$purpose}";
                }
                return $description;

            case 'approved':
                $approver = $metadata['approved_by_name'] ?? $event->actor->name ?? 'Unknown';
                $notes = $metadata['approval_remarks'] ?? $event->reason ?? '';
                return "Case note approved by {$approver}" . ($notes ? " - {$notes}" : '');

            case 'rejected':
                $rejecter = $metadata['rejected_by_name'] ?? $event->actor->name ?? 'Unknown';
                $reason = $metadata['rejection_reason'] ?? $event->reason ?? '';
                return "Case note rejected by {$rejecter}" . ($reason ? " - {$reason}" : '');

            case 'handover_requested':
                $from = $metadata['requested_by_name'] ?? $event->actor->name ?? 'Unknown';
                $to = $metadata['current_holder_name'] ?? 'Unknown';
                $reason = $metadata['reason'] ?? $event->reason ?? '';
                $doctorName = $metadata['doctor_name'] ?? null;
                $departmentName = $metadata['department_name'] ?? null;
                $locationName = $metadata['location_name'] ?? null;

                $description = "Handover requested from {$from} to {$to}";
                if ($doctorName) {
                    $description .= " for {$doctorName}";
                }
                if ($departmentName) {
                    $description .= " | Department: {$departmentName}";
                }
                if ($locationName && $locationName !== 'No specific location') {
                    $description .= " | Location: {$locationName}";
                }
                return $description . ($reason ? " - {$reason}" : '');

            case 'handover_approved':
                $approver = $metadata['approved_by_name'] ?? $event->actor->name ?? 'Unknown';
                $notes = $metadata['notes'] ?? $event->reason ?? '';
                $newDoctorName = $metadata['new_doctor_name'] ?? null;
                $newDepartmentName = $metadata['new_department_name'] ?? null;

                $description = "Handover approved by {$approver}";
                if ($newDoctorName) {
                    $description .= " - New doctor: {$newDoctorName}";
                }
                if ($newDepartmentName) {
                    $description .= " - New department: {$newDepartmentName}";
                }
                return $description . ($notes ? " - {$notes}" : '');

            case 'handover_rejected':
                $rejecter = $metadata['rejected_by_name'] ?? $event->actor->name ?? 'Unknown';
                $notes = $metadata['notes'] ?? $event->reason ?? '';
                return "Handover rejected by {$rejecter}" . ($notes ? " - {$notes}" : '');

            case 'handed_over':
                $from = $metadata['handed_over_from_user_name'] ?? $event->actor->name ?? 'Unknown';
                $to = $metadata['handed_over_to_user_name'] ?? 'Unknown';
                $reason = $metadata['handover_reason'] ?? $event->reason ?? '';
                $doctorName = $metadata['handover_doctor_name'] ?? null;
                $description = "Case note handed over from {$from} to {$to}";
                if ($doctorName) {
                    $description .= " for {$doctorName}";
                }
                return $description . ($reason ? " - {$reason}" : '');

            case 'acknowledged':
                $acknowledger = $metadata['acknowledged_by_name'] ?? $event->actor->name ?? 'Unknown';
                $notes = $metadata['verification_notes'] ?? $event->reason ?? '';
                return "Case note acknowledged by {$acknowledger}" . ($notes ? " - {$notes}" : '');

            case 'received':
                $receiver = $metadata['received_by_name'] ?? $event->actor->name ?? 'Unknown';
                $notes = $metadata['verification_notes'] ?? $event->reason ?? '';
                return "Case note received by {$receiver}" . ($notes ? " - {$notes}" : '');

            case 'completed':
                $completer = $metadata['completed_by_name'] ?? $event->actor->name ?? 'Unknown';
                $notes = $metadata['completion_notes'] ?? $event->reason ?? '';
                $locationName = $metadata['location_name'] ?? null;

                $description = "Case note completed by {$completer}";
                if ($locationName) {
                    $description .= " | Location: {$locationName}";
                }
                return $description . ($notes ? " - {$notes}" : '');

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
                $verificationNotes = $metadata['verification_notes'] ?? '';
                $doctorName = $metadata['doctor_name'] ?? null;
                $departmentName = $metadata['department_name'] ?? null;
                $locationName = $metadata['location_name'] ?? null;

                $description = "Handover verified by {$verifiedBy}";
                if ($doctorName) {
                    $description .= " for {$doctorName}";
                }
                if ($departmentName) {
                    $description .= " | Department: {$departmentName}";
                }
                if ($locationName && $locationName !== 'No specific location') {
                    $description .= " | Location: {$locationName}";
                }
                return $description . ($verificationNotes ? " - {$verificationNotes}" : '');

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
                $locationName = $metadata['location_name'] ?? null;

                $description = "Returned case note verified by {$verifiedBy} - marked as Complete";
                if ($locationName) {
                    $description .= " | Location: {$locationName}";
                }
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
            'acknowledger' => ['acknowledged_by_name'],
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
}
