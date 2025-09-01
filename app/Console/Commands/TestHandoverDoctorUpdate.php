<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Request;
use App\Models\HandoverRequest;
use App\Models\Doctor;
use App\Models\Department;
use App\Models\Location;
use Illuminate\Support\Facades\DB;

class TestHandoverDoctorUpdate extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:handover-doctor-update';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test if handover process correctly updates doctor information';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("=== Testing Handover Doctor Update ===");

        // Check current case notes with pending_return_verification status
        $this->info("\n=== Current Case Notes with pending_return_verification ===");
        $pendingCaseNotes = Request::with(['patient', 'doctor', 'department', 'location'])
            ->where('status', 'pending_return_verification')
            ->get();

        foreach ($pendingCaseNotes as $cn) {
            $this->line("- ID: {$cn->id}, Patient: {$cn->patient->name}");
            $this->line("  Current Doctor: {$cn->doctor->name}");
            $this->line("  Current Department: {$cn->department->name}");
            $this->line("  Current Location: " . ($cn->location ? $cn->location->name : 'None'));
            $this->line("  Handover Status: {$cn->handover_status}");
            $this->line("  Current PIC: {$cn->current_pic_user_id}");
        }

        // Check handover requests
        $this->info("\n=== Handover Requests ===");
        $handoverRequests = HandoverRequest::with(['caseNote.patient', 'doctor', 'department', 'location'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        foreach ($handoverRequests as $hr) {
            $this->line("- ID: {$hr->id}, Case Note: {$hr->caseNote->patient->name}");
            $this->line("  Status: {$hr->status}");
            $this->line("  Requested Doctor: " . ($hr->doctor ? $hr->doctor->name : 'None'));
            $this->line("  Requested Department: " . ($hr->department ? $hr->department->name : 'None'));
            $this->line("  Requested Location: " . ($hr->location ? $hr->location->name : 'None'));
            $this->line("  Requested At: {$hr->requested_at}");
        }

        // Check available doctors for testing
        $this->info("\n=== Available Doctors for Testing ===");
        $doctors = Doctor::where('is_active', true)->limit(5)->get();
        foreach ($doctors as $doctor) {
            $this->line("- ID: {$doctor->id}, Name: {$doctor->name}");
        }

        // Check available departments
        $this->info("\n=== Available Departments for Testing ===");
        $departments = Department::where('is_active', true)->limit(5)->get();
        foreach ($departments as $dept) {
            $this->line("- ID: {$dept->id}, Name: {$dept->name}");
        }

        // Check available locations
        $this->info("\n=== Available Locations for Testing ===");
        $locations = Location::where('is_active', true)->limit(5)->get();
        foreach ($locations as $loc) {
            $this->line("- ID: {$loc->id}, Name: {$loc->name}");
        }

        $this->info("\n=== Test Instructions ===");
        $this->line("1. Create a new handover request with a different doctor/department");
        $this->line("2. Approve the handover request");
        $this->line("3. Check if the case note now shows the new doctor/department");
        $this->line("4. Verify the timeline shows the new doctor information");
    }
}
