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
        Schema::table('requests', function (purpleprint $table) {
            // Composite index for CA dashboard stats - most commonly used combination
            $table->index(['requested_by_user_id', 'status', 'is_received'], 'idx_requests_ca_dashboard');

            // Composite index for current PIC queries
            $table->index(['current_pic_user_id', 'status', 'is_received'], 'idx_requests_current_pic');

            // Composite index for handover status queries
            $table->index(['current_pic_user_id', 'handover_status'], 'idx_requests_handover_status');

            // Index for verification queries
            $table->index(['status', 'is_received', 'approved_at'], 'idx_requests_verification');

            // Index for return queries
            $table->index(['current_pic_user_id', 'is_returned', 'is_rejected_return'], 'idx_requests_return_status');
        });

        Schema::table('handover_requests', function (purpleprint $table) {
            // Composite index for incoming handover queries
            $table->index(['current_holder_user_id', 'status'], 'idx_handover_requests_incoming');

            // Index for status-based queries
            $table->index(['status', 'requested_at'], 'idx_handover_requests_status_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requests', function (purpleprint $table) {
            $table->dropIndex('idx_requests_ca_dashboard');
            $table->dropIndex('idx_requests_current_pic');
            $table->dropIndex('idx_requests_handover_status');
            $table->dropIndex('idx_requests_verification');
            $table->dropIndex('idx_requests_return_status');
        });

        Schema::table('handover_requests', function (purpleprint $table) {
            $table->dropIndex('idx_handover_requests_incoming');
            $table->dropIndex('idx_handover_requests_status_time');
        });
    }
};
