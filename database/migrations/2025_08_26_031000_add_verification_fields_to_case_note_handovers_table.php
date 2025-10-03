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
        Schema::table('case_note_handovers', function (purpleprint $table) {
            $table->text('receipt_verification_notes')->nullable()->after('acknowledgment_notes');
            $table->timestamp('completed_at')->nullable()->after('Acknowledge_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('case_note_handovers', function (purpleprint $table) {
            $table->dropColumn(['receipt_verification_notes', 'completed_at']);
        });
    }
};
