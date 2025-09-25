<?php

use Illuminate\Support\Facades\Route;

// Root route - serve the React app using Blade template
Route::get('/', function () {
    return view('app');
});

// Login route - serve the React app using Blade template
Route::get('/login', function () {
    return view('app');
})->name('login');

// Public routes - serve the standalone React app with cache-busting headers
Route::get('/public', function () {
    return response()->file(public_path('frontend/index.html'), [
        'Cache-Control' => 'no-cache, no-store, must-revalidate',
        'Pragma' => 'no-cache',
        'Expires' => '0'
    ]);
});

Route::get('/public/login', function () {
    return response()->file(public_path('frontend/index.html'), [
        'Cache-Control' => 'no-cache, no-store, must-revalidate',
        'Pragma' => 'no-cache',
        'Expires' => '0'
    ]);
});

// Handle all /public/* routes for React routing
Route::get('/public/{any?}', function ($any = null) {
    // Skip asset files - let Apache serve them
    if (str_starts_with($any, 'assets/') || str_contains($any, '.')) {
        abort(404);
    }
    
    return response()->file(public_path('frontend/index.html'), [
        'Cache-Control' => 'no-cache, no-store, must-revalidate',
        'Pragma' => 'no-cache',
        'Expires' => '0'
    ]);
})->where('any', '.*');

// Debug route to test file serving
Route::get('/debug', function () {
    $frontendPath = public_path('frontend/index.html');
    $manifestPath = public_path('frontend/.vite/manifest.json');
    $exists = file_exists($frontendPath);
    $manifestExists = file_exists($manifestPath);
    
    $manifest = null;
    if ($manifestExists) {
        $manifest = json_decode(file_get_contents($manifestPath), true);
    }

    return response()->json([
        'frontend_path' => $frontendPath,
        'file_exists' => $exists,
        'manifest_exists' => $manifestExists,
        'manifest_data' => $manifest,
        'assets_dir' => scandir(public_path('frontend/assets')),
        'public_path' => public_path(),
        'base_path' => base_path(),
        'current_path' => request()->path(),
        'full_url' => request()->fullUrl(),
        'timestamp' => now(),
        'message' => 'Debug information with cache-busting'
    ], 200, [
        'Cache-Control' => 'no-cache, no-store, must-revalidate',
        'Pragma' => 'no-cache',
        'Expires' => '0'
    ]);
});

// Test route to serve a simple HTML file
Route::get('/test', function () {
    return response()->file(public_path('test.php'));
});

// Note: API routes are handled in routes/api.php

// Frontend route - serve the React app for ALL other routes (excluding API and /public)
Route::get('/{any?}', function ($any = null) {
    // Skip public routes - they are handled above
    if (str_starts_with($any, 'public/') || $any === 'public') {
        abort(404);
    }

    // Skip debug and test routes
    if (in_array($any, ['debug', 'test'])) {
        abort(404);
    }

    // Skip asset files completely - let Apache handle them
    if (str_starts_with($any, 'build/') || 
        str_starts_with($any, 'frontend/') ||
        str_starts_with($any, 'assets.php')) {
        abort(404);
    }

    // Skip if it's a file that exists (let Apache serve it)
    if (file_exists(public_path($any))) {
        abort(404);
    }

    // Serve React app for everything else using Blade template
    return view('app');
})->where('any', '(?!api).*');
