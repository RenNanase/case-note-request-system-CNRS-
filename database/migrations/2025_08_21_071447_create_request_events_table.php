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
        Schema::create('request_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained('requests')->onDelete('cascade')->comment('Request this event belongs to');
            $table->enum('type', [
                'created', 'submitted', 'approved', 'rejected',
                'in_progress', 'handed_over', 'received', 'completed', 'returned',
                'handover_requested', 'handover_approved', 'handover_rejected'
            ])->comment('Type of event that occurred');
            $table->foreignId('actor_user_id')->constrained('users')->onDelete('restrict')->comment('User who performed the action');
            $table->foreignId('to_location_id')->nullable()->constrained('locations')->onDelete('set null')->comment('Location where item was sent');
            $table->string('to_person')->nullable()->comment('Person who received the handover');
            $table->text('reason')->nullable()->comment('Reason for the action or additional details');
            $table->json('metadata')->nullable()->comment('Additional event data');
            $table->timestamp('occurred_at')->comment('When the event occurred');
            $table->timestamps();

            // Indexes for timeline and audit queries
            $table->index(['request_id', 'occurred_at']);
            $table->index(['type', 'occurred_at']);
            $table->index(['actor_user_id', 'occurred_at']);
            $table->index(['to_location_id', 'occurred_at']);
            $table->index('occurred_at'); // For chronological sorting
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('request_events');
    }
};
