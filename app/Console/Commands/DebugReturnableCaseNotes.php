<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Request;
use App\Models\User;

class DebugReturnableCaseNotes extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'debug:returnable-case-notes';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Debug why rejected case notes are not appearing in CA Return Case Notes page';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("=== Debugging Returnable Case Notes ===");

        // Check all case notes for CA users
        $this->info("\n=== All Case Notes for CA Users ===");
        $caUsers = User::whereIn('email', ['ca@cnrs.jmc', 'ca2@cnrs.jmc'])->get();

        foreach ($caUsers as $caUser) {
            $this->line("\n--- CA User: {$caUser->name} (ID: {$caUser->id}) ---");

            $allCaseNotes = Request::with(['patient', 'doctor', 'department'])
                ->where('current_pic_user_id', $caUser->id)
                ->get();

            $this->line("Total case notes owned by this CA: {$allCaseNotes->count()}");

            foreach ($allCaseNotes as $cn) {
                $this->line("- ID: {$cn->id}, Patient: {$cn->patient->name}");
                $this->line("  Status: {$cn->status}");
                $this->line("  Is Received: " . ($cn->is_received ? 'Yes' : 'No'));
                $this->line("  Is Returned: " . ($cn->is_returned ? 'Yes' : 'No'));
                $this->line("  Is Rejected Return: " . ($cn->is_rejected_return ? 'Yes' : 'No'));
                $this->line("  Received At: " . ($cn->received_at ?: 'NULL'));
                $this->line("  Rejection Reason: " . ($cn->rejection_reason ?: 'NULL'));
            }
        }

        // Check the specific query logic
        $this->info("\n=== Testing Returnable Case Notes Query ===");

        foreach ($caUsers as $caUser) {
            $this->line("\n--- Testing for CA: {$caUser->name} ---");

            // Test each condition separately
            $approvedCaseNotes = Request::where('status', \App\Models\Request::STATUS_APPROVED)
                ->where('current_pic_user_id', $caUser->id)
                ->get();
            $this->line("Approved case notes: {$approvedCaseNotes->count()}");

            $receivedCaseNotes = Request::where('status', \App\Models\Request::STATUS_APPROVED)
                ->where('current_pic_user_id', $caUser->id)
                ->where('is_received', true)
                ->get();
            $this->line("Received case notes: {$receivedCaseNotes->count()}");

            $notReturnedCaseNotes = Request::where('status', \App\Models\Request::STATUS_APPROVED)
                ->where('current_pic_user_id', $caUser->id)
                ->where('is_received', true)
                ->where(function($query) {
                    $query->where('is_returned', false)
                          ->orWhereNull('is_returned');
                })
                ->get();
            $this->line("Not returned case notes: {$notReturnedCaseNotes->count()}");

            $rejectedReturnCaseNotes = Request::where('status', \App\Models\Request::STATUS_APPROVED)
                ->where('current_pic_user_id', $caUser->id)
                ->where('is_received', true)
                ->where('is_rejected_return', true)
                ->get();
            $this->line("Rejected return case notes: {$rejectedReturnCaseNotes->count()}");

            // Final query (the one used in the API)
            $finalQuery = Request::where('status', \App\Models\Request::STATUS_APPROVED)
                ->where('current_pic_user_id', $caUser->id)
                ->where('is_received', true)
                ->where(function($query) {
                    $query->where(function($subQuery) {
                        $subQuery->where('is_returned', false)
                                 ->orWhereNull('is_returned');
                    })
                    ->orWhere('is_rejected_return', true);
                })
                ->whereNotNull('received_at')
                ->get();
            $this->line("Final query result: {$finalQuery->count()}");

            foreach ($finalQuery as $cn) {
                $this->line("  - ID: {$cn->id}, Patient: {$cn->patient->name}");
                $this->line("    Is Returned: " . ($cn->is_returned ? 'Yes' : 'No'));
                $this->line("    Is Rejected Return: " . ($cn->is_rejected_return ? 'Yes' : 'No'));
            }
        }

        // Check if there are any rejected case notes in the system
        $this->info("\n=== All Rejected Return Case Notes in System ===");
        $allRejectedCaseNotes = Request::where('is_rejected_return', true)->get();
        $this->line("Total rejected return case notes: {$allRejectedCaseNotes->count()}");

        foreach ($allRejectedCaseNotes as $cn) {
            $this->line("- ID: {$cn->id}, Patient: {$cn->patient->name}");
            $this->line("  Current PIC: {$cn->current_pic_user_id}");
            $this->line("  Status: {$cn->status}");
            $this->line("  Is Received: " . ($cn->is_received ? 'Yes' : 'No'));
            $this->line("  Rejection Reason: {$cn->rejection_reason}");
        }
    }
}
