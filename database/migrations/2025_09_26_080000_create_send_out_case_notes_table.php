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
        Schema::create('send_out_case_notes', function (Blueprint $table) {
            $table->id();
            $table->string('send_out_number')->unique(); // e.g., SO202509260001
            $table->unsignedBigInteger('sent_by_user_id'); // CA1 who sends
            $table->unsignedBigInteger('sent_to_user_id'); // CA2 who receives
            $table->unsignedBigInteger('department_id');
            $table->unsignedBigInteger('doctor_id');
            $table->json('case_note_ids'); // Array of case note IDs
            $table->integer('case_note_count'); // Count of case notes
            $table->enum('status', ['pending', 'Acknowledge', 'cancelled'])->default('pending');
            $table->text('notes')->nullable(); // Optional notes from CA1
            $table->timestamp('sent_at');
            $table->timestamp('Acknowledge_at')->nullable();
            $table->unsignedBigInteger('Acknowledge_by_user_id')->nullable(); // CA2 who Acknowledge
            $table->json('Acknowledge_case_note_ids')->nullable(); // Which case notes were Acknowledge
            $table->text('acknowledgment_notes')->nullable(); // Notes from CA2
            $table->timestamps();

            // Foreign key constraints
            $table->foreign('sent_by_user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('sent_to_user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('department_id')->references('id')->on('departments')->onDelete('cascade');
            $table->foreign('doctor_id')->references('id')->on('doctors')->onDelete('cascade');
            $table->foreign('Acknowledge_by_user_id')->references('id')->on('users')->onDelete('set null');

            // Indexes for performance
            $table->index(['sent_by_user_id', 'status']);
            $table->index(['sent_to_user_id', 'status']);
            $table->index(['status', 'sent_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('send_out_case_notes');
    }
};
