<?php
/**
 * Asset Server - Serves frontend assets with correct MIME types
 * This bypasses Apache MIME type issues
 */

// Get the requested asset path
$requestUri = $_SERVER['REQUEST_URI'];

// Handle both local and network server paths
// Remove /CNRS/public/assets.php/ or /assets.php/ from the URI
$assetPath = $requestUri;
$assetPath = str_replace('/CNRS/public/assets.php/', '', $assetPath);
$assetPath = str_replace('/assets.php/', '', $assetPath);

// Security: Only allow assets from frontend directory
if (!str_starts_with($assetPath, 'frontend/')) {
    http_response_code(403);
    exit('Access denied');
}

// Build the full file path
$fullPath = __DIR__ . '/' . $assetPath;

// Check if file exists
if (!file_exists($fullPath)) {
    http_response_code(404);
    exit('File not found');
}

// Get file extension
$extension = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));

// Set correct MIME type based on extension
switch ($extension) {
    case 'js':
        header('Content-Type: application/javascript');
        break;
    case 'css':
        header('Content-Type: text/css');
        break;
    case 'png':
        header('Content-Type: image/png');
        break;
    case 'jpg':
    case 'jpeg':
        header('Content-Type: image/jpeg');
        break;
    case 'svg':
        header('Content-Type: image/svg+xml');
        break;
    case 'ico':
        header('Content-Type: image/x-icon');
        break;
    case 'woff':
        header('Content-Type: font/woff');
        break;
    case 'woff2':
        header('Content-Type: font/woff2');
        break;
    case 'ttf':
        header('Content-Type: font/ttf');
        break;
    case 'eot':
        header('Content-Type: application/vnd.ms-fontobject');
        break;
    default:
        header('Content-Type: application/octet-stream');
}

// Set cache headers for better performance
header('Cache-Control: public, max-age=31536000'); // 1 year
header('Expires: ' . gmdate('D, d M Y H:i:s \G\M\T', time() + 31536000));

// Serve the file
readfile($fullPath);
exit;
?>
