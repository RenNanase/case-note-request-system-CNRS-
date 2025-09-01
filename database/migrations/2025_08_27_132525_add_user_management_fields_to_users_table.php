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
        Schema::table('users', function (Blueprint $table) {
            // Password management fields
            $table->boolean('password_changed')->default(false)->after('password');
            $table->timestamp('password_changed_at')->nullable()->after('password_changed');
            $table->timestamp('last_login_at')->nullable()->after('password_changed_at');

            // Account status
            $table->boolean('is_active')->default(true)->after('last_login_at');
            $table->timestamp('deactivated_at')->nullable()->after('is_active');
            $table->string('deactivated_by')->nullable()->after('deactivated_at');
            $table->text('deactivation_reason')->nullable()->after('deactivated_by');

            // Password reset tracking
            $table->timestamp('password_reset_at')->nullable()->after('deactivation_reason');
            $table->string('password_reset_by')->nullable()->after('password_reset_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'password_changed',
                'password_changed_at',
                'last_login_at',
                'is_active',
                'deactivated_at',
                'deactivated_by',
                'deactivation_reason',
                'password_reset_at',
                'password_reset_by'
            ]);
        });
    }
};
