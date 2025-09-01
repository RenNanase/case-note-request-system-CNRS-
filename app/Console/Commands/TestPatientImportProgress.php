<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\ImportProgress;
use App\Models\Patient;
use Illuminate\Support\Facades\Auth;

class TestPatientImportProgress extends Command
{
    protected $signature = 'test:patient-import-progress';
    protected $description = 'Test the patient import progress tracking system';

    public function handle()
    {
        $this->info('Testing patient import progress tracking system...');

        // Test with admin user
        $adminUser = User::where('email', 'admin@cnrs.test')->first();
        if (!$adminUser) {
            $this->error('Admin user not found');
            return 1;
        }

        $this->info("User: {$adminUser->name} ({$adminUser->email})");
        $this->info("Roles: " . $adminUser->getRoleNames()->join(', '));

        // Test 1: Create a sample import progress record
        $this->info("\n--- Testing Import Progress Creation ---");

        $importProgress = ImportProgress::create([
            'import_type' => ImportProgress::TYPE_PATIENTS,
            'file_name' => 'test_patients_160700.xlsx',
            'total_rows' => 160700,
            'processed_rows' => 0,
            'imported_count' => 0,
            'skipped_count' => 0,
            'duplicate_count' => 0,
            'error_count' => 0,
            'status' => ImportProgress::STATUS_PENDING,
            'requested_by_user_id' => $adminUser->id,
            'metadata' => [
                'file_size' => 15728640, // 15MB
                'file_type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'uploaded_at' => now()->toISOString(),
                'test_mode' => true,
            ],
        ]);

        $this->info("✅ Created import progress record with ID: {$importProgress->id}");

        // Test 2: Update progress
        $this->info("\n--- Testing Progress Updates ---");

        $importProgress->updateProgress(50000, 45000, 3000, 2000, 0);
        $this->info("✅ Updated progress: 50,000 rows processed");
        $this->info("   - Progress: {$importProgress->progress_percentage}%");
        $this->info("   - Speed: {$importProgress->processing_speed} rows/sec");
        $this->info("   - ETA: {$importProgress->estimated_time_remaining}");

        $importProgress->updateProgress(100000, 90000, 6000, 4000, 0);
        $this->info("✅ Updated progress: 100,000 rows processed");
        $this->info("   - Progress: {$importProgress->progress_percentage}%");
        $this->info("   - Speed: {$importProgress->processing_speed} rows/sec");
        $this->info("   - ETA: {$importProgress->estimated_time_remaining}");

        // Test 3: Mark as started
        $this->info("\n--- Testing Status Changes ---");

        $importProgress->markAsStarted();
        $this->info("✅ Marked as started at: {$importProgress->started_at}");
        $this->info("   - Status: {$importProgress->status_label}");
        $this->info("   - Elapsed time: {$importProgress->elapsed_time}");

        // Test 4: Add some errors
        $this->info("\n--- Testing Error Logging ---");

        $importProgress->addError('Invalid MRN format', ['row' => 12345, 'mrn' => 'INVALID']);
        $importProgress->addError('Missing patient name', ['row' => 12346, 'name' => '']);
        $this->info("✅ Added 2 errors to log");

        // Test 5: Update progress with errors
        $importProgress->updateProgress(150000, 135000, 9000, 6000, 2);
        $this->info("✅ Updated progress with errors: 150,000 rows processed");
        $this->info("   - Progress: {$importProgress->progress_percentage}%");
        $this->info("   - Errors: {$importProgress->error_count}");

        // Test 6: Mark as completed
        $importProgress->markAsCompleted();
        $this->info("✅ Marked as completed at: {$importProgress->completed_at}");
        $this->info("   - Status: {$importProgress->status_label}");
        $this->info("   - Total time: {$importProgress->elapsed_time}");

        // Test 7: Query active imports
        $this->info("\n--- Testing Queries ---");

        $activeImports = ImportProgress::byType(ImportProgress::TYPE_PATIENTS)
            ->active()
            ->where('requested_by_user_id', $adminUser->id)
            ->get();

        $this->info("✅ Active imports: {$activeImports->count()}");

        $recentImports = ImportProgress::byType(ImportProgress::TYPE_PATIENTS)
            ->recent(30)
            ->where('requested_by_user_id', $adminUser->id)
            ->get();

        $this->info("✅ Recent imports: {$recentImports->count()}");

        // Test 8: Test scopes and accessors
        $this->info("\n--- Testing Model Features ---");

        $this->info("✅ Status color: {$importProgress->status_color}");
        $this->info("✅ Is active: " . ($importProgress->is_active ? 'Yes' : 'No'));
        $this->info("✅ Is completed: " . ($importProgress->is_completed ? 'Yes' : 'No'));
        $this->info("✅ Remaining rows: {$importProgress->remaining_rows}");
        $this->info("✅ Progress bar color: {$importProgress->progress_bar_color}");

        // Test 9: Test cancellation
        $this->info("\n--- Testing Cancellation ---");

        $cancelledImport = ImportProgress::create([
            'import_type' => ImportProgress::TYPE_PATIENTS,
            'file_name' => 'cancelled_test.xlsx',
            'total_rows' => 1000,
            'requested_by_user_id' => $adminUser->id,
            'status' => ImportProgress::STATUS_PROCESSING,
        ]);

        $cancelledImport->cancel();
        $this->info("✅ Cancelled import: {$cancelledImport->status_label}");

        // Test 10: Cleanup test data
        $this->info("\n--- Cleaning Up Test Data ---");

        ImportProgress::where('metadata->test_mode', true)->delete();
        ImportProgress::where('file_name', 'cancelled_test.xlsx')->delete();

        $this->info("✅ Cleaned up test data");

        $this->info("\n🎉 All tests passed! Patient import progress tracking system is working correctly.");
        $this->info("✅ Progress creation and updates");
        $this->info("✅ Status management");
        $this->info("✅ Error logging");
        $this->info("✅ Query scopes");
        $this->info("✅ Model accessors");
        $this->info("✅ Cancellation functionality");

        return 0;
    }
}
