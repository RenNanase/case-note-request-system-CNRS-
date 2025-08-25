<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\BatchRequest;
use App\Models\Request;

class CheckBatchVerificationData extends Command
{
    protected $signature = 'check:batch-verification-data';
    protected $description = 'Check batch verification data for CA users';

    public function handle()
    {
        $this->info('Checking batch verification data...');

        // Find CA users
        $caUsers = User::role('CA')->get();
        $this->info("Found {$caUsers->count()} CA users");

        foreach ($caUsers as $ca) {
            $this->info("\n--- CA: {$ca->name} ({$ca->email}) ---");

            // Get their batch requests
            $batches = BatchRequest::where('requested_by_user_id', $ca->id)
                ->with(['requests.patient'])
                ->get();

            $this->info("Total batches: {$batches->count()}");

            foreach ($batches as $batch) {
                $requests = $batch->requests;
                $approvedCount = $requests->where('status', Request::STATUS_APPROVED)->count();
                $receivedCount = $requests->where('status', Request::STATUS_APPROVED)
                    ->where('is_received', true)->count();

                $this->info("  Batch {$batch->batch_number}:");
                $this->info("    Status: {$batch->status}");
                $this->info("    Total requests: {$requests->count()}");
                $this->info("    Approved: {$approvedCount}");
                $this->info("    Received: {$receivedCount}");
                $this->info("    Can verify: " . ($batch->status === 'approved' && !$batch->is_verified && $approvedCount > 0 ? 'YES' : 'NO'));

                if ($batch->status === 'approved' && $approvedCount > 0) {
                    $this->info("    >> This batch should show verification button!");
                    foreach ($requests->where('status', Request::STATUS_APPROVED) as $request) {
                        $this->info("      - {$request->patient->name} (MRN: {$request->patient->mrn}) - " .
                                   ($request->is_received ? 'RECEIVED' : 'PENDING'));
                    }
                }
            }
        }

        return 0;
    }
}
