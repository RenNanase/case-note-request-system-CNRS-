<?php

require 'vendor/autoload.php';

$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Http\Controllers\Api\PatientController;
use Illuminate\Http\Request;

try {
    echo "Testing PatientController directly...\n";
    
    // Create a mock request
    $request = new Request(['search' => 'Ahmad']);
    
    $controller = new PatientController();
    $response = $controller->search($request);
    
    echo "Response status: " . $response->getStatusCode() . "\n";
    echo "Response content: " . $response->getContent() . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
