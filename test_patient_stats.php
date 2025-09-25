<?php

require_once 'bootstrap/app.php';

use App\Http\Controllers\Api\Admin\AdminPatientController;
use Illuminate\Http\Request;

try {
    $controller = new AdminPatientController();
    $response = $controller->statistics();
    
    echo "Patient Statistics API Response:\n";
    echo "================================\n";
    echo $response->getContent();
    echo "\n\nFormatted:\n";
    echo "=========\n";
    $data = json_decode($response->getContent(), true);
    echo "Success: " . ($data['success'] ? 'true' : 'false') . "\n";
    echo "Total Patients: " . number_format($data['statistics']['total_patients']) . "\n";
    
    if ($data['statistics']['last_import']) {
        echo "Last Import:\n";
        echo "  - Date: " . $data['statistics']['last_import']['date'] . "\n";
        echo "  - File: " . $data['statistics']['last_import']['file_name'] . "\n";
        echo "  - Count: " . number_format($data['statistics']['last_import']['imported_count']) . " patients\n";
        echo "  - User: " . $data['statistics']['last_import']['user_name'] . "\n";
    } else {
        echo "No last import data available.\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
