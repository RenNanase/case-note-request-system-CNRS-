<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FilingRequest;
use App\Models\Request;
use App\Models\User;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use App\Services\FilingRequestPdfService;

class FilingRequestController extends Controller
{
    /**
     * Get filing requests for CA (their own submissions)
     */
    public function getCAFilingRequests(): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access this endpoint'
            ], 403);
        }

        try {
            $filingRequests = FilingRequest::where('submitted_by_user_id', $user->id)
                ->with(['approvedBy'])
                ->orderBy('created_at', 'desc')
                ->get();

            // Add additional data for each filing request
            $filingRequests->each(function ($filingRequest) {
                $filingRequest->patients = $filingRequest->getPatients();
                $filingRequest->patient_count = $filingRequest->patient_count;
                $filingRequest->is_patient_based = $filingRequest->isPatientBased();
            });

            return response()->json([
                'success' => true,
                'filing_requests' => $filingRequests
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching CA filing requests:', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch filing requests'
            ], 500);
        }
    }

    /**
     * Get all filing requests for MR staff
     */
    public function getMRFilingRequests(): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole(['MR_STAFF', 'ADMIN'], 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only MR Staff can access this endpoint'
            ], 403);
        }

        try {
            $filingRequests = FilingRequest::with(['submittedBy', 'approvedBy'])
                ->orderBy('created_at', 'desc')
                ->get();

            // Add additional data for each filing request
            $filingRequests->each(function ($filingRequest) {
                $filingRequest->patients = $filingRequest->getPatients();
                $filingRequest->patient_count = $filingRequest->patient_count;
                $filingRequest->is_patient_based = $filingRequest->isPatientBased();
            });

            return response()->json([
                'success' => true,
                'filing_requests' => $filingRequests
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching MR filing requests:', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch filing requests'
            ], 500);
        }
    }

    /**
     * Get filing requests by specific CA for MR staff
     */
    public function getFilingRequestsByCA($caUserId): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole(['MR_STAFF', 'ADMIN'], 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only MR Staff can access this endpoint'
            ], 403);
        }

        try {
            $caUser = User::find($caUserId);
            if (!$caUser || !$caUser->hasRole('CA', 'api')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid CA user'
                ], 404);
            }

            $filingRequests = FilingRequest::where('submitted_by_user_id', $caUserId)
                ->with(['approvedBy'])
                ->orderBy('created_at', 'desc')
                ->get();

            // Add additional data for each filing request
            $filingRequests->each(function ($filingRequest) {
                $filingRequest->patients = $filingRequest->getPatients();
                $filingRequest->patient_count = $filingRequest->patient_count;
                $filingRequest->is_patient_based = $filingRequest->isPatientBased();
            });

            return response()->json([
                'success' => true,
                'filing_requests' => $filingRequests,
                'ca_user' => [
                    'id' => $caUser->id,
                    'name' => $caUser->name,
                    'email' => $caUser->email
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching filing requests by CA:', [
                'user_id' => $user->id,
                'ca_user_id' => $caUserId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch filing requests'
            ], 500);
        }
    }

    /**
     * Search all patients for filing requests (NEW FUNCTIONALITY)
     */
    public function searchPatientsForFiling(HttpRequest $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access this endpoint'
            ], 403);
        }

        try {
            $searchTerm = $request->get('search', '');
            $limit = min((int) $request->get('limit', 50), 100); // Max 100 results

            $query = Patient::query();

            if (!empty(trim($searchTerm))) {
                $query->search(trim($searchTerm));
            }

            $patients = $query->take($limit)->get();

            // Transform to search result format
            $patientResults = $patients->map(function ($patient) {
                return $patient->toSearchResult();
            });

            return response()->json([
                'success' => true,
                'patients' => $patientResults,
                'total_found' => $patients->count(),
                'search_term' => $searchTerm
            ]);

        } catch (\Exception $e) {
            Log::error('Error searching patients for filing:', [
                'user_id' => $user->id,
                'search_term' => $request->get('search', ''),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to search patients'
            ], 500);
        }
    }

    /**
     * Get case notes available for filing (LEGACY - for backward compatibility)
     */
    public function getAvailableCaseNotes(HttpRequest $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can access this endpoint'
            ], 403);
        }

        try {
            // Get all case notes that are approved and received (available for filing)
            $query = Request::where('status', Request::STATUS_APPROVED)
                ->where('is_received', true)
                ->with(['patient', 'doctor', 'department', 'requestedBy'])
                ->orderBy('received_at', 'desc');

            // Add simple search functionality
            if ($request->has('search') && !empty($request->search)) {
                $searchTerm = $request->search;
                $query->where(function ($q) use ($searchTerm) {
                    $q->where('request_number', 'like', "%{$searchTerm}%")
                      ->orWhereHas('patient', function ($patientQuery) use ($searchTerm) {
                          $patientQuery->where('name', 'like', "%{$searchTerm}%")
                                      ->orWhere('mrn', 'like', "%{$searchTerm}%");
                      });
                });
            }

            $completedCaseNotes = $query->get();

            return response()->json([
                'success' => true,
                'case_notes' => $completedCaseNotes,
                'legacy_warning' => 'This endpoint is deprecated. Use patient-based filing instead.'
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching available case notes:', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch available case notes'
            ], 500);
        }
    }

    /**
     * Submit a new patient-based filing request (NEW FUNCTIONALITY)
     */
    public function submitPatientFilingRequest(HttpRequest $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can submit filing requests'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'patient_ids' => 'required|array|min:1',
            'patient_ids.*' => 'required|integer|exists:patients,id',
            'case_note_description' => 'required|string|max:1000',
            'expected_case_note_count' => 'nullable|integer|min:1',
            'submission_notes' => 'nullable|string|max:1000',
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

            $patientIds = $request->patient_ids;
            $caseNoteDescription = $request->case_note_description;
            $expectedCaseNoteCount = $request->expected_case_note_count;
            $submissionNotes = $request->submission_notes;

            // Get the patients to verify they exist
            $patients = Patient::whereIn('id', $patientIds)->get();

            if ($patients->count() !== count($patientIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Some patients were not found'
                ], 404);
            }

            // Create the filing request
            $filingRequest = FilingRequest::create([
                'submitted_by_user_id' => $user->id,
                'patient_ids' => $patientIds,
                'case_note_description' => $caseNoteDescription,
                'expected_case_note_count' => $expectedCaseNoteCount,
                'submission_notes' => $submissionNotes,
                'status' => FilingRequest::STATUS_PENDING,
            ]);

            DB::commit();

            // Load relationships for response
            $filingRequest->load(['submittedBy']);
            $filingRequest->patients = $filingRequest->getPatients();

            Log::info('Patient-based filing request submitted:', [
                'filing_request_id' => $filingRequest->id,
                'filing_number' => $filingRequest->filing_number,
                'submitted_by_user_id' => $user->id,
                'patient_ids' => $patientIds,
                'case_note_description' => $caseNoteDescription,
                'expected_case_note_count' => $expectedCaseNoteCount,
                'submission_notes' => $submissionNotes,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Patient filing request submitted successfully',
                'filing_request' => $filingRequest
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error submitting patient filing request:', [
                'user_id' => $user->id,
                'patient_ids' => $patientIds ?? [],
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to submit filing request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Submit a legacy case note-based filing request (LEGACY - for backward compatibility)
     */
    public function submitFilingRequest(HttpRequest $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('CA', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only Clinic Assistants can submit filing requests'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'case_note_ids' => 'required|array|min:1',
            'case_note_ids.*' => 'required|integer|exists:requests,id',
            'submission_notes' => 'nullable|string|max:1000',
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
            $submissionNotes = $request->submission_notes;

            // Get the case notes
            $caseNotes = Request::whereIn('id', $caseNoteIds)->get();

            if ($caseNotes->count() !== count($caseNoteIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Some case notes were not found'
                ], 404);
            }

            // Create the filing request (legacy format)
            $filingRequest = FilingRequest::create([
                'submitted_by_user_id' => $user->id,
                'case_note_ids' => $caseNoteIds,
                'submission_notes' => $submissionNotes,
                'status' => FilingRequest::STATUS_PENDING,
            ]);

            DB::commit();

            $filingRequest->load(['submittedBy']);

            Log::info('Legacy case note filing request submitted:', [
                'filing_request_id' => $filingRequest->id,
                'filing_number' => $filingRequest->filing_number,
                'submitted_by_user_id' => $user->id,
                'case_note_ids' => $caseNoteIds,
                'submission_notes' => $submissionNotes,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Filing request submitted successfully (legacy mode)',
                'filing_request' => $filingRequest,
                'legacy_warning' => 'This endpoint is deprecated. Use patient-based filing instead.'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error submitting legacy filing request:', [
                'user_id' => $user->id,
                'case_note_ids' => $caseNoteIds ?? [],
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to submit filing request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve a filing request
     */
    public function approveFilingRequest($id, HttpRequest $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole(['MR_STAFF', 'ADMIN'], 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only MR Staff can approve filing requests'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'approval_notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $filingRequest = FilingRequest::find($id);

            if (!$filingRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'Filing request not found'
                ], 404);
            }

            if (!$filingRequest->canBeApproved()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Filing request cannot be approved in its current state'
                ], 400);
            }

            $approvalNotes = $request->approval_notes;

            if ($filingRequest->approve($user, $approvalNotes)) {
                $filingRequest->load(['submittedBy', 'approvedBy']);

                // Add additional data
                $filingRequest->patients = $filingRequest->getPatients();
                $filingRequest->patient_count = $filingRequest->patient_count;
                $filingRequest->is_patient_based = $filingRequest->isPatientBased();

                Log::info('Filing request approved:', [
                    'filing_request_id' => $filingRequest->id,
                    'filing_number' => $filingRequest->filing_number,
                    'approved_by_user_id' => $user->id,
                    'approval_notes' => $approvalNotes,
                    'is_patient_based' => $filingRequest->isPatientBased(),
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Filing request approved successfully',
                    'filing_request' => $filingRequest
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to approve filing request'
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error('Error approving filing request:', [
                'filing_request_id' => $id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to approve filing request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject a filing request
     */
    public function rejectFilingRequest($id, HttpRequest $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole(['MR_STAFF', 'ADMIN'], 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only MR Staff can reject filing requests'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'rejection_notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $filingRequest = FilingRequest::find($id);

            if (!$filingRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'Filing request not found'
                ], 404);
            }

            if (!$filingRequest->canBeRejected()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Filing request cannot be rejected in its current state'
                ], 400);
            }

            $rejectionNotes = $request->rejection_notes;

            if ($filingRequest->reject($user, $rejectionNotes)) {
                $filingRequest->load(['submittedBy', 'approvedBy']);

                // Add additional data
                $filingRequest->patients = $filingRequest->getPatients();
                $filingRequest->patient_count = $filingRequest->patient_count;
                $filingRequest->is_patient_based = $filingRequest->isPatientBased();

                Log::info('Filing request rejected:', [
                    'filing_request_id' => $filingRequest->id,
                    'filing_number' => $filingRequest->filing_number,
                    'rejected_by_user_id' => $user->id,
                    'rejection_notes' => $rejectionNotes,
                    'is_patient_based' => $filingRequest->isPatientBased(),
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Filing request rejected successfully',
                    'filing_request' => $filingRequest
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to reject filing request'
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error('Error rejecting filing request:', [
                'filing_request_id' => $id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to reject filing request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get filing request details with patients/case notes
     */
    public function getFilingRequestDetails($id): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole(['CA', 'MR_STAFF', 'ADMIN'], 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied'
            ], 403);
        }

        try {
            $filingRequest = FilingRequest::with(['submittedBy', 'approvedBy'])->find($id);

            if (!$filingRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'Filing request not found'
                ], 404);
            }

            // Check if user can access this filing request
            if ($user->hasRole('CA', 'api') && $filingRequest->submitted_by_user_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied'
                ], 403);
            }

            // Get patients or case notes based on filing type
            if ($filingRequest->isPatientBased()) {
                $patients = $filingRequest->getPatients();
                $filingRequest->patients = $patients;
                $filingRequest->case_notes = null;
            } else {
                $caseNotes = $filingRequest->getCaseNoteRequests();
                $caseNotes->load(['patient', 'doctor', 'department', 'requestedBy']);
                $filingRequest->case_notes = $caseNotes;
                $filingRequest->patients = null;
            }

            $filingRequest->is_patient_based = $filingRequest->isPatientBased();

            return response()->json([
                'success' => true,
                'filing_request' => $filingRequest
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching filing request details:', [
                'filing_request_id' => $id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch filing request details'
            ], 500);
        }
    }

    /**
     * Generate PDF for CA filing requests (pending by default)
     */
    public function generateFilingRequestListPdf(HttpRequest $request, $caId)
    {
        $user = Auth::user();

        if (!$user->hasRole(['MR_STAFF', 'ADMIN'], 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to generate PDFs'
            ], 403);
        }

        try {
            $ids = $request->get('filing_request_ids', []);
            if (is_string($ids)) {
                $ids = explode(',', $ids);
            }
            $ids = array_filter(array_map('intval', $ids));

            $pdfService = new FilingRequestPdfService();
            $pdf = $pdfService->generateFilingRequestListPdf((int)$caId, $ids);

            $ca = \App\Models\User::find($caId);
            $filename = $pdfService->generateFilename((int)$caId, $ca->name ?? 'Unknown');

            return $pdf->download($filename);

        } catch (\Exception $e) {
            Log::error('Error generating filing request list PDF:', [
                'user_id' => $user->id,
                'ca_id' => $caId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate PDF: ' . $e->getMessage()
            ], 500);
        }
    }
}
