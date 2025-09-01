<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Request;
use App\Models\User;

class TestRejectedCaseNotesFlow extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:rejected-case-notes-flow';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the rejected case notes flow to verify the implementation works correctly';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("=== Testing Rejected Case Notes Flow ===");

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

        // Check case notes that can be returned (including rejected ones)
        $this->info("\n=== Case Notes Available for Return (CA Side) ===");
        $caUser = User::role('CA')->first();

        if ($caUser) {
            $this->line("Testing for CA User: {$caUser->name} (ID: {$caUser->id})");

            $returnableCaseNotes = Request::with(['patient', 'doctor', 'department'])
                ->where('status', \App\Models\Request::STATUS_APPROVED)
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

            $this->line("Total returnable case notes: {$returnableCaseNotes->count()}");

            foreach ($returnableCaseNotes as $cn) {
                $this->line("- ID: {$cn->id}, Patient: {$cn->patient->name}");
                $this->line("  Doctor: {$cn->doctor->name}");
                $this->line("  Department: {$cn->department->name}");
                $this->line("  Is Returned: " . ($cn->is_returned ? 'Yes' : 'No'));
                $this->line("  Is Rejected Return: " . ($cn->is_rejected_return ? 'Yes' : 'No'));
                if ($cn->is_rejected_return) {
                    $this->line("  Rejection Reason: {$cn->rejection_reason}");
                    $this->line("  Rejected At: {$cn->rejected_at}");
                    $this->line("  Rejected By: {$cn->rejected_by_user_id}");
                }
            }
        } else {
            $this->warn("No CA users found");
        }

        // Check MR Staff users
        $this->info("\n=== MR Staff Users ===");
        $mrStaffUsers = User::role('MR_STAFF')->get();

        foreach ($mrStaffUsers as $user) {
            $this->line("- ID: {$user->id}, Name: {$user->name}, Email: {$user->email}");
        }

        $this->info("\n=== Test Instructions ===");
        $this->line("1. As MR Staff, reject a returned case note");
        $this->line("2. Check if the case note appears in CA's Return Case Notes page");
        $this->line("3. Verify the rejection reason and indicator are displayed");
        $this->line("4. Test if CA can re-return the rejected case note");

        $this->info("\n=== Test Complete ===");
    }
}
