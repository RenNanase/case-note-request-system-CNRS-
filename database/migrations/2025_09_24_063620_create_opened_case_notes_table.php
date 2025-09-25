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
        Schema::create('opened_case_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->onDelete('restrict')->comment('Patient this case note belongs to');
            $table->foreignId('department_id')->constrained('departments')->onDelete('restrict')->comment('Department assigned to');
            $table->foreignId('location_id')->constrained('locations')->onDelete('restrict')->comment('Location assigned to');
            $table->foreignId('doctor_id')->constrained('doctors')->onDelete('restrict')->comment('Doctor assigned to');
            $table->enum('user_type', ['ot_staff', 'ed_staff', 'medical_staff', 'icu_staff'])->comment('Type of user assigned');
            $table->text('remarks')->comment('Staff name that will be PIC');
            $table->foreignId('opened_by_user_id')->constrained('users')->onDelete('restrict')->comment('MR Staff who opened the case note');
            $table->timestamp('opened_at')->useCurrent()->comment('When case note was opened');
            $table->boolean('is_active')->default(true)->comment('Whether this case note opening is still active');
            $table->timestamps();

            // Indexes for efficient querying
            $table->index(['patient_id', 'is_active']);
            $table->index(['opened_by_user_id', 'opened_at']);
            $table->index(['department_id', 'is_active']);
            $table->index(['location_id', 'is_active']);
            $table->index(['doctor_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('opened_case_notes');
    }
};
