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
        Schema::create('request_sequences', function (Blueprint $table) {
            $table->id();
            $table->string('date_key', 8)->unique()->comment('Date in YYYYMMDD format');
            $table->unsignedInteger('current_sequence')->default(0)->comment('Current sequence number for the date');
            $table->timestamps();

            // Index for fast lookups
            $table->index('date_key');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('request_sequences');
    }
};
