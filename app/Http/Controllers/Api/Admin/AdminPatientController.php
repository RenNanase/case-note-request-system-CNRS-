<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Patient;
use App\Models\ImportProgress;
use App\Imports\PatientsImport;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Exception;

class AdminPatientController extends Controller
{
    /**
     * Import patients from Excel file
     */
    public function importExcel(Request $request): JsonResponse
    {
        // Validate the uploaded file
        $validator = Validator::make($request->all(), [
            'excel_file' => 'required|file|mimes:xlsx,xls,csv|max:102400', // Max 100MB for large imports
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid file upload',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $file = $request->file('excel_file');
            $user = Auth::user();

            // Count total rows in the file
            $totalRows = 0;
            $handle = fopen($file->getPathname(), 'r');
            while (fgets($handle) !== false) {
                $totalRows++;
            }
            fclose($handle);

            // Subtract 1 for header row
            $totalRows = max(0, $totalRows - 1);

            // Create import progress record
            $importProgress = ImportProgress::create([
                'import_type' => ImportProgress::TYPE_PATIENTS,
                'file_name' => $file->getClientOriginalName(),
                'total_rows' => $totalRows,
                'status' => ImportProgress::STATUS_PENDING,
                'requested_by_user_id' => $user->id,
                'metadata' => [
                    'file_size' => $file->getSize(),
                    'file_type' => $file->getClientMimeType(),
                    'uploaded_at' => now()->toISOString(),
                ],
            ]);

            // Create import instance with progress tracking
            $import = new PatientsImport();
            $import->setImportProgress($importProgress);

            // Process the import
            Excel::import($import, $file);

            // Get import statistics
            $stats = $import->getImportStats();
            $failures = $import->failures();
            $errors = $import->errors();

            // Prepare response data
            $response = [
                'success' => true,
                'message' => 'Import completed successfully',
                'statistics' => $stats,
            ];

            // Add failure details if any
            if (!empty($failures)) {
                $response['failures'] = collect($failures)->map(function ($failure) {
                    return [
                        'row' => $failure->row(),
                        'errors' => $failure->errors(),
                        'values' => $failure->values(),
                    ];
                })->toArray();
            }

            // Add error details if any
            if (!empty($errors)) {
                $response['errors'] = collect($errors)->map(function ($error) {
                    return $error->getMessage();
                })->toArray();
            }

            return response()->json($response, 200);

        } catch (Exception $e) {
            // Mark import as failed
            if (isset($importProgress)) {
                $importProgress->markAsFailed($e->getMessage());
            }

            Log::error('Patient import failed', [
                'error' => $e->getMessage(),
                'file' => $file->getClientOriginalName(),
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Import failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get import progress for ongoing imports
     */
    public function getImportProgress(): JsonResponse
    {
        try {
            $user = Auth::user();
            
            $activeImports = ImportProgress::byType(ImportProgress::TYPE_PATIENTS)
                ->active()
                ->where('requested_by_user_id', $user->id)
                ->orderBy('created_at', 'desc')
                ->get();

            $recentImports = ImportProgress::byType(ImportProgress::TYPE_PATIENTS)
                ->recent(30)
                ->where('requested_by_user_id', $user->id)
                ->orderBy('created_at', 'desc')
                ->take(10)
                ->get();

            return response()->json([
                'success' => true,
                'active_imports' => $activeImports,
                'recent_imports' => $recentImports,
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get import progress', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get import progress: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel an ongoing import
     */
    public function cancelImport($id): JsonResponse
    {
        try {
            $user = Auth::user();
            
            $importProgress = ImportProgress::where('id', $id)
                ->where('requested_by_user_id', $user->id)
                ->whereIn('status', [ImportProgress::STATUS_PENDING, ImportProgress::STATUS_PROCESSING])
                ->first();

            if (!$importProgress) {
                return response()->json([
                    'success' => false,
                    'message' => 'Import not found or cannot be cancelled',
                ], 404);
            }

            $importProgress->cancel();

            Log::info('Patient import cancelled', [
                'import_id' => $id,
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Import cancelled successfully',
            ]);

        } catch (Exception $e) {
            Log::error('Failed to cancel import', [
                'error' => $e->getMessage(),
                'import_id' => $id,
                'user_id' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel import: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get patients list with pagination for admin
     */
    public function index(Request $request): JsonResponse
    {
        $query = Patient::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->search($request->search);
        }

        // Filter by active status
        if ($request->filled('active')) {
            $query->where('is_active', $request->boolean('active'));
        }

        // Sort options
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');

        if (in_array($sortBy, ['name', 'mrn', 'created_at', 'updated_at'])) {
            $query->orderBy($sortBy, $sortOrder);
        }

        // Paginate results
        $perPage = min($request->get('per_page', 15), 100); // Max 100 per page
        $patients = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'patients' => $patients->items(),
            'pagination' => [
                'current_page' => $patients->currentPage(),
                'total_pages' => $patients->lastPage(),
                'per_page' => $patients->perPage(),
                'total' => $patients->total(),
                'has_more' => $patients->hasMorePages(),
            ],
        ]);
    }

    /**
     * Get patient statistics for admin dashboard
     */
    public function statistics(): JsonResponse
    {
        try {
            $stats = [
                'total_patients' => Patient::count(),
                'active_patients' => Patient::active()->count(),
                'inactive_patients' => Patient::where('is_active', false)->count(),
                'patients_with_nationality_id' => Patient::whereNotNull('nationality_id')->count(),
                'recent_imports' => Patient::where('created_at', '>=', now()->subDays(30))->count(),
            ];

            return response()->json([
                'success' => true,
                'statistics' => $stats,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics: ' . $e->getMessage(),
                'statistics' => [
                    'total_patients' => 0,
                    'active_patients' => 0,
                    'inactive_patients' => 0,
                    'patients_with_nationality_id' => 0,
                    'recent_imports' => 0,
                ],
            ], 200); // Return 200 with error message instead of 500
        }
    }

    /**
     * Update patient status (activate/deactivate)
     */
    public function updateStatus(Request $request, Patient $patient): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'is_active' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid input',
                'errors' => $validator->errors(),
            ], 422);
        }

        $patient->update([
            'is_active' => $request->boolean('is_active'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Patient status updated successfully',
            'patient' => $patient->toSearchResult(),
        ]);
    }

    /**
     * Bulk update patient status
     */
    public function bulkUpdateStatus(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'patient_ids' => 'required|array|min:1',
            'patient_ids.*' => 'exists:patients,id',
            'is_active' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid input',
                'errors' => $validator->errors(),
            ], 422);
        }

        $updatedCount = Patient::whereIn('id', $request->patient_ids)
            ->update(['is_active' => $request->boolean('is_active')]);

        return response()->json([
            'success' => true,
            'message' => "Updated status for {$updatedCount} patients",
            'updated_count' => $updatedCount,
        ]);
    }

    /**
     * Download import template
     */
    public function downloadTemplate(): JsonResponse
    {
        try {
            // Create a sample Excel file with headers
            $templateData = [
                ['Name', 'MRN', 'Nationality_ID'],
                ['John Doe', 'JMC0159353', '820403125160'],
                ['Jane Smith', 'JMC0159354', '700912125496'],
            ];

            // For now, return the template structure
            // In a real implementation, you'd generate an actual Excel file
            return response()->json([
                'success' => true,
                'message' => 'Template structure',
                'template' => [
                    'required_columns' => ['Name', 'MRN'],
                    'optional_columns' => ['Nationality_ID'],
                    'sample_data' => $templateData,
                    'instructions' => [
                        'Name: Patient full name (required)',
                        'MRN: Medical Record Number (required, unique)',
                        'Nationality_ID: Patient nationality identification (optional)',
                    ],
                ],
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate template: ' . $e->getMessage(),
            ], 500);
        }
    }
}
