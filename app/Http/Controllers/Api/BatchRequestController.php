<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BatchRequest;
use App\Models\Request;
use App\Models\RequestEvent;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\User; // Added this import for User model
use App\Models\HandoverRequest; // Added this import for HandoverRequest model

class BatchRequestController extends Controller
{
    /**
     * Test endpoint to debug batch request loading
     */
    public function test(HttpRequest $request): JsonResponse
    {
        try {
            $user = Auth::user();

            Log::info('Testing batch request loading for user:', [
                'user_id' => $user->id,
                'user_roles' => $user->getRoleNames('api')
            ]);

            // Test 1: Basic BatchRequest model
            $basicCount = BatchRequest::count();
            Log::info('Basic BatchRequest count:', ['count' => $basicCount]);

            // Test 2: Simple query without relationships
            $simpleQuery = BatchRequest::select('id', 'batch_number', 'status', 'requested_by_user_id');
            if ($user->hasRole('CA', 'api')) {
                $simpleQuery->where('requested_by_user_id', $user->id);
            }
            $simpleResults = $simpleQuery->get();

            Log::info('Simple query results:', [
                'count' => $simpleResults->count(),
                'results' => $simpleResults->toArray()
            ]);

            return response()->json([
                'success' => true,
                'basic_count' => $basicCount,
                'simple_results' => $simpleResults,
                'user_info' => [
                    'id' => $user->id,
                    'roles' => $user->getRoleNames('api')
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in test method:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Test failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user's batch requests
     */
    public function index(HttpRequest $request): JsonResponse
    {
        try {
            $user = Auth::user();

            Log::info('Loading batch requests for user:', [
                'user_id' => $user->id,
                'user_roles' => $user->getRoleNames('api')
            ]);

            // Simplified query - just get basic batch requests without complex relationships
            $query = BatchRequest::select('id', 'batch_number', 'status', 'requested_by_user_id', 'created_at', 'batch_notes');

            if ($user->hasRole('CA', 'api')) {
                // CA users can only see their own batch requests
                $query->where('requested_by_user_id', $user->id);
            }
            // MR Staff and Admin can see all batch requests

            $batchRequests = $query->orderBy('created_at', 'desc')->get();

            Log::info('Basic batch requests loaded:', [
                'count' => $batchRequests->count(),
                'batch_ids' => $batchRequests->pluck('id')->toArray()
            ]);

            // For now, just return basic data without complex processing
            $simpleResults = $batchRequests->map(function($batch) {
                return [
                    'id' => $batch->id,
                    'batch_number' => $batch->batch_number,
                    'status' => $batch->status,
                    'requested_by_user_id' => $batch->requested_by_user_id,
                    'created_at' => $batch->created_at,
                    'batch_notes' => $batch->batch_notes,
                    'requests_count' => 0, // Placeholder
                    'approved_count' => 0, // Placeholder
                    'rejected_count' => 0, // Placeholder
                    'pending_count' => 0,  // Placeholder
                    'received_count' => 0, // Placeholder
                    'is_verified' => false, // Placeholder
                    'requests' => [], // Placeholder
                    'has_more_pending' => false // Placeholder
                ];
            });

            Log::info('Batch requests loaded successfully for user:', [
                'user_id' => $user->id,
                'user_role' => $user->getRoleNames('api'),
                'batch_count' => $batchRequests->count(),
            ]);

            return response()->json([
                'success' => true,
                'batch_requests' => $simpleResults,
            ]);

        } catch (\Exception $e) {
            Log::error('Error loading batch requests:', [
                'user_id' => $user->id ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error loading batch requests: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new batch request
     */
    public function store(HttpRequest $request): JsonResponse
    {
        $user = Auth::user();

        // Only CA users can create batch requests
        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can create batch requests'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'case_notes' => 'required|array|min:1|max:20',
            'case_notes.*.patient_id' => 'required|exists:patients,id',
            'department_id' => 'required|exists:departments,id',
            'doctor_id' => 'nullable|exists:doctors,id',
            'location_id' => 'nullable|exists:locations,id',
            'priority' => 'required|in:low,normal,high,urgent',
            'purpose' => 'required|string|max:1000',
            'needed_date' => 'required|date|after_or_equal:today',
            'batch_notes' => 'nullable|string|max:1000',
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

            // Create batch request
            $batchRequest = BatchRequest::create([
                'batch_number' => BatchRequest::generateBatchNumber(),
                'requested_by_user_id' => $user->id,
                'status' => BatchRequest::STATUS_PENDING,
                'batch_notes' => $request->batch_notes,
            ]);

            $createdRequests = [];

            // Create individual case note requests
            foreach ($request->case_notes as $caseNoteData) {
                $caseNoteRequest = Request::create([
                    'request_number' => Request::generateRequestNumber(),
                    'patient_id' => $caseNoteData['patient_id'],
                    'requested_by_user_id' => $user->id,
                    'department_id' => $request->department_id,
                    'doctor_id' => $request->doctor_id ?? null,
                    'location_id' => $request->location_id ?? null,
                    'priority' => $request->priority,
                    'purpose' => $request->purpose,
                    'needed_date' => $request->needed_date,
                    'remarks' => $caseNoteData['remarks'] ?? null,
                    'status' => Request::STATUS_PENDING,
                    'current_pic_user_id' => $user->id,
                    'handover_status' => 'none',
                    'batch_id' => $batchRequest->id,
                ]);

                // Create timeline event for case note creation
                $caseNoteRequest->events()->create([
                    'type' => RequestEvent::TYPE_CREATED,
                    'actor_user_id' => $user->id,
                    'reason' => 'Case note request created as part of batch',
                    'occurred_at' => now(),
                    'metadata' => [
                        'batch_id' => $batchRequest->id,
                        'batch_number' => $batchRequest->batch_number,
                        'created_in_batch' => true,
                    ]
                ]);

                $createdRequests[] = $caseNoteRequest->load(['patient', 'department', 'doctor', 'location']);
            }

            // Mark batch as submitted
            $batchRequest->markAsSubmitted();

            DB::commit();

            Log::info('Batch request created successfully', [
                'batch_id' => $batchRequest->id,
                'batch_number' => $batchRequest->batch_number,
                'case_notes_count' => count($createdRequests),
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Batch request created successfully',
                'batch' => $batchRequest->load(['requestedBy']),
                'case_notes' => $createdRequests,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating batch request:', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error creating batch request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get batch request details
     */
    public function show(int $id): JsonResponse
    {
        $user = Auth::user();
        $batchRequest = BatchRequest::with([
            'requestedBy',
            'processedBy',
            'requests.patient',
            'requests.department',
            'requests.doctor',
            'requests.location',
            'requests.events.actor'
        ])->find($id);

        if (!$batchRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Batch request not found'
            ], 404);
        }

        // Check permissions
        $canView = false;
        if ($user->hasRole('CA', 'api')) {
            $canView = $batchRequest->requested_by_user_id === $user->id;
        } elseif ($user->hasRole(['MR_STAFF', 'ADMIN'], 'api')) {
            $canView = true;
        }

        if (!$canView) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to view this batch request'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'batch' => $batchRequest,
        ]);
    }

    /**
     * Process batch request (approve/reject) - MR Staff only
     */
    public function process(HttpRequest $request, int $id): JsonResponse
    {
        $user = Auth::user();

        // Only MR Staff and Admin can process batch requests
        if (!$user->hasRole(['MR_STAFF', 'ADMIN'], 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Medical Records Staff can process batch requests'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'action' => 'required|in:approve,reject',
            'processing_notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $batchRequest = BatchRequest::with('requests')->find($id);

        if (!$batchRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Batch request not found'
            ], 404);
        }

        if (!$batchRequest->canBeProcessed()) {
            return response()->json([
                'success' => false,
                'message' => 'Batch request cannot be processed'
            ], 400);
        }

        try {
            DB::beginTransaction();

            $action = $request->action;
            $processingNotes = $request->processing_notes;

            if ($action === 'approve') {
                // Approve all pending requests in the batch
                $batchRequest->requests()
                    ->where('status', Request::STATUS_PENDING)
                    ->update([
                        'status' => Request::STATUS_APPROVED,
                        'approved_by_user_id' => $user->id,
                        'approved_at' => now(),
                        'approval_remarks' => $processingNotes,
                    ]);

                $batchRequest->markAsProcessed(BatchRequest::STATUS_APPROVED, $user->id, $processingNotes);

            } else {
                // Reject all pending requests in the batch
                $batchRequest->requests()
                    ->where('status', Request::STATUS_PENDING)
                    ->update([
                        'status' => Request::STATUS_REJECTED,
                        'rejected_by_user_id' => $user->id,
                        'rejected_at' => now(),
                        'rejection_reason' => $processingNotes,
                    ]);

                $batchRequest->markAsProcessed(BatchRequest::STATUS_REJECTED, $user->id, $processingNotes);
            }

            DB::commit();

            Log::info('Batch request processed successfully', [
                'batch_id' => $batchRequest->id,
                'action' => $action,
                'processed_by_user_id' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => "Batch request {$action}d successfully",
                'batch' => $batchRequest->fresh(['requestedBy', 'processedBy', 'requests']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error processing batch request:', [
                'batch_id' => $id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error processing batch request'
            ], 500);
        }
    }

    /**
     * Get batch request statistics
     */
    public function getStats(): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole(['MR_STAFF', 'ADMIN'], 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied'
            ], 403);
        }

        $stats = [
            'total_batches' => BatchRequest::count(),
            'pending_batches' => BatchRequest::pending()->count(),
            'approved_batches' => BatchRequest::approved()->count(),
            'rejected_batches' => BatchRequest::rejected()->count(),
            'partially_approved_batches' => BatchRequest::where('status', BatchRequest::STATUS_PARTIALLY_APPROVED)->count(),
        ];

        return response()->json([
            'success' => true,
            'stats' => $stats,
        ]);
    }

    /**
     * Verify case note receipt for a batch request
     */
    public function verifyReceipt(Request $request, int $id)
    {
        try {
            $user = $request->user();

            // Find the batch request
            $batchRequest = BatchRequest::with(['requests', 'requestedBy', 'verifiedBy'])
                ->findOrFail($id);

            // Check permissions - only CA can verify and only their own batches
            if (!$user->hasRole('CA')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only Clinic Assistants can verify receipt of case notes.'
                ], 403);
            }

            if ($batchRequest->requested_by_user_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only verify your own batch requests.'
                ], 403);
            }

            // Check if batch can be verified
            if (!$batchRequest->canBeVerified()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This batch cannot be verified. It must be approved and not already verified.'
                ], 400);
            }

            // Validate request data
            $validatedData = $request->validate([
                'received_count' => 'required|integer|min:0',
                'verification_notes' => 'nullable|string|max:1000',
            ]);

            $receivedCount = $validatedData['received_count'];
            $approvedCount = $batchRequest->getApprovedCount();

            // Mark batch as verified
            $batchRequest->markAsVerified(
                $user->id,
                $receivedCount,
                $validatedData['verification_notes'] ?? null
            );

            // Update individual case note status to mark them as received
            $approvedRequests = $batchRequest->requests()->where('status', 'approved')->get();

            Log::info('Updating case notes after verification:', [
                'batch_id' => $batchRequest->id,
                'approved_requests_count' => $approvedRequests->count(),
                'received_count' => $receivedCount,
                'user_id' => $user->id
            ]);

            foreach ($approvedRequests as $caseNoteRequest) {
                // Update the case note to mark it as received
                $caseNoteRequest->update([
                    'is_received' => true,
                    'received_at' => now(),
                    'received_by_user_id' => $user->id,
                    'status' => Request::STATUS_COMPLETED, // Mark as completed since it's received
                ]);

                Log::info('Case note updated after verification:', [
                    'case_note_id' => $caseNoteRequest->id,
                    'request_number' => $caseNoteRequest->request_number,
                    'old_status' => 'approved',
                    'new_status' => Request::STATUS_COMPLETED,
                    'is_received' => true,
                    'received_by_user_id' => $user->id,
                    'current_pic_user_id' => $caseNoteRequest->current_pic_user_id
                ]);

                // Create timeline event for case note verification
                $caseNoteRequest->events()->create([
                    'type' => \App\Models\RequestEvent::TYPE_VERIFIED_RECEIVED,
                    'actor_user_id' => $user->id,
                    'reason' => "Case note receipt verified by {$user->name}",
                    'occurred_at' => now(),
                    'metadata' => [
                        'verified_by_user_id' => $user->id,
                        'verified_by_user_name' => $user->name,
                        'batch_id' => $batchRequest->id,
                        'batch_number' => $batchRequest->batch_number,
                        'approved_count' => $approvedCount,
                        'received_count' => $receivedCount,
                        'verification_notes' => $validatedData['verification_notes'] ?? null,
                        'verified_at' => now()->toDateTimeString(),
                        'counts_match' => $receivedCount === $approvedCount,
                    ]
                ]);
            }

            // Reload batch with relationships
            $batchRequest->load(['requests', 'requestedBy', 'verifiedBy']);

                    return response()->json([
            'success' => true,
            'message' => "Batch receipt verified successfully. Received {$receivedCount} out of {$approvedCount} approved case notes.",
            'batch_request' => $batchRequest,
        ]);

        } catch (\Exception $e) {
            Log::error('Error verifying batch receipt:', [
                'batch_id' => $id,
                'user_id' => $request->user()?->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while verifying receipt.'
            ], 500);
        }
    }

    /**
     * Verify individual case notes within a batch
     */
    public function verifyIndividualReceipt(Request $request, int $id)
    {
        try {
            $user = $request->user();

            // Find the batch request
            $batchRequest = BatchRequest::with(['requests' => function($query) {
                $query->where('status', 'approved');
            }, 'requestedBy'])
                ->findOrFail($id);

            // Check permissions - only CA can verify and only their own batches
            if (!$user->hasRole('CA')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only Clinic Assistants can verify receipt of case notes.'
                ], 403);
            }

            if ($batchRequest->requested_by_user_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only verify your own batch requests.'
                ], 403);
            }

            // Check if batch can be verified
            if ($batchRequest->status !== BatchRequest::STATUS_APPROVED) {
                return response()->json([
                    'success' => false,
                    'message' => 'This batch must be approved before individual verification.'
                ], 400);
            }

            // Validate request data
            $validatedData = $request->validate([
                'received_case_notes' => 'required|array',
                'received_case_notes.*' => 'integer|exists:requests,id',
                'verification_notes' => 'nullable|string|max:1000',
            ]);

            $receivedCaseNoteIds = $validatedData['received_case_notes'];
            $verificationNotes = $validatedData['verification_notes'] ?? null;

            // Get approved case notes in this batch
            $approvedCaseNotes = $batchRequest->requests()->where('status', 'approved')->get();

            // Verify that all received case note IDs belong to this batch
            $invalidIds = array_diff($receivedCaseNoteIds, $approvedCaseNotes->pluck('id')->toArray());
            if (!empty($invalidIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid case note IDs provided.'
                ], 400);
            }

            $receivedCount = 0;
            $totalApproved = $approvedCaseNotes->count();

            // Mark individual case notes as received
            foreach ($approvedCaseNotes as $caseNote) {
                if (in_array($caseNote->id, $receivedCaseNoteIds)) {
                    if (!$caseNote->is_received) {
                        $caseNote->markAsReceived($user->id, $verificationNotes);
                        $receivedCount++;
                    }
                }
            }

            // Update batch verification status
            $totalReceived = $batchRequest->requests()
                ->where('status', 'approved')
                ->where('is_received', true)
                ->count();

            $batchRequest->update([
                'approved_count' => $totalApproved,
                'received_count' => $totalReceived,
                'is_verified' => ($totalReceived === $totalApproved), // Fully verified only if all received
                'verified_at' => now(),
                'verified_by_user_id' => $user->id,
                'verification_notes' => $verificationNotes,
            ]);

            // Reload batch with updated relationships
            $batchRequest->load(['requests.receivedBy', 'requestedBy', 'verifiedBy']);

            return response()->json([
                'success' => true,
                'message' => "Verification completed. {$totalReceived} out of {$totalApproved} case notes marked as received.",
                'batch_request' => $batchRequest,
                'verification_summary' => [
                    'total_approved' => $totalApproved,
                    'total_received' => $totalReceived,
                    'newly_received' => $receivedCount,
                    'is_complete' => ($totalReceived === $totalApproved),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error verifying individual receipt:', [
                'batch_id' => $id,
                'user_id' => $request->user()?->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while verifying individual receipt.'
            ], 500);
        }
    }
}
