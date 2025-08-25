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
        Schema::table('patients', function (Blueprint $table) {
            // Drop columns if they exist
            $columnsToDrop = [
                'nric',
                'date_of_birth',
                'sex',
                'phone',
                'email',
                'address',
                'emergency_contact_name',
                'emergency_contact_phone',
                'medical_alerts',
                'is_active'
            ];

            foreach ($columnsToDrop as $column) {
                if (Schema::hasColumn('patients', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            // Re-add all the dropped columns
            $table->string('nric', 20)->nullable()->comment('National Registration Identity Card');
            $table->date('date_of_birth')->comment('Patient date of birth');
            $table->enum('sex', ['M', 'F', 'O'])->comment('Patient biological sex (Male/Female/Other)');
            $table->string('phone', 20)->nullable()->comment('Primary contact phone');
            $table->string('email')->nullable()->comment('Contact email address');
            $table->text('address')->nullable()->comment('Home address');
            $table->string('emergency_contact_name')->nullable()->comment('Emergency contact person');
            $table->string('emergency_contact_phone')->nullable()->comment('Emergency contact phone');
            $table->json('medical_alerts')->nullable()->comment('Allergies, conditions, etc.');
            $table->boolean('is_active')->default(true)->comment('Whether patient record is active');
        });
    }
};
