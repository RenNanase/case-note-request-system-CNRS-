<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Request;
use App\Models\User;
use App\Models\Patient;
use App\Models\HandoverRequest;

echo "=== DEBUG: Case Notes Ownership Issue ===" . PHP_EOL . PHP_EOL;

// Find all users
$users = User::all();
echo "=== USERS ===" . PHP_EOL;
foreach ($users as $user) {
    echo "ID: {$user->id} | Name: {$user->name} | Email: {$user->email}" . PHP_EOL;
}

echo PHP_EOL . "=== ALL CASE NOTES ===" . PHP_EOL;
$requests = Request::with(['patient', 'requestedBy'])->get();
foreach ($requests as $req) {
    if ($req->patient) {
        $currentPicUser = User::find($req->current_pic_user_id);
        $requestedByUser = User::find($req->requested_by_user_id);
        
        echo "Request ID: {$req->id}" . PHP_EOL;
        echo "  Patient: {$req->patient->name}" . PHP_EOL;
        echo "  Status: {$req->status}" . PHP_EOL;
        echo "  Handover Status: {$req->handover_status}" . PHP_EOL;
        echo "  Current PIC ID: {$req->current_pic_user_id} ({$currentPicUser->name})" . PHP_EOL;
        echo "  Requested By ID: {$req->requested_by_user_id} ({$requestedByUser->name})" . PHP_EOL;
        echo "  Is Received: " . ($req->is_received ? 'Yes' : 'No') . PHP_EOL;
        echo "  Is Returned: " . ($req->is_returned ? 'Yes' : 'No') . PHP_EOL;
        echo "  Is Rejected Return: " . ($req->is_rejected_return ? 'Yes' : 'No') . PHP_EOL;
        
        // Check handover requests
        $handovers = HandoverRequest::where('case_note_id', $req->id)->get();
        if ($handovers->count() > 0) {
            echo "  Handover Requests:" . PHP_EOL;
            foreach ($handovers as $hr) {
                $requester = User::find($hr->requested_by_user_id);
                $holder = User::find($hr->current_holder_user_id);
                echo "    ID: {$hr->id} | Status: {$hr->status} | Requested by: {$requester->name} | From: {$holder->name}" . PHP_EOL;
            }
        }
        echo PHP_EOL;
    }
}

echo "=== FELICITY KISSOL SEARCH ===" . PHP_EOL;
$felicityCase = Request::whereHas('patient', function($query) {
    $query->where('name', 'like', '%Felicity%')
          ->orWhere('name', 'like', '%Kissol%');
})->first();

if ($felicityCase) {
    echo "Found Felicity case!" . PHP_EOL;
    echo "Request ID: {$felicityCase->id}" . PHP_EOL;
    echo "Patient: {$felicityCase->patient->name}" . PHP_EOL;
    echo "Current PIC: {$felicityCase->current_pic_user_id}" . PHP_EOL;
} else {
    echo "Felicity case not found" . PHP_EOL;
}

echo PHP_EOL . "=== RETURNABLE CASE NOTES FOR EACH USER ===" . PHP_EOL;
foreach ($users->where('email', 'like', '%@cnrs.test') as $user) {
    echo "User: {$user->name} (ID: {$user->id})" . PHP_EOL;
    
    $returnableCases = Request::with(['patient'])
        ->where(function($query) use ($user) {
            $query->where(function($q) use ($user) {
                // Case notes currently assigned to me that are approved/completed and received
                $q->where('current_pic_user_id', $user->id)
                  ->whereIn('status', ['approved', 'completed'])
                  ->where('is_received', 1)
                  ->where(function($subQ) {
                      $subQ->where('is_returned', false) // Not yet returned
                           ->orWhere('is_rejected_return', true); // OR it was rejected and can be re-returned
                  });
            })->orWhere(function($q) use ($user) {
                // Case notes that were returned by me but rejected by MR staff (need to be re-returned)
                $q->where('returned_by_user_id', $user->id)
                  ->where('is_rejected_return', true)
                  ->where('status', 'approved')
                  ->where('is_received', true);
            });
        })
        ->get();
    
    if ($returnableCases->count() > 0) {
        foreach ($returnableCases as $case) {
            echo "  - {$case->patient->name} (ID: {$case->id}) | Current PIC: {$case->current_pic_user_id} | Status: {$case->status}" . PHP_EOL;
        }
    } else {
        echo "  No returnable cases" . PHP_EOL;
    }
    echo PHP_EOL;
}

echo "=== END DEBUG ===" . PHP_EOL;
