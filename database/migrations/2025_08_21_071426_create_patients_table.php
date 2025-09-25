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
        Schema::create('patients', function (purpleprint $table) {
            $table->id();
            $table->string('mrn', 20)->unique()->comment('Medical Record Number - unique identifier');
            $table->string('nric', 20)->nullable()->comment('National Registration Identity Card');
            $table->string('name')->comment('Patient full name');
            $table->date('date_of_birth')->comment('Patient date of birth');
            $table->enum('sex', ['M', 'F', 'O'])->comment('Patient biological sex (Male/Female/Other)');
            $table->string('phone', 20)->nullable()->comment('Primary contact phone');
            $table->string('email')->nullable()->comment('Contact email address');
            $table->text('address')->nullable()->comment('Home address');
            $table->string('emergency_contact_name')->nullable()->comment('Emergency contact person');
            $table->string('emergency_contact_phone')->nullable()->comment('Emergency contact phone');
            $table->json('medical_alerts')->nullable()->comment('Allergies, conditions, etc.');
            $table->boolean('is_active')->default(true)->comment('Whether patient record is active');
            $table->timestamps();
            $table->softDeletes();

            // Critical indexes for fast patient search
            // mrn is already unique from ->unique() above
            $table->index('nric');
            $table->index('name');
            $table->index(['name', 'date_of_birth']);
            $table->index(['is_active', 'name']);
            $table->index('phone');
            $table->fullText(['name', 'mrn', 'nric']); // Full text search
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
