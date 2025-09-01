<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Request;
use App\Models\CaseNoteHandover;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class CheckHandoverFields extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'check:handover-fields';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check handover-related fields and understand case note ownership';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("=== Handover Fields Check ===");

        // Check what columns exist in the requests table
        $this->info("\n=== Requests Table Columns ===");
        $columns = Schema::getColumnListing('requests');
        foreach ($columns as $column) {
            $this->line("- {$column}");
        }

        // Check handover-related fields specifically
        $this->info("\n=== Handover-Related Fields in Requests ===");
        $handoverColumns = ['current_pic_user_id', 'current_handover_id', 'handover_status'];
        foreach ($handoverColumns as $column) {
            if (in_array($column, $columns)) {
                $this->line("✅ {$column} exists");
            } else {
                $this->line("❌ {$column} missing");
            }
        }

        // Check case note handovers table
        $this->info("\n=== Case Note Handovers Table ===");
        if (Schema::hasTable('case_note_handovers')) {
            $handoverColumns = Schema::getColumnListing('case_note_handovers');
            $this->line("Case note handovers table columns:");
            foreach ($handoverColumns as $column) {
                $this->line("- {$column}");
            }

            // Check if there are any handover records
            $handoverCount = CaseNoteHandover::count();
            $this->line("\nTotal handover records: {$handoverCount}");

            if ($handoverCount > 0) {
                $this->info("Sample handover records:");
                $handovers = CaseNoteHandover::with(['caseNoteRequest', 'handedOverTo', 'handedOverFrom'])->limit(5)->get();
                foreach ($handovers as $handover) {
                    $fromName = $handover->handedOverFrom ? $handover->handedOverFrom->name : 'N/A';
                    $toName = $handover->handedOverTo ? $handover->handedOverTo->name : 'N/A';
                    $this->line("- ID: {$handover->id}, Case Note: {$handover->case_note_request_id}, From: {$fromName}, To: {$toName}, Status: {$handover->status}");
                }
            }
        } else {
            $this->error("Case note handovers table does not exist!");
        }

        // Check current ownership fields in requests
        $this->info("\n=== Current Ownership Check ===");
        $requests = Request::select(['id', 'patient_id', 'requested_by_user_id', 'current_pic_user_id', 'current_handover_id', 'handover_status'])->get();

        foreach ($requests as $request) {
            $this->line("Case Note ID {$request->id}:");
            $this->line("  - Requested by: {$request->requested_by_user_id}");
            $this->line("  - Current PIC: {$request->current_pic_user_id}");
            $this->line("  - Current Handover ID: {$request->current_handover_id}");
            $this->line("  - Handover Status: {$request->handover_status}");
        }

        // Check if there are any handover requests
        $this->info("\n=== Handover Requests Check ===");
        if (Schema::hasTable('handover_requests')) {
            $handoverRequestCount = DB::table('handover_requests')->count();
            $this->line("Total handover requests: {$handoverRequestCount}");

            if ($handoverRequestCount > 0) {
                $this->info("Sample handover requests:");
                $handoverRequests = DB::table('handover_requests')->limit(5)->get();
                foreach ($handoverRequests as $hr) {
                    $this->line("- ID: {$hr->id}, Case Note: {$hr->case_note_id}, From: {$hr->requested_by_user_id}, To: {$hr->handover_to_user_id}, Status: {$hr->status}");
                }
            }
        } else {
            $this->line("Handover requests table does not exist");
        }
    }
}
