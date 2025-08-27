<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\RequestEvent;
use App\Models\Request;
use App\Models\Doctor;

class UpdateTimelineEventsWithDoctorInfo extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'timeline:update-doctor-info';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update existing timeline events with doctor information';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Updating timeline events with doctor information...');

        $updatedCount = 0;

        // Get all events that don't have doctor information
        $events = RequestEvent::where('type', 'created')
            ->orWhere('type', 'handover_requested')
            ->get();

        $this->info("Found {$events->count()} events to process...");

        foreach ($events as $event) {
            $request = Request::find($event->request_id);
            if ($request && $request->doctor_id) {
                $doctor = Doctor::find($request->doctor_id);
                if ($doctor) {
                    $metadata = $event->metadata ?? [];
                    $metadata['doctor_id'] = $request->doctor_id;
                    $metadata['doctor_name'] = $doctor->name;

                    $event->update(['metadata' => $metadata]);
                    $updatedCount++;

                    $this->line("Updated event ID {$event->id} with doctor: {$doctor->name}");
                }
            }
        }

        $this->info("Successfully updated {$updatedCount} timeline events with doctor information!");

        return 0;
    }
}
