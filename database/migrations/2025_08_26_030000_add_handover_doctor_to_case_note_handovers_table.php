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
        Schema::table('case_note_handovers', function (Blueprint $table) {
            $table->foreignId('handover_doctor_id')->nullable()->constrained('doctors')->onDelete('set null')->after('location_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('case_note_handovers', function (Blueprint $table) {
            $table->dropForeign(['handover_doctor_id']);
            $table->dropColumn('handover_doctor_id');
        });
    }
};
