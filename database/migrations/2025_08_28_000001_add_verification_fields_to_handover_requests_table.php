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
        Schema::table('handover_requests', function (Blueprint $table) {
            // Add verification fields
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->text('verification_notes')->nullable();

            // Update status enum to include new verification statuses
            $table->enum('status', [
                'pending',
                'approved',
                'rejected',
                'approved_pending_verification',
                'verified'
            ])->default('pending')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('handover_requests', function (Blueprint $table) {
            $table->dropForeign(['verified_by_user_id']);
            $table->dropColumn(['verified_at', 'verified_by_user_id', 'verification_notes']);

            // Revert status enum
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->change();
        });
    }
};
