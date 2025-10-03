<?php
// Quick API Authentication Test Script
// Place this in your CNRS/public directory and access via browser

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h2>CNRS API Authentication Debug</h2>";

// Test 1: Check if Laravel is running
echo "<h3>1. Laravel Health Check:</h3>";
try {
    $healthUrl = 'http://10.2.10.178/CNRS/public/api/health';
    $healthResponse = file_get_contents($healthUrl);
    echo "<p style='color: green;'>✓ Laravel API is running</p>";
    echo "<pre>$healthResponse</pre>";
} catch (Exception $e) {
    echo "<p style='color: red;'>✗ Laravel API is not accessible: " . $e->getMessage() . "</p>";
}

// Test 2: Check auth routes
echo "<h3>2. Test Protected Route (should fail without token):</h3>";
try {
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => 'Content-Type: application/json'
        ]
    ]);
    $response = file_get_contents('http://10.2.10.178/CNRS/public/api/filing-requests/ca', false, $context);
    echo "<p style='color: red;'>✗ Route accessible without auth (this is wrong!)</p>";
    echo "<pre>$response</pre>";
} catch (Exception $e) {
    echo "<p style='color: green;'>✓ Route properly protected (returns 401/500 without token)</p>";
}

// Test 3: Check Laravel logs
echo "<h3>3. Recent Laravel Logs:</h3>";
$logFile = '../storage/logs/laravel.log';
if (file_exists($logFile)) {
    $logs = file($logFile);
    $recentLogs = array_slice($logs, -10); // Last 10 lines
    echo "<pre>" . implode('', $recentLogs) . "</pre>";
} else {
    echo "<p>No log file found</p>";
}

echo "<hr>";
echo "<p><strong>Next Steps:</strong></p>";
echo "<ul>";
echo "<li>If health check passes but protected routes fail, your fix worked!</li>";
echo "<li>Check your frontend localStorage for 'cnrs_token'</li>";
echo "<li>Verify token is being sent in Authorization header</li>";
echo "<li>Check Laravel logs for specific errors</li>";
echo "</ul>";
?>
