<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Request;
use App\Models\HandoverRequest;
use Illuminate\Support\Facades\DB;

class FixExistingHandoverData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fix:existing-handover-data';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix existing case notes that were handed over but didn\'t get their doctor/department information updated';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("=== Fixing Existing Handover Data ===");

        // Find all approved handover requests
        $approvedHandovers = HandoverRequest::with(['caseNote', 'doctor', 'department', 'location'])
            ->where('status', 'approved')
            ->get();

        $this->line("Found {$approvedHandovers->count()} approved handover requests");

        $updatedCount = 0;

        foreach ($approvedHandovers as $handover) {
            $caseNote = $handover->caseNote;

            if (!$caseNote) {
                $this->warn("Handover {$handover->id}: Case note not found, skipping...");
                continue;
            }

            $this->line("\nProcessing Handover {$handover->id} for Case Note {$caseNote->id} ({$caseNote->patient->name})");

            // Check if the case note needs updating
            $needsUpdate = false;
            $updates = [];

            if ($handover->doctor_id && $caseNote->doctor_id !== $handover->doctor_id) {
                $needsUpdate = true;
                $updates['doctor_id'] = $handover->doctor_id;
                $this->line("  - Doctor: {$caseNote->doctor->name} → {$handover->doctor->name}");
            }

            if ($handover->department_id && $caseNote->department_id !== $handover->department_id) {
                $needsUpdate = true;
                $updates['department_id'] = $handover->department_id;
                $this->line("  - Department: {$caseNote->department->name} → {$handover->department->name}");
            }

            if ($handover->location_id && $caseNote->location_id !== $handover->location_id) {
                $needsUpdate = true;
                $updates['location_id'] = $handover->location_id;
                $this->line("  - Location: " . ($caseNote->location ? $caseNote->location->name : 'None') . " → {$handover->location->name}");
            }

            if ($needsUpdate) {
                try {
                    DB::beginTransaction();

                    // Update the case note
                    $caseNote->update($updates);

                    // Create a timeline event to record this fix
                    $caseNote->events()->create([
                        'type' => 'handover_data_fixed',
                        'actor_user_id' => 1, // System user
                        'occurred_at' => now(),
                        'reason' => 'Handover data updated retroactively',
                        'metadata' => [
                            'handover_request_id' => $handover->id,
                            'previous_doctor_id' => $caseNote->getOriginal('doctor_id'),
                            'previous_doctor_name' => $caseNote->getOriginal('doctor') ? $caseNote->getOriginal('doctor')->name : 'Unknown',
                            'new_doctor_id' => $handover->doctor_id,
                            'new_doctor_name' => $handover->doctor ? $handover->doctor->name : null,
                            'previous_department_id' => $caseNote->getOriginal('department_id'),
                            'previous_department_name' => $caseNote->getOriginal('department') ? $caseNote->getOriginal('department')->name : 'Unknown',
                            'new_department_id' => $handover->department_id,
                            'new_department_name' => $handover->department ? $handover->department->name : null,
                            'previous_location_id' => $caseNote->getOriginal('location_id'),
                            'previous_location_name' => $caseNote->getOriginal('location') ? $caseNote->getOriginal('location')->name : 'None',
                            'new_location_id' => $handover->location_id,
                            'new_location_name' => $handover->location ? $handover->location->name : null,
                        ]
                    ]);

                    DB::commit();
                    $updatedCount++;

                    $this->info("  ✅ Updated successfully");

                } catch (\Exception $e) {
                    DB::rollBack();
                    $this->error("  ❌ Error updating: " . $e->getMessage());
                }
            } else {
                $this->line("  - No updates needed");
            }
        }

        $this->info("\n=== Summary ===");
        $this->line("Total handovers processed: {$approvedHandovers->count()}");
        $this->line("Case notes updated: {$updatedCount}");

        if ($updatedCount > 0) {
            $this->info("✅ Existing handover data has been fixed!");
            $this->line("The MR Staff Returned Case Notes page should now show the correct doctor/department information.");
        } else {
            $this->info("ℹ️ No updates were needed.");
        }
    }
}
