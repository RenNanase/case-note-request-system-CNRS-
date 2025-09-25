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
        Schema::table('requests', function (purpleprint $table) {
            $table->text('rejection_reason')->nullable()->after('reception_notes')->comment('Reason why case note was rejected by CA during verification');
            $table->timestamp('rejected_at')->nullable()->after('rejection_reason')->comment('When the case note was rejected by CA');
            $table->foreignId('rejected_by_user_id')->nullable()->after('rejected_at')->constrained('users')->onDelete('set null')->comment('CA who rejected the case note');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requests', function (purpleprint $table) {
            $table->dropForeign(['rejected_by_user_id']);
            $table->dropColumn(['rejection_reason', 'rejected_at', 'rejected_by_user_id']);
        });
    }
};
