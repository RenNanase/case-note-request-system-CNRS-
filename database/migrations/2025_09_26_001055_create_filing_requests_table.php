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
        Schema::create('filing_requests', function (Blueprint $table) {
            $table->id();
            $table->string('filing_number')->unique()->comment('Unique filing request number');
            $table->foreignId('submitted_by_user_id')->constrained('users')->onDelete('restrict')->comment('CA who submitted the filing request');
            $table->json('case_note_ids')->comment('Array of case note request IDs to be filed');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->comment('Status of the filing request');
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->onDelete('set null')->comment('MR staff who approved the request');
            $table->timestamp('approved_at')->nullable()->comment('When the request was approved');
            $table->text('approval_notes')->nullable()->comment('Notes from MR staff during approval');
            $table->text('submission_notes')->nullable()->comment('Notes from CA during submission');
            $table->timestamps();

            // Indexes for performance
            $table->index(['submitted_by_user_id', 'status']);
            $table->index(['status', 'created_at']);
            $table->index(['approved_by_user_id', 'approved_at']);
            $table->index('filing_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('filing_requests');
    }
};
