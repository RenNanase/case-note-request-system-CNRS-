<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CaseNoteHandover;
use App\Models\Request as CaseNoteRequest;
use App\Models\User;
use App\Models\Department;
use App\Models\Location;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Models\Doctor;

class HandoverController extends Controller
{
    // Handover status constants
    const STATUS_PENDING = 'pending';
    const STATUS_ACKNOWLEDGED = 'acknowledged';
    const STATUS_COMPLETED = 'completed';
    const STATUS_OVERDUE = 'overdue';
    const STATUS_ESCALATED = 'escalated';
    const STATUS_VERIFIED = 'verified'; // Added for receipt verification

    // Time constants (in hours)
    const REMINDER_HOURS = 3;
    const OVERDUE_HOURS = 6;
    const ESCALATION_HOURS = 24;

    /**
     * Create a new handover
     */
    public function store(HttpRequest $request): JsonResponse
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'case_note_request_id' => 'required|exists:requests,id',
            'handed_over_to_user_id' => 'required|exists:users,id',
            'department_id' => 'required|exists:departments,id',
            'location_id' => 'nullable|exists:locations,id',
            'handover_reason' => 'required|string|max:1000',
            'additional_notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = Auth::user();
        $caseNoteRequest = CaseNoteRequest::find($request->case_note_request_id);
        $newPIC = User::find($request->handed_over_to_user_id);

        // Check permissions
        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can create handovers'
            ], 403);
        }

        // Verify the new PIC is also a CA
        if (!$newPIC->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Person in Charge must be a Clinic Assistant'
            ], 403);
        }

        // Check if user can handover this request
        if ($caseNoteRequest->requested_by_user_id !== $user->id &&
            $caseNoteRequest->current_pic_user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You can only handover requests you own or are currently responsible for'
            ], 403);
        }

        // Check if request is in a handoverable state
        if ($caseNoteRequest->status !== CaseNoteRequest::STATUS_APPROVED || !$caseNoteRequest->is_received) {
            return response()->json([
                'success' => false,
                'message' => 'Request must be approved and received (verified) to be handed over'
            ], 400);
        }

        // Check if there's already a pending handover
        if ($caseNoteRequest->handover_status === 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'This case note already has a pending handover'
            ], 400);
        }

        try {
            DB::beginTransaction();

            // Create the handover
            $handover = CaseNoteHandover::create([
                'case_note_request_id' => $request->case_note_request_id,
                'handed_over_by_user_id' => $user->id,
                'handed_over_to_user_id' => $request->handed_over_to_user_id,
                'department_id' => $request->department_id,
                'location_id' => $request->location_id,
                'handover_reason' => $request->handover_reason,
                'additional_notes' => $request->additional_notes,
                'status' => self::STATUS_PENDING,
            ]);

            // Update the case note request
            $caseNoteRequest->update([
                'current_handover_id' => $handover->id,
                'current_pic_user_id' => $request->handed_over_to_user_id,
                'handover_status' => 'pending_acknowledgement',
                'handover_pending_since' => now(),
            ]);

            // Create timeline event for the handover
            $this->createHandoverTimelineEvent($caseNoteRequest, $handover, $user, $newPIC);

            DB::commit();

            Log::info('Case note handover created successfully', [
                'handover_id' => $handover->id,
                'request_id' => $caseNoteRequest->id,
                'from_user' => $user->id,
                'to_user' => $request->handed_over_to_user_id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Case note handover created successfully',
                'handover' => $handover->load(['handedOverTo', 'department', 'location']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating handover:', [
                'request_id' => $request->case_note_request_id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create handover: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify handover case note received
     */
    public function verifyReceived(HttpRequest $request, $handoverId): JsonResponse
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
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
        $handover = CaseNoteHandover::with(['caseNoteRequest', 'handedOverTo'])->find($handoverId);

        if (!$handover) {
            return response()->json([
                'success' => false,
                'message' => 'Handover not found'
            ], 404);
        }

        // Check if user is the intended recipient
        if ($handover->handed_over_to_user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You can only verify handovers assigned to you'
            ], 403);
        }

        // Check if handover is still pending
        if ($handover->status !== self::STATUS_PENDING) {
            return response()->json([
                'success' => false,
                'message' => 'This handover has already been processed'
            ], 400);
        }

        try {
            DB::beginTransaction();

            // Update handover status
            $handover->update([
                'status' => self::STATUS_ACKNOWLEDGED,
                'acknowledged_at' => now(),
                'verification_notes' => $request->verification_notes,
            ]);

            // Update case note request
            $caseNoteRequest = $handover->caseNoteRequest;
            $caseNoteRequest->update([
                'handover_status' => 'acknowledged',
                'handover_acknowledged_at' => now(),
            ]);

            // Create timeline event for verification
            $this->createVerificationTimelineEvent($caseNoteRequest, $handover, $user);

            DB::commit();

            Log::info('Handover verified successfully', [
                'handover_id' => $handover->id,
                'request_id' => $caseNoteRequest->id,
                'verified_by' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Handover verified successfully',
                'handover' => $handover->load(['caseNoteRequest', 'handedOverTo']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error verifying handover:', [
                'handover_id' => $handoverId,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to verify handover: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify handover case note receipt by requesting CA
     */
    public function verifyReceipt(HttpRequest $request, $handoverId): JsonResponse
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'receipt_verification_notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = Auth::user();
        $handover = CaseNoteHandover::with(['caseNoteRequest', 'handedOverBy'])->find($handoverId);

        if (!$handover) {
            return response()->json([
                'success' => false,
                'message' => 'Handover not found'
            ], 404);
        }

        // Check if user is the one who originally requested the handover
        if ($handover->handed_over_by_user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You can only verify receipt of handovers you requested'
            ], 403);
        }

        // Check if handover has been acknowledged by the recipient
        if ($handover->status !== self::STATUS_ACKNOWLEDGED) {
            return response()->json([
                'success' => false,
                'message' => 'Handover must be acknowledged by the recipient before you can verify receipt'
            ], 400);
        }

        try {
            DB::beginTransaction();

            // Update handover status to completed
            $handover->update([
                'status' => self::STATUS_COMPLETED,
                'completed_at' => now(),
                'receipt_verification_notes' => $request->receipt_verification_notes,
            ]);

            // Update case note request
            $caseNoteRequest = $handover->caseNoteRequest;
            $caseNoteRequest->update([
                'handover_status' => 'completed',
                'handover_completed_at' => now(),
            ]);

            // Create timeline event for receipt verification
            $this->createReceiptVerificationTimelineEvent($caseNoteRequest, $handover, $user);

            DB::commit();

            Log::info('Handover receipt verified successfully', [
                'handover_id' => $handover->id,
                'request_id' => $caseNoteRequest->id,
                'verified_by' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Handover receipt verified successfully',
                'handover' => $handover->load(['caseNoteRequest', 'handedOverBy']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error verifying handover receipt:', [
                'handover_id' => $handoverId,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to verify handover receipt: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get pending handovers for current user
     */
    public function getPendingHandovers(): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access this endpoint'
            ], 403);
        }

        $pendingHandovers = CaseNoteHandover::with([
            'caseNoteRequest.patient',
            'caseNoteRequest.department',
            'handedOverBy',
            'department',
            'location'
        ])
        ->where('handed_over_to_user_id', $user->id)
        ->where('status', self::STATUS_PENDING)
        ->orderBy('created_at', 'desc')
        ->get()
        ->groupBy(function ($handover) {
            return $handover->created_at->format('Y-m-d');
        });

        return response()->json([
            'success' => true,
            'handovers' => $pendingHandovers,
        ]);
    }

    /**
     * Get handover history for current user (as sender)
     */
    public function getHandoverHistory(): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access this endpoint'
            ], 403);
        }

        $handovers = CaseNoteHandover::with([
            'caseNoteRequest.patient',
            'caseNoteRequest.department',
            'handedOverBy',
            'department',
            'location'
        ])
        ->where('handed_over_by_user_id', $user->id)
        ->orderBy('created_at', 'desc')
        ->get()
        ->map(function ($handover) {
            $handover->handover_date = $handover->created_at->format('Y-m-d');
            return $handover;
        });

        return response()->json([
            'success' => true,
            'handovers' => $handovers,
        ]);
    }

    /**
     * Get acknowledged handovers for current user (as receiver)
     */
    public function getAcknowledgedHandovers(): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access this endpoint'
            ], 403);
        }

        $acknowledgedHandovers = CaseNoteHandover::with([
            'caseNoteRequest.patient',
            'caseNoteRequest.department',
            'handedOverBy',
            'department',
            'location'
        ])
        ->where('handed_over_to_user_id', $user->id)
        ->where('status', self::STATUS_ACKNOWLEDGED)
        ->orderBy('acknowledged_at', 'desc')
        ->get()
        ->map(function ($handover) {
            $handover->time_since_acknowledgment = $handover->acknowledged_at->diffForHumans();
            return $handover;
        });

        return response()->json([
            'success' => true,
            'handovers' => $acknowledgedHandovers,
        ]);
    }

    /**
     * Get handover statistics
     */
    public function getHandoverStats(): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access this endpoint'
            ], 403);
        }

        $stats = [
            'sent' => CaseNoteHandover::where('handed_over_by_user_id', $user->id)->count(),
            'received' => CaseNoteHandover::where('handed_over_to_user_id', $user->id)->count(),
            'pending_verification' => CaseNoteHandover::where('handed_over_to_user_id', $user->id)
                ->where('status', self::STATUS_PENDING)->count(),
            'overdue' => CaseNoteHandover::where('handed_over_to_user_id', $user->id)
                ->where('status', self::STATUS_PENDING)
                ->where('created_at', '<=', now()->subHours(self::OVERDUE_HOURS))
                ->count(),
        ];

        return response()->json([
            'success' => true,
            'stats' => $stats,
        ]);
    }

    /**
     * Check if handover is overdue
     */
    private function isHandoverOverdue($handover): bool
    {
        return $handover->status === self::STATUS_PENDING &&
               $handover->created_at->diffInHours(now()) >= self::OVERDUE_HOURS;
    }

    /**
     * Create handover timeline event
     */
    private function createHandoverTimelineEvent($caseNoteRequest, $handover, $fromUser, $toUser): void
    {
        try {
            $department = Department::find($handover->department_id);
            $location = $handover->location_id ? Location::find($handover->location_id) : null;
            $doctor = $handover->handover_doctor_id ? Doctor::find($handover->handover_doctor_id) : null;

            $caseNoteRequest->events()->create([
                'type' => \App\Models\RequestEvent::TYPE_HANDED_OVER,
                'actor_user_id' => $fromUser->id,
                'reason' => "Case Note handed over from {$fromUser->name} to {$toUser->name}",
                'occurred_at' => now(),
                'metadata' => [
                    'handover_id' => $handover->id,
                    'handed_over_from_user_id' => $fromUser->id,
                    'handed_over_from_user_name' => $fromUser->name,
                    'handed_over_to_user_id' => $toUser->id,
                    'handed_over_to_user_name' => $toUser->name,
                    'handover_reason' => $handover->handover_reason,
                    'additional_notes' => $handover->additional_notes,
                    'department_id' => $handover->department_id,
                    'department_name' => $department ? $department->name : 'Unknown Department',
                    'location_id' => $handover->location_id,
                    'location_name' => $location ? $location->name : 'No specific location',
                    'handover_doctor_id' => $handover->handover_doctor_id,
                    'handover_doctor_name' => $doctor ? $doctor->name : null,
                    'handover_status' => self::STATUS_PENDING,
                    'handover_pending_since' => now()->toDateTimeString(),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create handover timeline event:', [
                'handover_id' => $handover->id,
                'request_id' => $caseNoteRequest->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Create verification timeline event
     */
    private function createVerificationTimelineEvent($caseNoteRequest, $handover, $verifiedByUser): void
    {
        try {
            $caseNoteRequest->events()->create([
                'type' => 'handover_verified',
                'actor_user_id' => $verifiedByUser->id,
                'reason' => "Handover verified by {$verifiedByUser->name}",
                'occurred_at' => now(),
                'metadata' => [
                    'handover_id' => $handover->id,
                    'verified_by_user_id' => $verifiedByUser->id,
                    'verified_by_user_name' => $verifiedByUser->name,
                    'verification_notes' => $handover->verification_notes,
                    'verified_at' => now()->toDateTimeString(),
                    'handover_status' => self::STATUS_ACKNOWLEDGED,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create verification timeline event:', [
                'handover_id' => $handover->id,
                'request_id' => $caseNoteRequest->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Process overdue handovers (called by scheduled command)
     */
    public function processOverdueHandovers(): void
    {
        $overdueHandovers = CaseNoteHandover::where('status', self::STATUS_PENDING)
            ->where('created_at', '<=', now()->subHours(self::OVERDUE_HOURS))
            ->get();

        foreach ($overdueHandovers as $handover) {
            $this->markHandoverAsOverdue($handover);
        }
    }

    /**
     * Mark handover as overdue
     */
    private function markHandoverAsOverdue($handover): void
    {
        $handover->update([
            'status' => self::STATUS_OVERDUE,
            'overdue_at' => now(),
        ]);

        // Create timeline event for overdue status
        $this->createOverdueTimelineEvent($handover);

        // TODO: Send notifications to both users and supervisors
        Log::info('Handover marked as overdue', [
            'handover_id' => $handover->id,
            'request_id' => $handover->case_note_request_id,
        ]);
    }

    /**
     * Create overdue timeline event
     */
    private function createOverdueTimelineEvent($handover): void
    {
        try {
            $caseNoteRequest = $handover->caseNoteRequest;
            $caseNoteRequest->events()->create([
                'type' => 'handover_overdue',
                'actor_user_id' => $handover->handed_over_to_user_id,
                'reason' => 'Handover verification overdue',
                'occurred_at' => now(),
                'metadata' => [
                    'handover_id' => $handover->id,
                    'overdue_at' => now()->toDateTimeString(),
                    'handover_status' => self::STATUS_OVERDUE,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create overdue timeline event:', [
                'handover_id' => $handover->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Get status label for a handover
     */
    private function getStatusLabel($status): string
    {
        switch ($status) {
            case self::STATUS_PENDING:
                return 'Pending';
            case self::STATUS_ACKNOWLEDGED:
                return 'Acknowledged';
            case self::STATUS_COMPLETED:
                return 'Completed';
            case self::STATUS_OVERDUE:
                return 'Overdue';
            case self::STATUS_ESCALATED:
                return 'Escalated';
            default:
                return 'Unknown';
        }
    }

    /**
     * Get verified handovers for current user (as sender)
     */
    public function getVerifiedHandovers(): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access this endpoint'
            ], 403);
        }

        $handovers = CaseNoteHandover::with([
            'caseNoteRequest.patient',
            'caseNoteRequest.department',
            'handedOverTo',
            'department',
            'location',
            'handoverDoctor'
        ])
        ->where('handed_over_by_user_id', $user->id)
        ->where('status', self::STATUS_VERIFIED)
        ->orderBy('verified_at', 'desc')
        ->get()
        ->groupBy(function ($handover) {
            return $handover->verified_at->format('Y-m-d');
        });

        return response()->json([
            'success' => true,
            'handovers' => $handovers,
        ]);
    }

    /**
     * Create receipt verification timeline event
     */
    private function createReceiptVerificationTimelineEvent($caseNoteRequest, $handover, $verifiedByUser): void
    {
        try {
            $caseNoteRequest->events()->create([
                'type' => 'handover_receipt_verified',
                'actor_user_id' => $verifiedByUser->id,
                'reason' => "Handover receipt verified by {$verifiedByUser->name}",
                'occurred_at' => now(),
                'metadata' => [
                    'handover_id' => $handover->id,
                    'verified_by_user_id' => $verifiedByUser->id,
                    'verified_by_user_name' => $verifiedByUser->name,
                    'receipt_verification_notes' => $handover->receipt_verification_notes,
                    'verified_at' => now()->toDateTimeString(),
                    'handover_status' => self::STATUS_COMPLETED,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create receipt verification timeline event:', [
                'handover_id' => $handover->id,
                'request_id' => $caseNoteRequest->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Get handovers that need verification by the requesting CA
     */
    public function getHandoversNeedingVerification(): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access this endpoint'
            ], 403);
        }

        $handovers = CaseNoteHandover::with([
            'caseNoteRequest.patient',
            'caseNoteRequest.department',
            'handedOverTo',
            'department',
            'location',
            'handoverDoctor'
        ])
        ->where('handed_over_by_user_id', $user->id)
        ->where('status', self::STATUS_ACKNOWLEDGED)
        ->orderBy('acknowledged_at', 'desc')
        ->get()
        ->groupBy(function ($handover) {
            return $handover->acknowledged_at->format('Y-m-d');
        });

        return response()->json([
            'success' => true,
            'handovers' => $handovers,
        ]);
    }

    /**
     * Get handovers that need verification by the receiving CA
     */
    public function getHandoversNeedingAcknowledgement(): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access this endpoint'
            ], 403);
        }

        $handovers = CaseNoteHandover::with([
            'caseNoteRequest.patient',
            'caseNoteRequest.department',
            'handedOverBy',
            'department',
            'location',
            'handoverDoctor'
        ])
        ->where('handed_over_to_user_id', $user->id)
        ->where('status', self::STATUS_PENDING)
        ->orderBy('created_at', 'desc')
        ->get()
        ->groupBy(function ($handover) {
            return $handover->created_at->format('Y-m-d');
        });

        return response()->json([
            'success' => true,
            'handovers' => $handovers,
        ]);
    }
}
