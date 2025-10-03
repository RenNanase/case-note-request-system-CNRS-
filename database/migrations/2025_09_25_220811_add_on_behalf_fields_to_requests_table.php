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
            // Fields for tracking on behalf actions
            $table->unsignedBigInteger('verified_on_behalf_by_user_id')->nullable()->after('received_by_user_id');
            $table->unsignedBigInteger('approved_on_behalf_by_user_id')->nullable()->after('approved_by_user_id');
            $table->unsignedBigInteger('approved_on_behalf_of_user_id')->nullable()->after('approved_on_behalf_by_user_id');

            // Add foreign key constraints
            $table->foreign('verified_on_behalf_by_user_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('approved_on_behalf_by_user_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('approved_on_behalf_of_user_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            $table->dropForeign(['verified_on_behalf_by_user_id']);
            $table->dropForeign(['approved_on_behalf_by_user_id']);
            $table->dropForeign(['approved_on_behalf_of_user_id']);

            $table->dropColumn([
                'verified_on_behalf_by_user_id',
                'approved_on_behalf_by_user_id',
                'approved_on_behalf_of_user_id'
            ]);
        });
    }
};
