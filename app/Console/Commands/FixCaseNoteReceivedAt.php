<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Request;

class FixCaseNoteReceivedAt extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fix:case-note-received-at';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix case notes that have is_received = true but received_at = NULL';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("=== Fixing Case Notes with Missing received_at ===");

        // Find case notes that have is_received = true but received_at = NULL
        $caseNotesToFix = Request::where('is_received', true)
            ->whereNull('received_at')
            ->get();

        $this->line("Found {$caseNotesToFix->count()} case notes with is_received = true but received_at = NULL");

        $fixedCount = 0;

        foreach ($caseNotesToFix as $caseNote) {
            $this->line("\nProcessing Case Note ID: {$caseNote->id}");
            $this->line("Patient: {$caseNote->patient->name}");
            $this->line("Is Received: " . ($caseNote->is_received ? 'Yes' : 'No'));
            $this->line("Received At: " . ($caseNote->received_at ?: 'NULL'));
            $this->line("Rejected Return: " . ($caseNote->is_rejected_return ? 'Yes' : 'No'));

            // Set received_at to the same time as rejected_at if it exists, otherwise use current time
            $receivedAt = $caseNote->rejected_at ?: now();

            // Update the case note
            $caseNote->update([
                'received_at' => $receivedAt,
                'received_by_user_id' => $caseNote->current_pic_user_id // Set to current PIC
            ]);

            $this->info("✅ Updated case note ID {$caseNote->id}");
            $this->line("  Set received_at to: {$receivedAt}");
            $fixedCount++;
        }

        $this->info("\n=== Summary ===");
        $this->line("Total case notes processed: {$caseNotesToFix->count()}");
        $this->line("Case notes fixed: {$fixedCount}");

        if ($fixedCount > 0) {
            $this->info("✅ Case notes with missing received_at have been fixed!");
            $this->line("These case notes should now appear in the CA's Return Case Notes page.");
        } else {
            $this->info("ℹ️ No case notes needed fixing.");
        }
    }
}
