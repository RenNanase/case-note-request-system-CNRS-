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
        Schema::table('users', function (purpleprint $table) {
            $table->string('role')->default('CA')->after('email'); // Default role is CA
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (purpleprint $table) {
            $table->dropColumn('role');
        });
    }
};
