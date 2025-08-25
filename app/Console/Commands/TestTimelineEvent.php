<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Request;
use App\Models\RequestEvent;
use App\Models\CaseNoteHandover;

class TestTimelineEvent extends Command
{
    protected $signature = 'test:timeline-event {request_id}';
    protected $description = 'Test timeline event creation and retrieval for a specific request';

    public function handle()
    {
        $requestId = $this->argument('request_id');

        $this->info("Testing timeline events for request ID: {$requestId}");

        // Find the request
        $request = Request::find($requestId);
        if (!$request) {
            $this->error("Request {$requestId} not found");
            return 1;
        }

        $this->info("Request found: {$request->request_number}");

        // Check existing events
        $events = $request->events;
        $this->info("Total events: {$events->count()}");

        foreach ($events as $event) {
            $this->line("Event ID: {$event->id}, Type: {$event->type}, Created: {$event->created_at}");
            if ($event->metadata) {
                $this->line("  Metadata keys: " . implode(', ', array_keys($event->metadata)));
            }
        }

        // Check handover events specifically
        $handoverEvents = $events->where('type', 'handed_over');
        $this->info("Handover events: {$handoverEvents->count()}");

        foreach ($handoverEvents as $event) {
            $this->line("Handover Event ID: {$event->id}");
            $this->line("  Reason: {$event->reason}");
            if ($event->metadata) {
                $this->line("  Handed Over To: " . ($event->metadata['handed_over_to_user_name'] ?? 'Not found'));
                $this->line("  Reason: " . ($event->metadata['handover_reason'] ?? 'Not found'));
            }
        }

        // Check if there are handover records for this request
        $handovers = CaseNoteHandover::where('case_note_request_id', $requestId)->get();
        $this->info("Handover records: {$handovers->count()}");

        foreach ($handovers as $handover) {
            $this->line("Handover ID: {$handover->id}");
            $this->line("  From: {$handover->handedOverBy->name}");
            $this->line("  To: {$handover->handedOverTo->name}");
            $this->line("  Status: {$handover->status}");
        }

        // Test creating a new timeline event
        $this->info("\nTesting timeline event creation...");

        try {
            $newEvent = $request->events()->create([
                'type' => RequestEvent::TYPE_HANDED_OVER,
                'actor_user_id' => 1, // Use a test user ID
                'reason' => 'Test handover event for debugging',
                'occurred_at' => now(),
                'metadata' => [
                    'test' => true,
                    'handed_over_to_user_name' => 'Test User',
                    'handover_reason' => 'Testing timeline event creation'
                ]
            ]);

            $this->info("Test timeline event created successfully with ID: {$newEvent->id}");

            // Clean up - delete the test event
            $newEvent->delete();
            $this->info("Test event cleaned up");

        } catch (\Exception $e) {
            $this->error("Failed to create test timeline event: " . $e->getMessage());
            $this->error("Stack trace: " . $e->getTraceAsString());
        }

        return 0;
    }
}
