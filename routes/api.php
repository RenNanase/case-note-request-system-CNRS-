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
    Route::get('requests/{id}', [App\Http\Controllers\Api\RequestController::class, 'show']);
    Route::put('requests/{id}', [App\Http\Controllers\Api\RequestController::class, 'update']);
    Route::delete('requests/{id}', [App\Http\Controllers\Api\RequestController::class, 'destroy']);
    Route::post('requests/{id}/approve', [App\Http\Controllers\Api\RequestController::class, 'approve']);
    Route::post('requests/{id}/reject', [App\Http\Controllers\Api\RequestController::class, 'reject']);
    Route::post('requests/{id}/complete', [App\Http\Controllers\Api\RequestController::class, 'complete']);

    // Patient search
    Route::get('patients/search', [App\Http\Controllers\Api\PatientController::class, 'search']);
    Route::get('patients/{patient}', [App\Http\Controllers\Api\PatientController::class, 'show']);

    // Dashboard stats
    Route::get('dashboard/stats', [App\Http\Controllers\Api\RequestController::class, 'getStats']);

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
            Route::patch('{patient}/status', [App\Http\Controllers\Api\Admin\AdminPatientController::class, 'updateStatus']);
            Route::patch('bulk-status', [App\Http\Controllers\Api\Admin\AdminPatientController::class, 'bulkUpdateStatus']);
        });
    });

    // Handover routes
    Route::post('/handovers', [App\Http\Controllers\Api\HandoverController::class, 'store']);
    Route::post('/handovers/{handoverId}/verify', [App\Http\Controllers\Api\HandoverController::class, 'verifyReceived']);
    Route::get('/handovers/pending', [App\Http\Controllers\Api\HandoverController::class, 'getPendingHandovers']);
    Route::get('/handovers/history', [App\Http\Controllers\Api\HandoverController::class, 'getHandoverHistory']);
    Route::get('/handovers/stats', [App\Http\Controllers\Api\HandoverController::class, 'getHandoverStats']);
    Route::get('/requests/{requestId}/handovers', [App\Http\Controllers\Api\HandoverController::class, 'getRequestHandovers']);

    // User routes
    Route::get('/users', [App\Http\Controllers\Api\UserController::class, 'getUsersByRole']);
    Route::get('/profile', [App\Http\Controllers\Api\UserController::class, 'profile']);

    // Batch request routes
    Route::prefix('batch-requests')->group(function () {
        Route::post('/', [App\Http\Controllers\Api\BatchRequestController::class, 'store']);
        Route::get('/', [App\Http\Controllers\Api\BatchRequestController::class, 'index']);
        Route::get('/{id}', [App\Http\Controllers\Api\BatchRequestController::class, 'show']);
        Route::post('/{id}/process', [App\Http\Controllers\Api\BatchRequestController::class, 'process']);
        Route::post('/{id}/verify-receipt', [App\Http\Controllers\Api\BatchRequestController::class, 'verifyReceipt']);
        Route::post('/{id}/verify-individual', [App\Http\Controllers\Api\BatchRequestController::class, 'verifyIndividualReceipt']);
        Route::get('/stats', [App\Http\Controllers\Api\BatchRequestController::class, 'getStats']);
    });

    // Case note verification routes
    Route::prefix('case-notes')->group(function () {
        Route::get('/approved-for-verification', [App\Http\Controllers\Api\CaseNoteVerificationController::class, 'getApprovedForVerification']);
        Route::post('/verify-received', [App\Http\Controllers\Api\CaseNoteVerificationController::class, 'verifyReceived']);
    });
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




