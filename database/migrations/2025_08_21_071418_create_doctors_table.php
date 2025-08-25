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
        Schema::create('doctors', function (Blueprint $table) {
            $table->id();
            $table->string('name')->comment('Doctor full name');
            $table->string('title')->nullable()->comment('Dr., Prof., etc.');
            $table->string('specialization')->nullable()->comment('Medical specialization');
            $table->string('license_number')->nullable()->comment('Medical license number');
            $table->string('phone')->nullable()->comment('Contact phone number');
            $table->string('email')->nullable()->comment('Contact email address');
            $table->foreignId('department_id')->constrained('departments')->onDelete('restrict')->comment('Primary department');
            $table->boolean('is_active')->default(true)->comment('Whether doctor is active');
            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance and search
            $table->index(['department_id', 'is_active']);
            $table->index('name');
            $table->index('license_number');
            $table->index('email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('doctors');
    }
};
