<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;

class DoctorController extends Controller
{
    /**
     * Get all doctors with optional filtering
     */
    public function index(Request $request): JsonResponse
    {
        try {
            Log::info('DoctorController index called', [
                'url' => $request->fullUrl(),
                'method' => $request->method(),
            ]);

            $query = Doctor::with('department');

            // Filter by department
            if ($request->filled('department_id')) {
                $query->where('department_id', $request->department_id);
            }

            // Filter by status
            if ($request->filled('is_active')) {
                $query->where('is_active', $request->boolean('is_active'));
            }

            // Search by name
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where('name', 'LIKE', "%{$search}%");
            }

            $doctors = $query->orderBy('name')->get();

            Log::info('Doctors fetched', [
                'count' => $doctors->count(),
                'filters' => [
                    'department_id' => $request->department_id,
                    'is_active' => $request->is_active,
                    'search' => $request->search,
                ]
            ]);

            return response()->json([
                'success' => true,
                'doctors' => $doctors,
                'total' => $doctors->count(),
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching doctors: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch doctors',
            ], 500);
        }
    }

    /**
     * Store a new doctor
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'department_id' => [
                    'required',
                    'integer',
                    Rule::exists('departments', 'id'),
                ],
            ]);

            // Check if doctor with same name in same department already exists
            $existingDoctor = Doctor::where('name', $validated['name'])
                ->where('department_id', $validated['department_id'])
                ->first();

            if ($existingDoctor) {
                return response()->json([
                    'success' => false,
                    'message' => 'A doctor with this name already exists in the selected department.',
                ], 422);
            }

            $doctor = Doctor::create([
                'name' => $validated['name'],
                'department_id' => $validated['department_id'],
                'is_active' => true,
            ]);

            $doctor->load('department');

            Log::info('Doctor created', [
                'doctor_id' => $doctor->id,
                'name' => $doctor->name,
                'department_id' => $doctor->department_id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Doctor created successfully',
                'doctor' => $doctor,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating doctor: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create doctor',
            ], 500);
        }
    }

    /**
     * Update a doctor
     */
    public function update(Request $request, Doctor $doctor): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'department_id' => [
                    'required',
                    'integer',
                    Rule::exists('departments', 'id'),
                ],
            ]);

            // Check if doctor with same name in same department already exists (excluding current doctor)
            $existingDoctor = Doctor::where('name', $validated['name'])
                ->where('department_id', $validated['department_id'])
                ->where('id', '!=', $doctor->id)
                ->first();

            if ($existingDoctor) {
                return response()->json([
                    'success' => false,
                    'message' => 'A doctor with this name already exists in the selected department.',
                ], 422);
            }

            $oldData = [
                'name' => $doctor->name,
                'department_id' => $doctor->department_id,
            ];

            $doctor->update([
                'name' => $validated['name'],
                'department_id' => $validated['department_id'],
            ]);

            $doctor->load('department');

            Log::info('Doctor updated', [
                'doctor_id' => $doctor->id,
                'old_data' => $oldData,
                'new_data' => [
                    'name' => $doctor->name,
                    'department_id' => $doctor->department_id,
                ],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Doctor updated successfully',
                'doctor' => $doctor,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating doctor: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update doctor',
            ], 500);
        }
    }

    /**
     * Toggle doctor status (active/inactive)
     */
    public function toggleStatus(Request $request, Doctor $doctor): JsonResponse
    {
        try {
            $validated = $request->validate([
                'is_active' => 'required|boolean',
            ]);

            $oldStatus = $doctor->is_active;
            $doctor->update(['is_active' => $validated['is_active']]);

            Log::info('Doctor status toggled', [
                'doctor_id' => $doctor->id,
                'name' => $doctor->name,
                'old_status' => $oldStatus,
                'new_status' => $doctor->is_active,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Doctor status updated successfully',
                'doctor' => $doctor->load('department'),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error toggling doctor status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update doctor status',
            ], 500);
        }
    }

    /**
     * Get a specific doctor
     */
    public function show(Doctor $doctor): JsonResponse
    {
        try {
            $doctor->load('department');

            return response()->json([
                'success' => true,
                'doctor' => $doctor,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching doctor: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch doctor',
            ], 500);
        }
    }

    /**
     * Delete a doctor (soft delete)
     */
    public function destroy(Doctor $doctor): JsonResponse
    {
        try {
            // Check if doctor has any associated requests
            $hasRequests = $doctor->requests()->exists();
            $hasCaseNotes = $doctor->caseNotes()->exists();

            if ($hasRequests || $hasCaseNotes) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete doctor. They have associated requests or case notes.',
                ], 422);
            }

            $doctor->delete();

            Log::info('Doctor deleted', [
                'doctor_id' => $doctor->id,
                'name' => $doctor->name,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Doctor deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting doctor: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete doctor',
            ], 500);
        }
    }
}
