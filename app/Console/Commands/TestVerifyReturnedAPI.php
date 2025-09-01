<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Request;
use App\Models\User;

class TestVerifyReturnedAPI extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:verify-returned-api';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the verify-returned API endpoint to debug issues';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("=== Testing Verify Returned API ===");

        // Check current case notes with pending_return_verification status
        $this->info("\n=== Current Case Notes with pending_return_verification ===");
        $pendingCaseNotes = Request::with(['patient', 'doctor', 'department', 'location'])
            ->where('status', 'pending_return_verification')
            ->get();

        $this->line("Total pending verification case notes: {$pendingCaseNotes->count()}");

        foreach ($pendingCaseNotes as $cn) {
            $this->line("- ID: {$cn->id}, Patient: {$cn->patient->name}");
            $this->line("  Doctor: {$cn->doctor->name}");
            $this->line("  Department: {$cn->department->name}");
            $this->line("  Status: {$cn->status}");
            $this->line("  Is Returned: " . ($cn->is_returned ? 'Yes' : 'No'));
            $this->line("  Returned By: {$cn->returned_by_user_id}");
        }

        // Check MR Staff users
        $this->info("\n=== MR Staff Users ===");
        $mrStaffUsers = User::role('MR_STAFF')->get();

        foreach ($mrStaffUsers as $user) {
            $this->line("- ID: {$user->id}, Name: {$user->name}, Email: {$user->email}");
        }

        // Simulate the API call logic
        $this->info("\n=== Simulating API Logic ===");

        if ($pendingCaseNotes->isNotEmpty()) {
            $caseNote = $pendingCaseNotes->first();
            $this->line("Testing with Case Note ID: {$caseNote->id}");

            // Simulate verification
            $this->line("\n--- Simulating VERIFY action ---");
            $this->line("Before verification:");
            $this->line("  Status: {$caseNote->status}");
            $this->line("  Is Returned: " . ($cn->is_returned ? 'Yes' : 'No'));

            // Simulate the update
            $caseNote->update([
                'status' => \App\Models\Request::STATUS_APPROVED,
                'is_returned' => false,
                'returned_at' => null,
                'returned_by_user_id' => null,
                'return_notes' => null,
                'is_received' => false,
                'received_at' => null,
                'received_by_user_id' => null,
                'reception_notes' => null,
            ]);

            $this->line("\nAfter verification:");
            $this->line("  Status: {$caseNote->status}");
            $this->line("  Is Returned: " . ($caseNote->is_returned ? 'Yes' : 'No'));

            // Check if it still appears in pending verification
            $stillPending = Request::where('status', 'pending_return_verification')
                ->where('id', $caseNote->id)
                ->exists();

            $this->line("  Still in pending verification: " . ($stillPending ? 'Yes' : 'No'));

            // Reset for testing
            $caseNote->update([
                'status' => \App\Models\Request::STATUS_PENDING_RETURN_VERIFICATION,
                'is_returned' => true,
                'returned_at' => now(),
                'returned_by_user_id' => 1, // Rize Kamishiro
            ]);

            $this->line("\nReset to original state for testing");
        }

        $this->info("\n=== Test Complete ===");
        $this->line("Check the console output above for any issues.");
    }
}
