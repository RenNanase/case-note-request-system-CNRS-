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
        // Fix existing requests that don't have current_pic_user_id set
        DB::table('requests')
            ->whereNull('current_pic_user_id')
            ->update([
                'current_pic_user_id' => DB::raw('requested_by_user_id'),
                'handover_status' => 'none',
                'updated_at' => now(),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to reverse this as it's just fixing data
    }
};
