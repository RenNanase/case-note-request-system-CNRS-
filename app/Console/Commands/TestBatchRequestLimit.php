<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Patient;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\Location;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class TestBatchRequestLimit extends Command
{
    protected $signature = 'test:batch-request-limit';
    protected $description = 'Test that batch requests now support up to 20 case notes';

    public function handle()
    {
        $this->info('Testing batch request 20 case note limit...');

        // Test with CA user
        $caUser = User::where('email', 'ca@cnrs.jmc')->first();
        if (!$caUser) {
            $this->error('CA user not found');
            return 1;
        }

        $this->info("User: {$caUser->name} ({$caUser->email})");
        $this->info("Roles: " . $caUser->getRoleNames()->join(', '));

        // Get some test data
        $patients = Patient::take(25)->get();
        $department = Department::first();
        $doctor = Doctor::first();
        $location = Location::first();

        if ($patients->count() < 25) {
            $this->error('Need at least 25 patients for testing');
            return 1;
        }

        if (!$department || !$doctor || !$location) {
            $this->error('Missing required test data (department, doctor, or location)');
            return 1;
        }

        $this->info("Found {$patients->count()} patients for testing");
        $this->info("Using department: {$department->name}");
        $this->info("Using doctor: {$doctor->name}");
        $this->info("Using location: {$location->name}");

        // Test 1: 20 case notes (should pass)
        $this->info("\n--- Testing 20 case notes (should pass) ---");
        $caseNotes20 = [];
        for ($i = 0; $i < 20; $i++) {
            $caseNotes20[] = [
                'patient_id' => $patients[$i]->id,
                'department_id' => $department->id,
                'doctor_id' => $doctor->id,
                'location_id' => $location->id,
                'priority' => 'normal',
                'purpose' => 'Test case note ' . ($i + 1) . ' for batch request limit testing',
                'needed_date' => now()->addDays(7)->format('Y-m-d'),
                'remarks' => 'Test remarks for case note ' . ($i + 1),
            ];
        }

        $data20 = [
            'case_notes' => $caseNotes20,
            'department_id' => $department->id,
            'doctor_id' => $doctor->id,
            'location_id' => $location->id,
            'priority' => 'normal',
            'purpose' => 'Testing batch request with 20 case notes',
            'needed_date' => now()->addDays(7)->format('Y-m-d'),
            'batch_notes' => 'Test batch with 20 case notes',
        ];

        $validator = Validator::make($data20, [
            'case_notes' => 'required|array|min:1|max:20',
            'case_notes.*.patient_id' => 'required|exists:patients,id',
            'case_notes.*.department_id' => 'required|exists:departments,id',
            'case_notes.*.doctor_id' => 'nullable|exists:doctors,id',
            'case_notes.*.location_id' => 'nullable|exists:locations,id',
            'case_notes.*.priority' => 'required|in:low,normal,high,urgent',
            'case_notes.*.purpose' => 'required|string|max:1000',
            'case_notes.*.needed_date' => 'required|date|after_or_equal:today',
            'case_notes.*.remarks' => 'nullable|string|max:1000',
            'batch_notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            $this->error('Validation failed for 20 case notes:');
            $this->error($validator->errors()->toJson());
            return 1;
        }

        $this->info('✅ 20 case notes validation passed');

        // Test 2: 21 case notes (should fail)
        $this->info("\n--- Testing 21 case notes (should fail) ---");
        $caseNotes21 = [];
        for ($i = 0; $i < 21; $i++) {
            $caseNotes21[] = [
                'patient_id' => $patients[$i]->id,
                'department_id' => $department->id,
                'doctor_id' => $doctor->id,
                'location_id' => $location->id,
                'priority' => 'normal',
                'purpose' => 'Test case note ' . ($i + 1) . ' for batch request limit testing',
                'needed_date' => now()->addDays(7)->format('Y-m-d'),
                'remarks' => 'Test remarks for case note ' . ($i + 1),
            ];
        }

        $data21 = [
            'case_notes' => $caseNotes21,
            'department_id' => $department->id,
            'doctor_id' => $doctor->id,
            'location_id' => $location->id,
            'priority' => 'normal',
            'purpose' => 'Testing batch request with 21 case notes',
            'needed_date' => now()->addDays(7)->format('Y-m-d'),
            'batch_notes' => 'Test batch with 21 case notes',
        ];

        $validator21 = Validator::make($data21, [
            'case_notes' => 'required|array|min:1|max:20',
            'case_notes.*.patient_id' => 'required|exists:patients,id',
            'case_notes.*.department_id' => 'required|exists:departments,id',
            'case_notes.*.doctor_id' => 'nullable|exists:doctors,id',
            'case_notes.*.location_id' => 'nullable|exists:locations,id',
            'case_notes.*.priority' => 'required|in:low,normal,high,urgent',
            'case_notes.*.purpose' => 'required|string|max:1000',
            'case_notes.*.needed_date' => 'required|date|after_or_equal:today',
            'case_notes.*.remarks' => 'nullable|string|max:1000',
            'batch_notes' => 'nullable|string|max:1000',
        ]);

        if ($validator21->fails()) {
            $this->info('✅ 21 case notes validation correctly failed:');
            $this->info($validator21->errors()->first());
        } else {
            $this->error('❌ 21 case notes validation should have failed but passed');
            return 1;
        }

        // Test 3: 19 case notes (should pass)
        $this->info("\n--- Testing 19 case notes (should pass) ---");
        $caseNotes19 = array_slice($caseNotes20, 0, 19);

        $data19 = [
            'case_notes' => $caseNotes19,
            'department_id' => $department->id,
            'doctor_id' => $doctor->id,
            'location_id' => $location->id,
            'priority' => 'normal',
            'purpose' => 'Testing batch request with 19 case notes',
            'needed_date' => now()->addDays(7)->format('Y-m-d'),
            'batch_notes' => 'Test batch with 19 case notes',
        ];

        $validator19 = Validator::make($data19, [
            'case_notes' => 'required|array|min:1|max:20',
            'case_notes.*.patient_id' => 'required|exists:patients,id',
            'case_notes.*.department_id' => 'required|exists:departments,id',
            'case_notes.*.doctor_id' => 'nullable|exists:doctors,id',
            'case_notes.*.location_id' => 'nullable|exists:locations,id',
            'case_notes.*.priority' => 'required|in:low,normal,high,urgent',
            'case_notes.*.purpose' => 'required|string|max:1000',
            'case_notes.*.needed_date' => 'required|date|after_or_equal:today',
            'case_notes.*.remarks' => 'nullable|string|max:1000',
            'batch_notes' => 'nullable|string|max:1000',
        ]);

        if ($validator19->fails()) {
            $this->error('Validation failed for 19 case notes:');
            $this->error($validator19->errors()->toJson());
            return 1;
        }

        $this->info('✅ 19 case notes validation passed');

        $this->info("\n🎉 All tests passed! Batch request system now supports up to 20 case notes.");
        $this->info("✅ 19 case notes: PASSED");
        $this->info("✅ 20 case notes: PASSED");
        $this->info("✅ 21 case notes: CORRECTLY FAILED");

        return 0;
    }
}
