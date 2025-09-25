<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\purpleprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update existing case notes to have default return field values
        DB::table('requests')
            ->whereNull('is_returned')
            ->update(['is_returned' => false]);

        // Update existing case notes that are approved and received to have proper return status
        DB::table('requests')
            ->where('status', 'approved')
            ->where('is_received', true)
            ->whereNull('is_returned')
            ->update([
                'is_returned' => false,
                'returned_at' => null,
                'returned_by_user_id' => null,
                'return_notes' => null
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to reverse this as it's just setting default values
    }
};
