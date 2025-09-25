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
        Schema::table('handover_requests', function (purpleprint $table) {
            //
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('handover_requests', function (purpleprint $table) {
            //
        });
    }
};
