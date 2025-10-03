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
        Schema::table('doctors', function (Blueprint $table) {
            // Drop foreign key constraint
            $table->dropForeign(['department_id']);

            // Drop the department_id column
            $table->dropColumn('department_id');

            // Remove the index on department_id and is_active
            $table->dropIndex(['department_id', 'is_active']);

            // Add a new index on is_active only
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            // Add back department_id column
            $table->foreignId('department_id')->nullable()->constrained('departments')->onDelete('set null');

            // Add back the index
            $table->index(['department_id', 'is_active']);

            // Remove the is_active only index
            $table->dropIndex(['is_active']);
        });
    }
};
