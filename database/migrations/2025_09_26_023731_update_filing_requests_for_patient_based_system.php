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
        Schema::table('filing_requests', function (Blueprint $table) {
            // Add patient_ids column for patient-based filing
            $table->json('patient_ids')->nullable()->after('case_note_ids');
            
            // Add description/notes for what type of case notes are being requested
            $table->text('case_note_description')->nullable()->after('patient_ids');
            
            // Add expected number of case notes (optional)
            $table->integer('expected_case_note_count')->nullable()->after('case_note_description');
            
            // Make case_note_ids nullable since we're moving to patient-based
            $table->json('case_note_ids')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('filing_requests', function (Blueprint $table) {
            $table->dropColumn(['patient_ids', 'case_note_description', 'expected_case_note_count']);
            
            // Restore case_note_ids as required
            $table->json('case_note_ids')->nullable(false)->change();
        });
    }
};
