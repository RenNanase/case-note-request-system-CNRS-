<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            // Add indexes for dashboard stats performance
            $table->index(['requested_by_user_id', 'status'], 'idx_requests_user_status'); // For CA dashboard stats
            $table->index(['status'], 'idx_requests_status'); // For MR Staff/Admin dashboard stats
            $table->index(['needed_date'], 'idx_requests_needed_date'); // For overdue calculations
            $table->index(['created_at'], 'idx_requests_created_at'); // For recent requests
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            $table->dropIndex('idx_requests_user_status');
            $table->dropIndex('idx_requests_status');
            $table->dropIndex('idx_requests_needed_date');
            $table->dropIndex('idx_requests_created_at');
        });
    }
};
