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
        Schema::create('requests', function (purpleprint $table) {
            $table->id();
            $table->string('request_number', 20)->unique()->comment('Unique request identifier');
            $table->foreignId('patient_id')->constrained('patients')->onDelete('restrict')->comment('Patient for this request');
            $table->foreignId('requested_by_user_id')->constrained('users')->onDelete('restrict')->comment('User who made the request (CA)');
            $table->foreignId('department_id')->constrained('departments')->onDelete('restrict')->comment('Requesting department');
            $table->foreignId('doctor_id')->nullable()->constrained('doctors')->onDelete('set null')->comment('Requesting doctor');
            $table->foreignId('location_id')->constrained('locations')->onDelete('restrict')->comment('Where case note is needed');
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal')->comment('Request priority level');
            $table->enum('status', ['pending', 'approved', 'in_progress', 'completed', 'rejected'])->default('pending')->comment('Current request status');
            $table->text('purpose')->comment('Reason for requesting case note');
            $table->text('remarks')->nullable()->comment('Additional remarks or instructions');
            $table->date('needed_date')->nullable()->comment('When case note is needed by');
            $table->timestamp('approved_at')->nullable()->comment('When request was approved');
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->onDelete('set null')->comment('MR staff who approved');
            $table->text('approval_remarks')->nullable()->comment('Approval/rejection remarks');
            $table->timestamp('completed_at')->nullable()->comment('When request was completed');
            $table->foreignId('completed_by_user_id')->nullable()->constrained('users')->onDelete('set null')->comment('User who completed request');
            $table->json('metadata')->nullable()->comment('Additional request metadata');
            $table->timestamps();
            $table->softDeletes();

            // Critical indexes for request management
            // request_number is already unique from ->unique() above
            $table->index(['status', 'priority', 'created_at']);
            $table->index(['patient_id', 'status']);
            $table->index(['requested_by_user_id', 'created_at']);
            $table->index(['department_id', 'status']);
            $table->index(['doctor_id', 'created_at']);
            $table->index(['location_id', 'status']);
            $table->index(['approved_by_user_id', 'approved_at']);
            $table->index(['needed_date', 'status']);
            $table->index(['created_at', 'status', 'priority']); // Composite for dashboard
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('requests');
    }
};
