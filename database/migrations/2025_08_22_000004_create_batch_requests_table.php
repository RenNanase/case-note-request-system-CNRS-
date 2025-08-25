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
        Schema::create('batch_requests', function (Blueprint $table) {
            $table->id();
            $table->string('batch_number')->unique()->comment('Unique batch identifier');
            $table->foreignId('requested_by_user_id')->constrained('users')->onDelete('restrict')->comment('CA who created the batch');
            $table->string('status')->default('pending')->comment('Batch status: pending, approved, rejected, partially_approved');
            $table->text('batch_notes')->nullable()->comment('General notes for the entire batch');
            $table->timestamp('submitted_at')->nullable()->comment('When batch was submitted');
            $table->timestamp('processed_at')->nullable()->comment('When batch was processed by MR staff');
            $table->foreignId('processed_by_user_id')->nullable()->constrained('users')->onDelete('set null')->comment('MR staff who processed the batch');
            $table->text('processing_notes')->nullable()->comment('Notes from MR staff processing');
            $table->timestamps();
            $table->softDeletes();

            // Indexes for efficient querying
            $table->index(['status', 'submitted_at']);
            $table->index(['requested_by_user_id', 'status']);
            $table->index('batch_number');
        });

        // Add batch_id to existing requests table
        Schema::table('requests', function (Blueprint $table) {
            $table->foreignId('batch_id')->nullable()->constrained('batch_requests')->onDelete('set null');
            $table->index('batch_id');
        });

        Schema::table('requests', function (Blueprint $table) {
            $table->timestamp('handover_pending_since')->nullable()->after('handover_status');
            $table->timestamp('handover_verified_at')->nullable()->after('handover_pending_since');
            $table->index(['handover_status', 'handover_pending_since']);
        });

        Schema::table('case_note_handovers', function (Blueprint $table) {
            $table->timestamp('handed_over_at')->nullable()->after('status');
            $table->timestamp('verified_at')->nullable()->after('handed_over_at');
            $table->text('verification_notes')->nullable()->after('verified_at');
            $table->timestamp('reminder_sent_at')->nullable()->after('verification_notes');
            $table->timestamp('escalation_sent_at')->nullable()->after('reminder_sent_at');
            $table->timestamp('overdue_at')->nullable()->after('escalation_sent_at');
            $table->index(['status', 'handed_over_at']);
            $table->index(['handed_over_to_user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            $table->dropForeign(['batch_id']);
            $table->dropIndex(['batch_id']);
            $table->dropColumn('batch_id');
        });

        Schema::dropIfExists('batch_requests');
    }
};
