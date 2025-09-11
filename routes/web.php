<?php

use Illuminate\Support\Facades\Route;

// Root route - serve the React app (let frontend handle routing)
Route::get('/', function () {
    $frontendPath = public_path('index.html');
    
    if (!file_exists($frontendPath)) {
        abort(500, 'Frontend file not found: ' . $frontendPath);
    }
    
    return response()->file($frontendPath);
});

// Login route - serve the React app
Route::get('/login', function () {
    $frontendPath = public_path('index.html');
    
    if (!file_exists($frontendPath)) {
        abort(500, 'Frontend file not found: ' . $frontendPath);
    }
    
    return response()->file($frontendPath);
});

// Debug route to test file serving
Route::get('/debug', function () {
    $frontendPath = public_path('frontend/index.html');
    $exists = file_exists($frontendPath);

    return response()->json([
        'frontend_path' => $frontendPath,
        'file_exists' => $exists,
        'public_path' => public_path(),
        'base_path' => base_path(),
        'current_path' => request()->path(),
        'full_url' => request()->fullUrl(),
        'message' => 'Debug information'
    ]);
});

// Test route to serve a simple HTML file
Route::get('/test', function () {
    return response()->file(public_path('test.php'));
});

// Note: API routes are handled in routes/api.php

// Frontend route - serve the React app for ALL other routes (excluding API)
Route::get('/{any?}', function ($any = null) {
    // Skip API routes completely - let Laravel handle them via api.php
    if (str_starts_with($any, 'api/') || $any === 'api') {
        abort(404);
    }

    // Skip debug and test routes
    if (in_array($any, ['debug', 'test'])) {
        abort(404);
    }

    // Skip asset files completely - let Apache handle them
    if (str_starts_with($any, 'build/') || 
        str_starts_with($any, 'assets.php')) {
        abort(404);
    }

    // Skip if it's a file that exists (let Apache serve it)
    if (file_exists(public_path($any))) {
        abort(404);
    }

    // Serve React app for everything else
    $frontendPath = public_path('index.html');

    if (!file_exists($frontendPath)) {
        abort(500, 'Frontend file not found: ' . $frontendPath);
    }

    return response()->file($frontendPath);
})->where('any', '.*');
