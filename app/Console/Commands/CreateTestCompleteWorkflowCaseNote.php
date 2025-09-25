<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Request;
use App\Models\Patient;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\Location;
use App\Models\User;

class CreateTestCompleteWorkflowCaseNote extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'create:test-complete-workflow-case-note';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a test case note for testing the complete workflow';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("=== Creating Test Case Note for Complete Workflow ===");

        try {
            // Get a CA user
            $caUser = User::where('email', 'ca@cnrs.jmc')->first();
            if (!$caUser) {
                $this->error("CA user not found");
                return;
            }

            // Get a patient
            $patient = Patient::first();
            if (!$patient) {
                $this->error("No patients found");
                return;
            }

            // Get a department
            $department = Department::first();
            if (!$department) {
                $this->error("No departments found");
                return;
            }

            // Get a doctor
            $doctor = Doctor::first();
            if (!$doctor) {
                $this->error("No doctors found");
                return;
            }

            // Get a location
            $location = Location::first();
            if (!$location) {
                $this->error("No locations found");
                return;
            }

            $this->line("Creating test case note for complete workflow...");
            $this->line("Patient: {$patient->name}");
            $this->line("Department: {$department->name}");
            $this->line("Doctor: {$doctor->name}");
            $this->line("Location: {$location->name}");
            $this->line("CA User: {$caUser->name}");

            // Create the case note
            $caseNote = Request::create([
                'request_number' => 'COMPLETE-' . substr(time(), -6),
                'patient_id' => $patient->id,
                'department_id' => $department->id,
                'doctor_id' => $doctor->id,
                'location_id' => $location->id,
                'priority' => 'normal',
                'purpose' => 'Test case note for complete workflow testing',
                'needed_date' => now()->addDays(7),
                'status' => 'approved',
                'requested_by_user_id' => $caUser->id,
                'current_pic_user_id' => $caUser->id,
                'approved_at' => now(),
                'approved_by_user_id' => 2, // Hanako (MR Staff)
                'is_received' => true,
                'received_at' => now(),
                'received_by_user_id' => $caUser->id,
                'reception_notes' => 'Test case note received for complete workflow testing',
                'is_returned' => false,
                'is_rejected_return' => false,
            ]);

            $this->info("✅ Test case note created successfully!");
            $this->line("Case Note ID: {$caseNote->id}");
            $this->line("Status: {$caseNote->status}");
            $this->line("Is Received: " . ($caseNote->is_received ? 'Yes' : 'No'));
            $this->line("Is Returned: " . ($caseNote->is_returned ? 'Yes' : 'No'));

            $this->info("\n=== Complete Workflow Test Steps ===");
            $this->line("1. As CA user (Rize Kamishiro), go to Return Case Notes page");
            $this->line("2. Select this case note (ID: {$caseNote->id}) and return it");
            $this->line("3. As MR Staff (Hanako), go to Returned Case Notes page");
            $this->line("4. Verify the returned case note");
            $this->line("5. Check that the status changes to 'Complete'");
            $this->line("6. Verify that current_pic_user_id becomes NULL");
            $this->line("7. Check that any CA can now request this completed case note");

        } catch (\Exception $e) {
            $this->error("❌ Error creating test case note: " . $e->getMessage());
        }
    }
}
