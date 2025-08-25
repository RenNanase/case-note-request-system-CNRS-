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

            Log::info('Patient search results', [
                'search_term' => $searchTerm,
                'patients_found' => $patients->count(),
                'first_patient' => $patients->first() ? $patients->first()->name : 'none',
                'sql_query' => $query->toSql(),
                'sql_bindings' => $query->getBindings()
            ]);

            $response = [
                'success' => true,
                'patients' => $patients->map(function($patient) {
                    return $patient->toSearchResult();
                }),
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
}
