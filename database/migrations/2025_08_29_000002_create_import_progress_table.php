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
        Schema::create('import_progress', function (Blueprint $table) {
            $table->id();
            $table->string('import_type'); // patients, case_notes, users
            $table->string('file_name');
            $table->unsignedBigInteger('total_rows');
            $table->unsignedBigInteger('processed_rows')->default(0);
            $table->unsignedBigInteger('imported_count')->default(0);
            $table->unsignedBigInteger('skipped_count')->default(0);
            $table->unsignedBigInteger('duplicate_count')->default(0);
            $table->unsignedBigInteger('error_count')->default(0);
            $table->enum('status', ['pending', 'processing', 'completed', 'failed', 'cancelled'])->default('pending');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('estimated_completion')->nullable();
            $table->decimal('progress_percentage', 5, 2)->default(0.00);
            $table->unsignedInteger('current_batch')->default(0);
            $table->unsignedInteger('total_batches')->default(0);
            $table->decimal('processing_speed', 10, 2)->default(0.00); // rows per second
            $table->string('memory_usage')->nullable();
            $table->json('error_log')->nullable();
            $table->json('metadata')->nullable();
            $table->unsignedBigInteger('requested_by_user_id');
            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index(['import_type', 'status']);
            $table->index(['status', 'created_at']);
            $table->index('requested_by_user_id');
            $table->index('created_at');

            // Foreign key constraints
            $table->foreign('requested_by_user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('import_progress');
    }
};
