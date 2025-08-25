<?php

require 'vendor/autoload.php';

$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    $count = App\Models\Patient::count();
    echo "Total patients: $count\n";
    
    if ($count > 0) {
        $patients = App\Models\Patient::take(3)->get();
        echo "\nFirst 3 patients:\n";
        foreach ($patients as $patient) {
            echo "- ID: {$patient->id}, MRN: {$patient->mrn}, Name: {$patient->name}, Nationality ID: {$patient->nationality_id}\n";
        }
        
        // Test search functionality
        echo "\nTesting search for first patient...\n";
        $firstPatient = $patients->first();
        if ($firstPatient) {
            $searchResults = App\Models\Patient::search($firstPatient->name)->get();
            echo "Search results for '{$firstPatient->name}': " . $searchResults->count() . " found\n";
        }
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
