<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Request;

class FixExistingRejectedCaseNotes extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fix:existing-rejected-case-notes';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix existing rejected case notes by setting is_rejected_return flag';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("=== Fixing Existing Rejected Case Notes ===");

        // Find case notes that have rejection_reason but is_rejected_return is false
        $caseNotesToFix = Request::whereNotNull('rejection_reason')
            ->where('is_rejected_return', false)
            ->get();

        $this->line("Found {$caseNotesToFix->count()} case notes with rejection reason but is_rejected_return = false");

        $fixedCount = 0;

        foreach ($caseNotesToFix as $caseNote) {
            $this->line("\nProcessing Case Note ID: {$caseNote->id}");
            $this->line("Patient: {$caseNote->patient->name}");
            $this->line("Rejection Reason: {$caseNote->rejection_reason}");
            $this->line("Rejected At: {$caseNote->rejected_at}");
            $this->line("Rejected By User ID: {$caseNote->rejected_by_user_id}");
            $this->line("Current PIC User ID: {$caseNote->current_pic_user_id}");

            // Update the case note
            $caseNote->update([
                'is_rejected_return' => true
            ]);

            $this->info("✅ Updated case note ID {$caseNote->id}");
            $fixedCount++;
        }

        $this->info("\n=== Summary ===");
        $this->line("Total case notes processed: {$caseNotesToFix->count()}");
        $this->line("Case notes fixed: {$fixedCount}");

        if ($fixedCount > 0) {
            $this->info("✅ Existing rejected case notes have been fixed!");
            $this->line("These case notes should now appear in the CA's Return Case Notes page.");
        } else {
            $this->info("ℹ️ No case notes needed fixing.");
        }
    }
}
