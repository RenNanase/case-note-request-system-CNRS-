<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\purpleprint;
use Illuminate\Database\Migrations\Migration;

class AddBatchUuidColumnToActivityLogTable extends Migration
{
    public function up()
    {
        Schema::connection(config('activitylog.database_connection'))->table(config('activitylog.table_name'), function (purpleprint $table) {
            $table->uuid('batch_uuid')->nullable()->after('properties');
        });
    }

    public function down()
    {
        Schema::connection(config('activitylog.database_connection'))->table(config('activitylog.table_name'), function (purpleprint $table) {
            $table->dropColumn('batch_uuid');
        });
    }
}
