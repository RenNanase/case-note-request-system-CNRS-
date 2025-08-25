<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Request;

class CheckRequests extends Command
{
    protected $signature = 'requests:check';
    protected $description = 'Check all requests in the database';

    public function handle()
    {
        $this->info("=== CHECKING REQUESTS TABLE ===");

        $requests = Request::with('requestedBy')->get();

        if ($requests->count() === 0) {
            $this->info("No requests found in database.");
            return 0;
        }

        $this->info("Found {$requests->count()} request(s):");

        foreach ($requests as $request) {
            $owner = $request->requestedBy ? $request->requestedBy->email : 'Unknown';
            $this->info("Request ID: {$request->id}, Owner: {$owner}, Status: {$request->status}, Created: {$request->created_at}");
        }

        return 0;
    }
}
