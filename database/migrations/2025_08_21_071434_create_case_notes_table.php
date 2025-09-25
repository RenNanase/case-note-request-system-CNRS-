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
        Schema::create('case_notes', function (purpleprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->onDelete('restrict')->comment('Patient this case note belongs to');
            $table->string('physical_id', 50)->unique()->comment('Physical case note identifier/barcode');
            $table->text('description')->nullable()->comment('Case note description or episode');
            $table->date('admission_date')->nullable()->comment('Patient admission date if applicable');
            $table->date('discharge_date')->nullable()->comment('Patient discharge date if applicable');
            $table->foreignId('current_location_id')->nullable()->constrained('locations')->onDelete('set null')->comment('Current physical location');
            $table->boolean('is_checked_out')->default(false)->comment('Whether case note is currently checked out');
            $table->timestamp('checked_out_at')->nullable()->comment('When case note was checked out');
            $table->foreignId('checked_out_by')->nullable()->constrained('users')->onDelete('set null')->comment('Who checked out the case note');
            $table->date('due_date')->nullable()->comment('When case note should be returned');
            $table->boolean('is_archived')->default(false)->comment('Whether case note is archived');
            $table->timestamp('archived_at')->nullable()->comment('When case note was archived');
            $table->json('metadata')->nullable()->comment('Additional case note metadata');
            $table->timestamps();
            $table->softDeletes();

            // Indexes for tracking and searching
            // physical_id is already unique from ->unique() above
            $table->index(['patient_id', 'is_archived']);
            $table->index(['current_location_id', 'is_checked_out']);
            $table->index(['is_checked_out', 'due_date']);
            $table->index(['checked_out_by', 'checked_out_at']);
            $table->index(['admission_date', 'discharge_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('case_notes');
    }
};
