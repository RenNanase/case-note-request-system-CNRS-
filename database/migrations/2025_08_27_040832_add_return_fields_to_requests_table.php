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
            $table->boolean('is_returned')->default(false)->after('is_received')->comment('Whether the case note has been returned by CA');
            $table->timestamp('returned_at')->nullable()->after('is_returned')->comment('When the case note was returned by CA');
            $table->foreignId('returned_by_user_id')->nullable()->after('returned_at')->constrained('users')->onDelete('set null')->comment('CA who returned the case note');
            $table->text('return_notes')->nullable()->after('returned_by_user_id')->comment('Notes from CA about the return');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            $table->dropForeign(['returned_by_user_id']);
            $table->dropColumn(['is_returned', 'returned_at', 'returned_by_user_id', 'return_notes']);
        });
    }
};
