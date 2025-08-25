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
            // Add handover-related fields
            $table->foreignId('current_handover_id')->nullable()->constrained('case_note_handovers')->onDelete('set null');
            $table->foreignId('current_pic_user_id')->nullable()->constrained('users')->onDelete('set null'); // Current Person in Charge
            $table->enum('handover_status', ['none', 'pending', 'in_progress', 'completed'])->default('none');

            // Indexes for performance
            $table->index(['current_pic_user_id']);
            $table->index(['handover_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            $table->dropForeign(['current_handover_id']);
            $table->dropForeign(['current_pic_user_id']);
            $table->dropIndex(['current_pic_user_id']);
            $table->dropIndex(['handover_status']);
            $table->dropColumn(['current_handover_id', 'current_pic_user_id', 'handover_status']);
        });
    }
};
