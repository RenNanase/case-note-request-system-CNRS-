<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use App\Models\Patient;

class PatientController extends Controller
{
    /**
     * Search patients for request creation
     */
    public function search(Request $request): JsonResponse
    {
        $searchTerm = $request->get('search') ?: $request->get('q');
        $user = $request->user();

        Log::info('Patient search requested', [
            'search_term' => $searchTerm,
            'user_id' => $user?->id,
            'user_email' => $user?->email,
            'user_authenticated' => $user ? 'yes' : 'no',
            'headers' => $request->headers->all(),
            'auth_header' => $request->header('Authorization'),
            'auth_header_exists' => $request->header('Authorization') ? 'yes' : 'no'
        ]);

        if (!$user) {
            Log::warning('Patient search failed - user not authenticated');
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated',
                'patients' => []
            ], 401);
        }

        try {
            $query = Patient::query();

            if ($searchTerm && trim($searchTerm)) {
                $query->search(trim($searchTerm));
            }

            $patients = $query->take(20)->get();

            // Add case note availability information for each patient
            $patientsWithAvailability = $patients->map(function($patient) {
                $patientData = $patient->toSearchResult();

                // Check if patient has any existing case note requests
                $existingRequests = \App\Models\Request::where('patient_id', $patient->id)
                    ->whereIn('status', ['pending', 'approved']) // Check both pending and approved requests
                    ->get();

                Log::info('Patient request check', [
                    'patient_id' => $patient->id,
                    'patient_name' => $patient->name,
                    'existing_requests_count' => $existingRequests->count(),
                    'existing_requests' => $existingRequests->toArray(),
                ]);

                if ($existingRequests->count() > 0) {
                    // Check if any of the requests are currently held by someone
                    $hasCurrentPIC = $existingRequests->whereNotNull('current_pic_user_id')->count() > 0;

                    // Check if there are any pending handover requests
                    $pendingHandoverRequests = \App\Models\HandoverRequest::whereIn('case_note_id', $existingRequests->pluck('id'))
                        ->where('status', 'pending')
                        ->count();

                    // Get the case note request ID for handover requests
                    // Use the first existing request (either pending or approved)
                    $caseNoteRequestId = $existingRequests->first()->id;

                    // Merge availability information with patient data
                    $patientData = array_merge($patientData, [
                        'has_existing_requests' => true,
                        'is_available' => !$hasCurrentPIC && $pendingHandoverRequests === 0,
                        'handover_status' => $pendingHandoverRequests > 0 ? 'requested' : 'none',
                        'case_note_request_id' => $caseNoteRequestId,
                    ]);

                    Log::info('Patient availability data', [
                        'patient_name' => $patient->name,
                        'patient_id' => $patient->id,
                        'existing_requests_count' => $existingRequests->count(),
                        'has_current_pic' => $hasCurrentPIC,
                        'case_note_request_id' => $caseNoteRequestId,
                        'is_available' => !$hasCurrentPIC && $pendingHandoverRequests === 0,
                        'handover_status' => $pendingHandoverRequests > 0 ? 'requested' : 'none',
                    ]);

                    if ($hasCurrentPIC) {
                        $currentRequest = $existingRequests->whereNotNull('current_pic_user_id')->first();
                        $currentHolder = \App\Models\User::find($currentRequest->current_pic_user_id);
                        if ($currentHolder) {
                            $patientData['current_holder'] = [
                                'id' => $currentHolder->id,
                                'name' => $currentHolder->name,
                                'email' => $currentHolder->email,
                            ];
                        }
                    }
                } else {
                    // Merge availability information for patients with no existing requests
                    $patientData = array_merge($patientData, [
                        'has_existing_requests' => false,
                        'is_available' => true,
                        'handover_status' => 'none',
                    ]);
                }

                return $patientData;
            });

            Log::info('Patient search results', [
                'search_term' => $searchTerm,
                'patients_found' => $patientsWithAvailability->count(),
                'first_patient' => $patientsWithAvailability->first() ? $patientsWithAvailability->first()['name'] : 'none',
                'first_patient_data' => $patientsWithAvailability->first() ? $patientsWithAvailability->first() : 'none',
                'sql_query' => $query->toSql(),
                'sql_bindings' => $query->getBindings()
            ]);

            $response = [
                'success' => true,
                'patients' => $patientsWithAvailability,
            ];

            Log::info('Patient search response', [
                'response_success' => $response['success'],
                'response_patients_count' => count($response['patients']),
                'response_data' => $response
            ]);

            return response()->json($response);
        } catch (\Exception $e) {
            Log::error('Patient search error', [
                'search_term' => $searchTerm,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error searching patients: ' . $e->getMessage(),
                'patients' => []
            ], 500);
        }
    }

    /**
     * Get patient details by ID
     */
    public function show(Patient $patient): JsonResponse
    {
        return response()->json([
            'success' => true,
            'patient' => $patient->toSearchResult(),
        ]);
    }

    /**
     * Get case note request ID for a patient by MRN
     */
    public function getCaseNoteRequestId(string $mrn): JsonResponse
    {
        try {
            $patient = Patient::where('mrn', $mrn)->first();

            if (!$patient) {
                return response()->json([
                    'success' => false,
                    'message' => 'Patient not found'
                ], 404);
            }

            // Find existing requests for this patient
            $existingRequest = \App\Models\Request::where('patient_id', $patient->id)
                ->whereIn('status', ['pending', 'approved'])
                ->first();

            if (!$existingRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'No case note request found for this patient'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'case_note_request_id' => $existingRequest->id,
                'patient' => [
                    'id' => $patient->id,
                    'name' => $patient->name,
                    'mrn' => $patient->mrn,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting case note request ID', [
                'mrn' => $mrn,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error getting case note request ID: ' . $e->getMessage()
            ], 500);
        }
    }
}
