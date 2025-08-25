<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\BatchRequest;
use Illuminate\Support\Facades\Auth;

class TestBatchRequestApi extends Command
{
    protected $signature = 'test:batch-request-api';
    protected $description = 'Test the batch request API response structure';

    public function handle()
    {
        $this->info('Testing batch request API...');

        // Test with CA user
        $caUser = User::where('email', 'ca@cnrs.test')->first();
        if (!$caUser) {
            $this->error('CA user not found');
            return 1;
        }

        $this->info("User: {$caUser->name} ({$caUser->email})");
        $this->info("Roles: " . $caUser->getRoleNames()->join(', '));
        $this->info("Has CA role: " . ($caUser->hasRole('CA') ? 'Yes' : 'No'));

        // Test batch requests query
        $query = BatchRequest::with(['requestedBy', 'processedBy']);
        $query->where('requested_by_user_id', $caUser->id);
        $batchRequests = $query->orderBy('created_at', 'desc')->get();

        $this->info("Found {$batchRequests->count()} batch requests");

        // Simulate the API response structure
        $response = [
            'success' => true,
            'batch_requests' => $batchRequests,
        ];

        $this->info('API Response structure:');
        $this->info('Keys: ' . implode(', ', array_keys($response)));
        $this->info('Success: ' . ($response['success'] ? 'true' : 'false'));
        $this->info('Batch requests count: ' . count($response['batch_requests']));

        return 0;
    }
}
