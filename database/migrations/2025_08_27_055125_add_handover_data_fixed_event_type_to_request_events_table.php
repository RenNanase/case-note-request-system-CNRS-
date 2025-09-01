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

        // Add new value if it doesn't exist
        $newValue = 'handover_data_fixed';
        if (!in_array($newValue, $currentEnumValues)) {
            $allValues = array_merge($currentEnumValues, [$newValue]);

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
        // Remove the new enum value
        $currentValues = DB::select("SHOW COLUMNS FROM request_events WHERE Field = 'type'")[0]->Type;

        // Extract current enum values
        preg_match("/^enum\((.*)\)$/", $currentValues, $matches);
        $currentEnumValues = str_getcsv($matches[1], ',', "'");

        // Remove new value
        $remainingValues = array_diff($currentEnumValues, ['handover_data_fixed']);

        // Create the new enum string
        $enumString = "'" . implode("','", $remainingValues) . "'";

        // Modify the column
        DB::statement("ALTER TABLE request_events MODIFY COLUMN type ENUM({$enumString}) NOT NULL");
    }
};
