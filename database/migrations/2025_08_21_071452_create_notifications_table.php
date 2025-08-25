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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->string('uuid')->unique()->comment('Unique notification identifier');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade')->comment('User to notify');
            $table->enum('type', [
                'request_approved', 'request_rejected', 'request_overdue', 
                'case_note_due', 'handover_received', 'system_alert'
            ])->comment('Type of notification');
            $table->string('title')->comment('Notification title');
            $table->text('message')->comment('Notification message content');
            $table->json('data')->nullable()->comment('Additional notification data');
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal')->comment('Notification priority');
            $table->enum('channel', ['in_app', 'email', 'sms'])->default('in_app')->comment('Notification channel');
            $table->foreignId('related_request_id')->nullable()->constrained('requests')->onDelete('set null')->comment('Related request if applicable');
            $table->boolean('is_read')->default(false)->comment('Whether notification has been read');
            $table->timestamp('read_at')->nullable()->comment('When notification was read');
            $table->boolean('is_sent')->default(false)->comment('Whether notification was successfully sent');
            $table->timestamp('sent_at')->nullable()->comment('When notification was sent');
            $table->json('metadata')->nullable()->comment('Additional notification metadata');
            $table->timestamps();

            // Indexes for notification management
            // uuid is already unique from ->unique() above
            $table->index(['user_id', 'is_read', 'created_at']);
            $table->index(['type', 'priority', 'created_at']);
            $table->index(['channel', 'is_sent']);
            $table->index(['related_request_id', 'created_at']);
            $table->index(['created_at', 'is_read']); // For sorting unread notifications
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
