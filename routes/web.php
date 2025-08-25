<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\File;

Route::get('/', function () {
    $indexPath = public_path('frontend/index.html');

    if (file_exists($indexPath)) {
        return response(File::get($indexPath), 200)
            ->header('Content-Type', 'text/html');
    }

    return view('welcome');
});

// Serve frontend assets
Route::get('/frontend/assets/{file}', function ($file) {
    $path = public_path("frontend/assets/{$file}");
    
    if (!file_exists($path)) {
        abort(404);
    }
    
    $extension = pathinfo($path, PATHINFO_EXTENSION);
    $mimeType = match($extension) {
        'css' => 'text/css',
        'js' => 'application/javascript',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg', 'jpeg' => 'image/jpeg',
        default => 'application/octet-stream'
    };
    
    return response(File::get($path), 200)
        ->header('Content-Type', $mimeType);
})->where('file', '.*');

// Serve frontend root files
Route::get('/frontend/{file}', function ($file) {
    $path = public_path("frontend/{$file}");
    
    if (!file_exists($path)) {
        abort(404);
    }
    
    $extension = pathinfo($path, PATHINFO_EXTENSION);
    $mimeType = match($extension) {
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
        default => 'application/octet-stream'
    };
    
    return response(File::get($path), 200)
        ->header('Content-Type', $mimeType);
})->where('file', '[^/]+');

// Serve assets directly from /assets/ path (for Vite builds)
Route::get('/assets/{file}', function ($file) {
    $path = public_path("frontend/assets/{$file}");
    
    if (!file_exists($path)) {
        abort(404);
    }
    
    $extension = pathinfo($path, PATHINFO_EXTENSION);
    $mimeType = match($extension) {
        'css' => 'text/css',
        'js' => 'application/javascript',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg', 'jpeg' => 'image/jpeg',
        default => 'application/octet-stream'
    };
    
    return response(File::get($path), 200)
        ->header('Content-Type', $mimeType);
})->where('file', '.*');

// Serve vite.svg from frontend directory
Route::get('/vite.svg', function () {
    $path = public_path('frontend/vite.svg');
    
    if (!file_exists($path)) {
        abort(404);
    }
    
    return response(File::get($path), 200)
        ->header('Content-Type', 'image/svg+xml');
});

// Handle client-side routing for React Router
// This should be last to catch all non-API, non-frontend routes
Route::fallback(function () {
    $indexPath = public_path('frontend/index.html');

    if (file_exists($indexPath)) {
        return response(File::get($indexPath), 200)
            ->header('Content-Type', 'text/html');
    }

    abort(404);
});
