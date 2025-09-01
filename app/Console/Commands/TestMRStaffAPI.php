<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Request;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class TestMRStaffAPI extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:mrs-api';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the MR Staff returned submissions API';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("=== Testing MR Staff Returned Submissions API ===");

        // Check what case notes exist with pending_return_verification status
        $this->info("\n=== Case Notes with pending_return_verification Status ===");
        $pendingVerification = Request::with(['patient', 'department', 'doctor', 'returnedBy'])
            ->where('status', 'pending_return_verification')
            ->where('is_returned', true)
            ->get();

        $this->line("Total pending verification case notes: {$pendingVerification->count()}");

        foreach ($pendingVerification as $cn) {
            $this->line("- ID: {$cn->id}, Patient: {$cn->patient->name}, Status: {$cn->status}, Returned by: {$cn->returnedBy->name}, Returned at: {$cn->returned_at}");
        }

        // Check the grouping logic
        $this->info("\n=== Testing Grouping Logic ===");
        $groupedSubmissions = $pendingVerification->groupBy('returned_by_user_id')
            ->map(function ($caseNotes, $caUserId) {
                $firstCaseNote = $caseNotes->first();
                $caUser = $firstCaseNote->returnedBy;

                return [
                    'ca_user_id' => $caUserId,
                    'ca_name' => $caUser->name,
                    'submission_date' => $caseNotes->max('returned_at'),
                    'case_notes' => $caseNotes->map(function ($cn) {
                        return [
                            'id' => $cn->id,
                            'patient' => [
                                'id' => $cn->patient->id,
                                'name' => $cn->patient->name,
                                'mrn' => $cn->patient->mrn,
                            ],
                            'department' => [
                                'id' => $cn->department->id,
                                'name' => $cn->department->name,
                                'code' => $cn->department->code,
                            ],
                            'doctor' => [
                                'id' => $cn->doctor->id,
                                'name' => $cn->doctor->name,
                            ],
                            'returned_at' => $cn->returned_at,
                            'returned_by_user' => [
                                'id' => $cn->returnedBy->id,
                                'name' => $cn->returnedBy->name,
                            ],
                            'return_notes' => $cn->return_notes,
                            'status' => $cn->status,
                        ];
                    })->toArray(),
                    'total_count' => $caseNotes->count(),
                ];
            })
            ->values()
            ->toArray();

        $this->line("Grouped submissions count: " . count($groupedSubmissions));

        foreach ($groupedSubmissions as $submission) {
            $this->line("- CA: {$submission['ca_name']} (ID: {$submission['ca_user_id']}), Case notes: {$submission['total_count']}");
        }

        // Check if there are any MR Staff users
        $this->info("\n=== MR Staff Users ===");
        $mrStaffUsers = User::role('MR_STAFF')->get();
        $this->line("Total MR Staff users: {$mrStaffUsers->count()}");

        foreach ($mrStaffUsers as $user) {
            $this->line("- ID: {$user->id}, Name: {$user->name}, Email: {$user->email}");
        }

        // Check the actual API response
        $this->info("\n=== Simulating API Response ===");
        $this->line("API Response would be:");
        $this->line(json_encode([
            'success' => true,
            'submissions' => $groupedSubmissions,
        ], JSON_PRETTY_PRINT));
    }
}
