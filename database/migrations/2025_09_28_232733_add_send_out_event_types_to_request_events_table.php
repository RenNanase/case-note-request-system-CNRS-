<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add new event types to the enum
        DB::statement("ALTER TABLE request_events MODIFY COLUMN type ENUM(
            'created',
            'submitted',
            'approved',
            'rejected',
            'in_progress',
            'handed_over',
            'received',
            'completed',
            'returned',
            'handover_requested',
            'handover_approved',
            'handover_rejected',
            'rejected_not_received',
            'returned_verified',
            'returned_rejected',
            'handover_data_fixed',
            'handover_verified',
            'verified_received',
            'filing_submitted',
            'filing_approved',
            'filing_rejected',
            'sent_out',
            'Acknowledge_received'
        ) NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove the new event types from the enum
        DB::statement("ALTER TABLE request_events MODIFY COLUMN type ENUM(
            'created',
            'submitted',
            'approved',
            'rejected',
            'in_progress',
            'handed_over',
            'received',
            'completed',
            'returned',
            'handover_requested',
            'handover_approved',
            'handover_rejected',
            'rejected_not_received',
            'returned_verified',
            'returned_rejected',
            'handover_data_fixed',
            'handover_verified',
            'verified_received',
            'filing_submitted',
            'filing_approved',
            'filing_rejected'
        ) NOT NULL");
    }
};
