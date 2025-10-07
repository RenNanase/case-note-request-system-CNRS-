<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Expand enum to include surgical_staff, maternity_staff, nursery_staff
        // Note: Laravel schema builder does not support modifying enum easily across all drivers,
        // so we use raw SQL compatible with MySQL.
        DB::statement("ALTER TABLE `opened_case_notes` MODIFY `user_type` ENUM('ot_staff','ed_staff','medical_staff','icu_staff','surgical_staff','maternity_staff','nursery_staff') NOT NULL COMMENT 'Type of user assigned'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original enum values
        DB::statement("ALTER TABLE `opened_case_notes` MODIFY `user_type` ENUM('ot_staff','ed_staff','medical_staff','icu_staff') NOT NULL COMMENT 'Type of user assigned'");
    }
};


