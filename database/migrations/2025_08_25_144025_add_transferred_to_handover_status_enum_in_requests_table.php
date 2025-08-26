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
        Schema::table('requests', function (Blueprint $table) {
            // Update the enum to include 'transferred'
            $table->enum('handover_status', [
                'none', 'pending', 'in_progress', 'completed', 'transferred'
            ])->default('none')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            // Revert to original enum values
            $table->enum('handover_status', [
                'none', 'pending', 'in_progress', 'completed'
            ])->default('none')->change();
        });
    }
};
