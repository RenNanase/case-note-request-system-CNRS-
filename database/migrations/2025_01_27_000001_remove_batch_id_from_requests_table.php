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
            // Drop the foreign key constraint first
            $table->dropForeign(['batch_id']);
            
            // Drop the batch_id column
            $table->dropColumn('batch_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            // Add the batch_id column back
            $table->foreignId('batch_id')->nullable()->constrained('batch_requests')->onDelete('set null');
            
            // Add the index back
            $table->index('batch_id');
        });
    }
};
