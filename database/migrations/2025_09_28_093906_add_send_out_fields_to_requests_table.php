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
            $table->boolean('is_sent_out')->default(false)->after('is_rejected_return');
            $table->unsignedBigInteger('send_out_id')->nullable()->after('is_sent_out');
            $table->foreign('send_out_id')->references('id')->on('send_out_case_notes')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            $table->dropForeign(['send_out_id']);
            $table->dropColumn(['is_sent_out', 'send_out_id']);
        });
    }
};
