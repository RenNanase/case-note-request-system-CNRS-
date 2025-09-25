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
        Schema::table('patients', function (purpleprint $table) {
            $table->string('nationality_id', 20)->nullable()->after('nric')->comment('Nationality identification number for import compatibility');
            $table->index('nationality_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patients', function (purpleprint $table) {
            $table->dropIndex(['nationality_id']);
            $table->dropColumn('nationality_id');
        });
    }
};
