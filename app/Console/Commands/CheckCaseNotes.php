<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Request;
use App\Models\User;

class CheckCaseNotes extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'check:case-notes {user_id?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check case notes in the database and debug the return case notes issue';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $userId = $this->argument('user_id') ?? 1;

        $this->info("=== Case Notes Database Check ===");

        // Check total case notes
        $totalCaseNotes = Request::count();
        $this->info("Total case notes in database: {$totalCaseNotes}");

        if ($totalCaseNotes === 0) {
            $this->error("No case notes exist in the database at all!");
            return;
        }

        // Check case notes by status
        $this->info("\n=== Case Notes by Status ===");
        $statusCounts = Request::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->get();

        foreach ($statusCounts as $status) {
            $this->line("Status '{$status->status}': {$status->count}");
        }

        // Check case notes for specific user
        $this->info("\n=== Case Notes for User ID {$userId} ===");
        $user = User::find($userId);
        if (!$user) {
            $this->error("User ID {$userId} not found!");
            return;
        }

        $this->line("User: {$user->name} ({$user->email})");
        $this->line("Roles: " . implode(', ', $user->getRoleNames()->toArray()));

        // Check case notes requested by this user
        $requestedByUser = Request::where('requested_by_user_id', $userId)->count();
        $this->line("Case notes requested by user: {$requestedByUser}");

        // Check case notes received by this user
        $receivedByUser = Request::where('received_by_user_id', $userId)->count();
        $this->line("Case notes received by user: {$receivedByUser}");

        // Check case notes that could be returnable
        $this->info("\n=== Returnable Case Notes Check ===");

        $returnableQuery = Request::where('status', 'approved')
            ->where('is_received', true)
            ->where('requested_by_user_id', $userId)
            ->where(function($query) {
                $query->where('is_returned', false)
                      ->orWhereNull('is_returned');
            })
            ->whereNotNull('received_at');

        $returnableCount = $returnableQuery->count();
        $this->line("Returnable case notes count: {$returnableCount}");

        if ($returnableCount > 0) {
            $this->info("Found returnable case notes! Details:");
            $returnableCaseNotes = $returnableQuery->with(['patient', 'requestedBy'])->get();

            foreach ($returnableCaseNotes as $cn) {
                $this->line("- ID: {$cn->id}, Patient: {$cn->patient->name}, Status: {$cn->status}, Received: " . ($cn->is_received ? 'Yes' : 'No') . ", Returned: " . ($cn->is_returned ? 'Yes' : 'No'));
            }
        } else {
            $this->warn("No returnable case notes found. Let's check why:");

            // Check each condition separately
            $approvedCount = Request::where('status', 'approved')->where('requested_by_user_id', $userId)->count();
            $this->line("Approved case notes requested by user: {$approvedCount}");

            $receivedCount = Request::where('is_received', true)->where('requested_by_user_id', $userId)->count();
            $this->line("Received case notes requested by user: {$receivedCount}");

            $notReturnedCount = Request::where('requested_by_user_id', $userId)
                ->where(function($query) {
                    $query->where('is_returned', false)
                          ->orWhereNull('is_returned');
                })->count();
            $this->line("Not returned case notes requested by user: {$notReturnedCount}");

            $hasReceivedAtCount = Request::where('requested_by_user_id', $userId)
                ->whereNotNull('received_at')->count();
            $this->line("Case notes with received_at timestamp: {$hasReceivedAtCount}");
        }

        // Show some sample case notes for debugging
        $this->info("\n=== Sample Case Notes (First 5) ===");
        $sampleCaseNotes = Request::with(['patient', 'requestedBy'])->limit(5)->get();

        foreach ($sampleCaseNotes as $cn) {
            $this->line("- ID: {$cn->id}, Patient: {$cn->patient->name}, Status: {$cn->status}, Requested by: {$cn->requestedBy->name}, Received: " . ($cn->is_received ? 'Yes' : 'No') . ", Returned: " . ($cn->is_returned ? 'Yes' : 'No'));
        }
    }
}
