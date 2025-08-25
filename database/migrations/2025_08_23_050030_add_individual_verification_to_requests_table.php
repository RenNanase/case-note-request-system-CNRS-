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
            // Individual case note verification fields
            $table->boolean('is_received')->default(false)->after('handover_status');
            $table->timestamp('received_at')->nullable()->after('is_received');
            $table->unsignedBigInteger('received_by_user_id')->nullable()->after('received_at');
            $table->text('reception_notes')->nullable()->after('received_by_user_id');

            // Foreign key for received_by_user_id
            $table->foreign('received_by_user_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            $table->dropForeign(['received_by_user_id']);
            $table->dropColumn([
                'is_received',
                'received_at',
                'received_by_user_id',
                'reception_notes'
            ]);
        });
    }
};
