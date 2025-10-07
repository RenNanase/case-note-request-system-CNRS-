<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OpenedCaseNote;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class OpenedCaseNoteController extends Controller
{
    /**
     * Get all opened case notes
     */
    public function index(): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('MR_STAFF', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only MR Staff can access this endpoint'
            ], 403);
        }

        try {
            $openedCaseNotes = OpenedCaseNote::with([
                'patient',
                'department',
                'location',
                'doctor',
                'openedBy'
            ])
            ->active()
            ->orderBy('opened_at', 'desc')
            ->get();

            $formattedCaseNotes = $openedCaseNotes->map(function ($caseNote) {
                return [
                    'id' => $caseNote->id,
                    'patient_id' => $caseNote->patient_id,
                    'patient_name' => $caseNote->patient->name,
                    'patient_mrn' => $caseNote->patient->mrn,
                    'department_id' => $caseNote->department_id,
                    'department_name' => $caseNote->department->name,
                    'location_id' => $caseNote->location_id,
                    'location_name' => $caseNote->location->name,
                    'doctor_id' => $caseNote->doctor_id,
                    'doctor_name' => $caseNote->doctor->name,
                    'user_type' => $caseNote->user_type,
                    'user_type_label' => $caseNote->user_type_label,
                    'remarks' => $caseNote->remarks,
                    'opened_by_user_id' => $caseNote->opened_by_user_id,
                    'opened_by_name' => $caseNote->openedBy->name,
                    'opened_at' => $caseNote->opened_at->toDateTimeString(),
                    'status' => 'Active',
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formattedCaseNotes,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve opened case notes',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly opened case note
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('MR_STAFF', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only MR Staff can access this endpoint'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|integer|exists:patients,id',
            'department_id' => 'required|integer|exists:departments,id',
            'location_id' => 'required|integer|exists:locations,id',
            'doctor_id' => 'required|integer|exists:doctors,id',
            'user_type' => [
                'required',
                'string',
                Rule::in([
                    OpenedCaseNote::USER_TYPE_OT_STAFF,
                    OpenedCaseNote::USER_TYPE_ED_STAFF,
                    OpenedCaseNote::USER_TYPE_MEDICAL_STAFF,
                    OpenedCaseNote::USER_TYPE_ICU_STAFF,
                    OpenedCaseNote::USER_TYPE_SURGICAL_STAFF,
                    OpenedCaseNote::USER_TYPE_MATERNITY_STAFF,
                    OpenedCaseNote::USER_TYPE_NURSERY_STAFF,
                ])
            ],
            'remarks' => 'required|string|min:1|max:1000',
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

            // Check if patient already has an active opened case note
            if (OpenedCaseNote::hasActiveOpenedCaseNote($request->patient_id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'This patient already has an active opened case note'
                ], 409);
            }

            // Create the opened case note
            $openedCaseNote = OpenedCaseNote::create([
                'patient_id' => $request->patient_id,
                'department_id' => $request->department_id,
                'location_id' => $request->location_id,
                'doctor_id' => $request->doctor_id,
                'user_type' => $request->user_type,
                'remarks' => $request->remarks,
                'opened_by_user_id' => $user->id,
                'opened_at' => now(),
                'is_active' => true,
            ]);

            // Load relationships for response
            $openedCaseNote->load([
                'patient',
                'department',
                'location',
                'doctor',
                'openedBy'
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Case note opened successfully',
                'data' => [
                    'id' => $openedCaseNote->id,
                    'patient_id' => $openedCaseNote->patient_id,
                    'patient_name' => $openedCaseNote->patient->name,
                    'patient_mrn' => $openedCaseNote->patient->mrn,
                    'department_id' => $openedCaseNote->department_id,
                    'department_name' => $openedCaseNote->department->name,
                    'location_id' => $openedCaseNote->location_id,
                    'location_name' => $openedCaseNote->location->name,
                    'doctor_id' => $openedCaseNote->doctor_id,
                    'doctor_name' => $openedCaseNote->doctor->name,
                    'user_type' => $openedCaseNote->user_type,
                    'user_type_label' => $openedCaseNote->user_type_label,
                    'remarks' => $openedCaseNote->remarks,
                    'opened_by_user_id' => $openedCaseNote->opened_by_user_id,
                    'opened_by_name' => $openedCaseNote->openedBy->name,
                    'opened_at' => $openedCaseNote->opened_at->toDateTimeString(),
                    'status' => 'Active',
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to open case note',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check if a patient has an active opened case note (for CA restrictions)
     */
    public function checkPatientRestriction(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|integer|exists:patients,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $openedCaseNote = OpenedCaseNote::getActiveOpenedCaseNote($request->patient_id);

            if ($openedCaseNote) {
                return response()->json([
                    'success' => true,
                    'has_restriction' => true,
                    'data' => [
                        'patient_id' => $openedCaseNote->patient_id,
                        'patient_name' => $openedCaseNote->patient->name,
                        'patient_mrn' => $openedCaseNote->patient->mrn,
                        'department_name' => $openedCaseNote->department->name,
                        'location_name' => $openedCaseNote->location->name,
                        'doctor_name' => $openedCaseNote->doctor->name,
                        'user_type_label' => $openedCaseNote->user_type_label,
                        'remarks' => $openedCaseNote->remarks,
                        'opened_by_name' => $openedCaseNote->openedBy->name,
                        'opened_at' => $openedCaseNote->opened_at->toDateTimeString(),
                    ]
                ]);
            } else {
                return response()->json([
                    'success' => true,
                    'has_restriction' => false,
                    'data' => null
                ]);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to check patient restriction',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Deactivate an opened case note
     */
    public function deactivate(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasRole('MR_STAFF', 'api')) {
            return response()->json([
                'success' => false,
                'message' => 'Only MR Staff can access this endpoint'
            ], 403);
        }

        try {
            $openedCaseNote = OpenedCaseNote::findOrFail($id);

            if (!$openedCaseNote->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'This case note is already inactive'
                ], 409);
            }

            $openedCaseNote->update([
                'is_active' => false
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Case note deactivated successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to deactivate case note',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
