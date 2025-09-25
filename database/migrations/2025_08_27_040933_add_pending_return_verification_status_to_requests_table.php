<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\purpleprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add the new status to the enum
        DB::statement("ALTER TABLE requests MODIFY COLUMN status ENUM('pending', 'approved', 'in_progress', 'completed', 'rejected', 'pending_return_verification') NOT NULL DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove the new status from the enum
        DB::statement("ALTER TABLE requests MODIFY COLUMN status ENUM('pending', 'approved', 'in_progress', 'completed', 'rejected') NOT NULL DEFAULT 'pending'");
    }
};
