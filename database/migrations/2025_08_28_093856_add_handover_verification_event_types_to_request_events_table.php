<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, let's check what the current enum values are
        $currentValues = DB::select("SHOW COLUMNS FROM request_events WHERE Field = 'type'")[0]->Type;

        // Extract current enum values
        preg_match("/^enum\((.*)\)$/", $currentValues, $matches);
        $currentEnumValues = str_getcsv($matches[1], ',', "'");

        // Add new values if they don't exist
        $newValues = ['handover_verified', 'handover_rejected'];
        $valuesToAdd = array_diff($newValues, $currentEnumValues);

        if (!empty($valuesToAdd)) {
            $allValues = array_merge($currentEnumValues, $valuesToAdd);

            // Create the new enum string
            $enumString = "'" . implode("','", $allValues) . "'";

            // Modify the column
            DB::statement("ALTER TABLE request_events MODIFY COLUMN type ENUM({$enumString}) NOT NULL");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove the new enum values
        $currentValues = DB::select("SHOW COLUMNS FROM request_events WHERE Field = 'type'")[0]->Type;

        // Extract current enum values
        preg_match("/^enum\((.*)\)$/", $currentValues, $matches);
        $currentEnumValues = str_getcsv($matches[1], ',', "'");

        // Remove new values
        $remainingValues = array_diff($currentEnumValues, ['handover_verified', 'handover_rejected']);

        // Create the new enum string
        $enumString = "'" . implode("','", $remainingValues) . "'";

        // Modify the column
        DB::statement("ALTER TABLE request_events MODIFY COLUMN type ENUM({$enumString}) NOT NULL");
    }
};
