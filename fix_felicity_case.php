<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Request;
use App\Models\HandoverRequest;

echo "=== FIXING FELICITY KISSOL CASE NOTE ===" . PHP_EOL;

// Find Felicity's case note (ID 2 based on the JSON data)
$felicityCase = Request::find(2);

if ($felicityCase) {
    echo "Found Felicity case note (ID: {$felicityCase->id})" . PHP_EOL;
    echo "Current PIC User ID: " . ($felicityCase->current_pic_user_id ?? 'NULL') . PHP_EOL;
    
    // Find the handover request for this case note
    $handoverRequest = HandoverRequest::where('case_note_id', 2)
        ->where('status', 'verified')
        ->first();
    
    if ($handoverRequest) {
        echo "Found handover request (ID: {$handoverRequest->id})" . PHP_EOL;
        echo "Requested by user ID: {$handoverRequest->requested_by_user_id}" . PHP_EOL;
        
        // Update the case note to have the correct current_pic_user_id
        $felicityCase->update([
            'current_pic_user_id' => $handoverRequest->requested_by_user_id // Should be Nami (user_id: 4)
        ]);
        
        echo "Updated current_pic_user_id to: {$handoverRequest->requested_by_user_id}" . PHP_EOL;
        echo "Case note should now appear under Nami's dashboard" . PHP_EOL;
    } else {
        echo "No verified handover request found for this case note" . PHP_EOL;
    }
} else {
    echo "Felicity case note not found" . PHP_EOL;
}

echo "=== FIX COMPLETE ===" . PHP_EOL;
