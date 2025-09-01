<?php

use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Models\Request as CaseNoteRequest;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public authentication routes
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('check-email', [AuthController::class, 'checkEmail']);
    Route::get('roles', [AuthController::class, 'roles']);
});

// Protected API routes (require authentication)
Route::middleware('auth:api')->group(function () {

    // Authentication routes
    Route::prefix('auth')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('change-password', [AuthController::class, 'changePassword']);
    });

    // Test route to verify authentication
    Route::get('test', function (HttpRequest $request) {
        return response()->json([
            'success' => true,
            'message' => 'API authentication working!',
            'user' => [
                'name' => $request->user()->name,
                'email' => $request->user()->email,
                'roles' => $request->user()->getRoleNames(),
            ]
        ]);
    });

    // Case Note Requests
    Route::get('requests', [App\Http\Controllers\Api\RequestController::class, 'index']);
    Route::post('requests', [App\Http\Controllers\Api\RequestController::class, 'store']);

    // Return Case Notes - show all case notes user has been involved with
    Route::get('requests/returnable', [App\Http\Controllers\Api\RequestController::class, 'getReturnableCaseNotes']);

    Route::get('requests/{id}', [App\Http\Controllers\Api\RequestController::class, 'show']);
    Route::put('requests/{id}', [App\Http\Controllers\Api\RequestController::class, 'update']);
    Route::delete('requests/{id}', [App\Http\Controllers\Api\RequestController::class, 'destroy']);
    Route::post('requests/{id}/approve', [App\Http\Controllers\Api\RequestController::class, 'approve']);
    Route::post('requests/{id}/reject', [App\Http\Controllers\Api\RequestController::class, 'reject']);
    Route::post('requests/{id}/complete', [App\Http\Controllers\Api\RequestController::class, 'complete']);

    // Individual Case Note Requests (for CAs)
    Route::prefix('individual-requests')->group(function () {
        Route::get('/', [App\Http\Controllers\Api\IndividualRequestController::class, 'index']);
        Route::post('/', [App\Http\Controllers\Api\IndividualRequestController::class, 'store']);
        Route::get('/stats', [App\Http\Controllers\Api\IndividualRequestController::class, 'getStats']);
        Route::get('/{id}', [App\Http\Controllers\Api\IndividualRequestController::class, 'show']);
        Route::put('/{id}', [App\Http\Controllers\Api\IndividualRequestController::class, 'update']);
        Route::delete('/{id}', [App\Http\Controllers\Api\IndividualRequestController::class, 'destroy']);
    });

    // Patient search
    Route::get('patients/search', [App\Http\Controllers\Api\PatientController::class, 'search']);
    Route::get('patients/{patient}', [App\Http\Controllers\Api\PatientController::class, 'show']);
    Route::get('patients/mrn/{mrn}/case-note-request', [App\Http\Controllers\Api\PatientController::class, 'getCaseNoteRequestId']);

    // Dashboard stats - optimized single endpoint
    Route::get('dashboard/stats', [App\Http\Controllers\Api\DashboardController::class, 'getStats']);

    // Resource endpoints for form options
    Route::prefix('resources')->group(function () {
        Route::get('departments', [App\Http\Controllers\Api\ResourceController::class, 'departments']);
        Route::get('doctors', [App\Http\Controllers\Api\ResourceController::class, 'doctors']);
        Route::get('locations', [App\Http\Controllers\Api\ResourceController::class, 'locations']);
        Route::get('priorities', [App\Http\Controllers\Api\ResourceController::class, 'priorities']);
        Route::get('statuses', [App\Http\Controllers\Api\ResourceController::class, 'statuses']);
    });

    // Admin routes (requires admin role)
    Route::prefix('admin')->middleware('admin')->group(function () {
        // Patient management
        Route::prefix('patients')->group(function () {
            Route::get('/', [App\Http\Controllers\Api\Admin\AdminPatientController::class, 'index']);
            Route::get('statistics', [App\Http\Controllers\Api\Admin\AdminPatientController::class, 'statistics']);
            Route::post('import-excel', [App\Http\Controllers\Api\Admin\AdminPatientController::class, 'importExcel']);
            Route::get('import-template', [App\Http\Controllers\Api\Admin\AdminPatientController::class, 'downloadTemplate']);
            Route::get('import-progress', [App\Http\Controllers\Api\Admin\AdminPatientController::class, 'getImportProgress']);
            Route::post('import/{id}/cancel', [App\Http\Controllers\Api\Admin\AdminPatientController::class, 'cancelImport']);
            Route::patch('{patient}/status', [App\Http\Controllers\Api\Admin\AdminPatientController::class, 'updateStatus']);
            Route::patch('bulk-status', [App\Http\Controllers\Api\Admin\AdminPatientController::class, 'bulkUpdateStatus']);
        });

        // Doctor management
        Route::prefix('doctors')->group(function () {
            Route::get('/', [App\Http\Controllers\Api\DoctorController::class, 'index']);
            Route::post('/', [App\Http\Controllers\Api\DoctorController::class, 'store']);
            Route::get('/{doctor}', [App\Http\Controllers\Api\DoctorController::class, 'show']);
            Route::put('/{doctor}', [App\Http\Controllers\Api\DoctorController::class, 'update']);
            Route::delete('/{doctor}', [App\Http\Controllers\Api\DoctorController::class, 'destroy']);
            Route::patch('/{doctor}/toggle-status', [App\Http\Controllers\Api\DoctorController::class, 'toggleStatus']);
        });

        // User management
        Route::prefix('users')->group(function () {
            Route::get('/', [App\Http\Controllers\Api\UserController::class, 'index']);
            Route::post('/', [App\Http\Controllers\Api\UserController::class, 'store']);
            Route::get('/statistics', [App\Http\Controllers\Api\UserController::class, 'statistics']);
            Route::get('/{id}', [App\Http\Controllers\Api\UserController::class, 'show']);
            Route::put('/{id}', [App\Http\Controllers\Api\UserController::class, 'update']);
            Route::post('/{id}/reset-password', [App\Http\Controllers\Api\UserController::class, 'resetPassword']);
            Route::post('/{id}/toggle-status', [App\Http\Controllers\Api\UserController::class, 'toggleStatus']);
        });
    });

    // Handover routes
    Route::post('/handovers', [App\Http\Controllers\Api\HandoverController::class, 'store']);
    Route::post('/handovers/{handoverId}/verify', [App\Http\Controllers\Api\HandoverController::class, 'verifyReceived']);
    Route::post('/handovers/{handoverId}/verify-receipt', [App\Http\Controllers\Api\HandoverController::class, 'verifyReceipt']);
    Route::get('/handovers/pending', [App\Http\Controllers\Api\HandoverController::class, 'getPendingHandovers']);
    Route::get('/handovers/acknowledged', [App\Http\Controllers\Api\HandoverController::class, 'getAcknowledgedHandovers']);
    Route::get('/handovers/needing-verification', [App\Http\Controllers\Api\HandoverController::class, 'getHandoversNeedingVerification']);
    Route::get('/handovers/needing-acknowledgement', [App\Http\Controllers\Api\HandoverController::class, 'getHandoversNeedingAcknowledgement']);
    Route::get('/handovers/history', [App\Http\Controllers\Api\HandoverController::class, 'getHandoverHistory']);
    Route::get('/handovers/stats', [App\Http\Controllers\Api\HandoverController::class, 'getHandoverStats']);
    Route::get('/requests/{requestId}/handovers', [App\Http\Controllers\Api\HandoverController::class, 'getRequestHandovers']);

    // User routes (legacy compatibility)
    Route::get('/users', [App\Http\Controllers\Api\UserController::class, 'getUsersByRole']);
    Route::get('/profile', [App\Http\Controllers\Api\UserController::class, 'profile']);

    // Batch request routes
    Route::prefix('batch-requests')->group(function () {
        Route::post('/', [App\Http\Controllers\Api\BatchRequestController::class, 'store']);
        Route::get('/', [App\Http\Controllers\Api\BatchRequestController::class, 'index']);
        Route::get('/test', [App\Http\Controllers\Api\BatchRequestController::class, 'test']);
        Route::get('/{id}', [App\Http\Controllers\Api\BatchRequestController::class, 'show']);
        Route::post('/{id}/process', [App\Http\Controllers\Api\BatchRequestController::class, 'process']);
        Route::post('/{id}/verify-receipt', [App\Http\Controllers\Api\BatchRequestController::class, 'verifyReceipt']);
        Route::post('/{id}/verify-individual', [App\Http\Controllers\Api\BatchRequestController::class, 'verifyIndividualReceipt']);
        Route::get('/stats', [App\Http\Controllers\Api\BatchRequestController::class, 'getStats']);
    });

    // Case note verification routes
    Route::prefix('case-notes')->group(function () {
        Route::get('/approved-for-verification', [App\Http\Controllers\Api\RequestController::class, 'getApprovedCaseNotesForVerification']);
        Route::post('/verify-received', [App\Http\Controllers\Api\RequestController::class, 'verifyCaseNotesReceived']);
        Route::post('/reject-not-received', [App\Http\Controllers\Api\RequestController::class, 'rejectCaseNotesNotReceived']);
                Route::get('/returnable', [App\Http\Controllers\Api\RequestController::class, 'getReturnableCaseNotes']);
        Route::get('/pending-verification', [App\Http\Controllers\Api\RequestController::class, 'getPendingVerificationCaseNotes']);
        Route::post('/return', [App\Http\Controllers\Api\RequestController::class, 'returnCaseNotes']);

        // MR Staff Returned Case Notes routes
        Route::get('/returned-submissions', [App\Http\Controllers\Api\RequestController::class, 'getReturnedSubmissions']);
        Route::post('/verify-returned', [App\Http\Controllers\Api\RequestController::class, 'verifyReturnedCaseNotes']);
    });

    // Case note timeline routes
    Route::get('/case-notes/search', [App\Http\Controllers\Api\CaseNoteTimelineController::class, 'search']);
    Route::get('/case-notes/{caseNoteId}/timeline', [App\Http\Controllers\Api\CaseNoteTimelineController::class, 'getTimeline']);
    Route::post('/case-notes/timeline/update-doctor-info', [App\Http\Controllers\Api\CaseNoteTimelineController::class, 'updateExistingEventsWithDoctorInfo']);

    // Handover request routes
    Route::post('/case-notes/{caseNoteId}/request-handover', [App\Http\Controllers\Api\HandoverRequestController::class, 'requestHandover']);
    Route::get('/handover-requests/my-requests', [App\Http\Controllers\Api\HandoverRequestController::class, 'getMyHandoverRequests']);
    Route::get('/handover-requests/incoming', [App\Http\Controllers\Api\HandoverRequestController::class, 'getIncomingHandoverRequests']);
    Route::get('/handover-requests/incoming-all', [App\Http\Controllers\Api\HandoverRequestController::class, 'getAllIncomingHandoverRequests']);
    Route::get('/handover-requests/pending-verification', [App\Http\Controllers\Api\HandoverRequestController::class, 'getHandoverRequestsPendingVerification']);
    Route::post('/handover-requests/{handoverRequestId}/respond', [App\Http\Controllers\Api\HandoverRequestController::class, 'respondToHandoverRequest']);
    Route::post('/handover-requests/{handoverRequestId}/verify', [App\Http\Controllers\Api\HandoverRequestController::class, 'verifyHandoverRequest']);
});

// Health check route (public)
Route::get('health', function () {
    return response()->json([
        'status' => 'healthy',
        'timestamp' => now()->toISOString(),
        'version' => config('app.version', '1.0.0'),
        'service' => 'CNRS API'
    ]);
});




