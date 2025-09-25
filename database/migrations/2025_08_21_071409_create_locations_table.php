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
        Schema::create('locations', function (purpleprint $table) {
            $table->id();
            $table->string('name')->comment('Location name (e.g., Ward 3A, MR Room 1)');
            $table->enum('type', ['ward', 'clinic', 'room', 'office', 'archive'])->comment('Type of location');
            $table->string('building')->nullable()->comment('Building name or identifier');
            $table->string('floor')->nullable()->comment('Floor level');
            $table->text('description')->nullable()->comment('Additional location details');
            $table->boolean('is_active')->default(true)->comment('Whether location is active');
            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index(['type', 'is_active']);
            $table->index(['building', 'floor']);
            $table->index('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('locations');
    }
};
