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
        Schema::create('reports_cache', function (Blueprint $table) {
            $table->id();
            $table->string('cache_key')->unique()->comment('Unique cache identifier');
            $table->enum('report_type', [
                'daily_summary', 'weekly_summary', 'monthly_summary',
                'department_stats', 'user_performance', 'request_trends',
                'overdue_report', 'completion_stats'
            ])->comment('Type of cached report');
            $table->date('report_date')->comment('Date this report covers');
            $table->enum('period', ['day', 'week', 'month', 'quarter', 'year'])->comment('Report time period');
            $table->json('filters')->nullable()->comment('Applied filters (department, user, etc.)');
            $table->json('data')->comment('Cached report data as JSON');
            $table->json('metadata')->nullable()->comment('Report metadata (total records, etc.)');
            $table->timestamp('generated_at')->comment('When report was generated');
            $table->timestamp('expires_at')->nullable()->comment('When cache expires');
            $table->boolean('is_stale')->default(false)->comment('Whether cache needs refresh');
            $table->timestamps();

            // Indexes for efficient cache lookups
            // cache_key is already unique from ->unique() above
            $table->index(['report_type', 'report_date']);
            $table->index(['period', 'report_date']);
            $table->index(['expires_at', 'is_stale']);
            $table->index(['generated_at', 'report_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reports_cache');
    }
};
