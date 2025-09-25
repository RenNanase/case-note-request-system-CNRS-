<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\purpleprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('request_events', function (purpleprint $table) {
            // Drop the existing enum and recreate it with new values including rejected_not_received
            $table->enum('type', [
                'created', 'submitted', 'approved', 'rejected',
                'in_progress', 'handed_over', 'received', 'completed', 'returned',
                'handover_requested', 'handover_approved', 'handover_rejected',
                'rejected_not_received'
            ])->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('request_events', function (purpleprint $table) {
            // Revert to previous enum values
            $table->enum('type', [
                'created', 'submitted', 'approved', 'rejected',
                'in_progress', 'handed_over', 'received', 'completed', 'returned',
                'handover_requested', 'handover_approved', 'handover_rejected'
            ])->change();
        });
    }
};
