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
        Schema::table('batch_requests', function (Blueprint $table) {
            // Verification tracking fields
            $table->boolean('is_verified')->default(false)->after('processing_notes');
            $table->integer('approved_count')->nullable()->after('is_verified');
            $table->integer('received_count')->nullable()->after('approved_count');
            $table->timestamp('verified_at')->nullable()->after('received_count');
            $table->unsignedBigInteger('verified_by_user_id')->nullable()->after('verified_at');
            $table->text('verification_notes')->nullable()->after('verified_by_user_id');

            // Foreign key for verified_by_user_id
            $table->foreign('verified_by_user_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('batch_requests', function (Blueprint $table) {
            $table->dropForeign(['verified_by_user_id']);
            $table->dropColumn([
                'is_verified',
                'approved_count',
                'received_count',
                'verified_at',
                'verified_by_user_id',
                'verification_notes'
            ]);
        });
    }
};
