<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Request;
use App\Models\User;

class TestCompleteWorkflow extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:complete-workflow';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the complete workflow for Return Case Note with Complete status';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("=== Testing Complete Workflow ===");

        // Check current case notes with different statuses
        $this->info("\n=== Current Case Notes by Status ===");

        $pendingCaseNotes = Request::where('status', 'pending_return_verification')->get();
        $this->line("Pending Return Verification: {$pendingCaseNotes->count()}");

        $approvedCaseNotes = Request::where('status', 'approved')->get();
        $this->line("Approved: {$approvedCaseNotes->count()}");

        $completedCaseNotes = Request::where('status', 'completed')->get();
        $this->line("Completed: {$completedCaseNotes->count()}");

        // Show completed case notes details
        if ($completedCaseNotes->count() > 0) {
            $this->info("\n=== Completed Case Notes ===");
            foreach ($completedCaseNotes as $cn) {
                $this->line("- ID: {$cn->id}, Patient: {$cn->patient->name}");
                $this->line("  Completed At: {$cn->completed_at}");
                $this->line("  Completed By User ID: {$cn->completed_by_user_id}");
                $this->line("  Current PIC User ID: " . ($cn->current_pic_user_id ?: 'NULL (Available for any CA)'));
                $this->line("  Is Returned: " . ($cn->is_returned ? 'Yes' : 'No'));
                $this->line("  Is Received: " . ($cn->is_received ? 'Yes' : 'No'));
            }
        }

        // Check case notes available for new requests (completed case notes)
        $this->info("\n=== Case Notes Available for New Requests ===");
        $availableCaseNotes = Request::where('status', 'completed')
            ->whereNull('current_pic_user_id')
            ->get();
        $this->line("Completed case notes available for new requests: {$availableCaseNotes->count()}");

        foreach ($availableCaseNotes as $cn) {
            $this->line("- ID: {$cn->id}, Patient: {$cn->patient->name}");
            $this->line("  Completed At: {$cn->completed_at}");
            $this->line("  Any CA can request this case note");
        }

        // Check CA users and their current case notes
        $this->info("\n=== CA Users and Their Case Notes ===");
        $caUsers = User::whereIn('email', ['ca@cnrs.test', 'ca2@cnrs.test'])->get();

        foreach ($caUsers as $caUser) {
            $this->line("\n--- CA User: {$caUser->name} (ID: {$caUser->id}) ---");

            $ownedCaseNotes = Request::where('current_pic_user_id', $caUser->id)->get();
            $this->line("Total case notes owned: {$ownedCaseNotes->count()}");

            foreach ($ownedCaseNotes as $cn) {
                $this->line("  - ID: {$cn->id}, Patient: {$cn->patient->name}");
                $this->line("    Status: {$cn->status}");
                $this->line("    Is Returned: " . ($cn->is_returned ? 'Yes' : 'No'));
                $this->line("    Is Rejected Return: " . ($cn->is_rejected_return ? 'Yes' : 'No'));
            }
        }

        // Test the workflow steps
        $this->info("\n=== Workflow Test Steps ===");
        $this->line("1. CA returns case note → status: pending_return_verification");
        $this->line("2. MR Staff verifies → status: completed, current_pic_user_id: NULL");
        $this->line("3. Completed case note becomes available for new requests by any CA");

        $this->info("\n=== Expected Outcomes ===");
        $this->line("✅ Verified case notes are marked as Complete");
        $this->line("✅ Completed case notes have current_pic_user_id = NULL");
        $this->line("✅ Any CA can request completed case notes");
        $this->line("✅ Timeline shows 'marked as Complete' message");

        $this->info("\n=== Test Complete ===");
    }
}
