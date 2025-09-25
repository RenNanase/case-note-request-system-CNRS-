# Automatic Location Recording for Case Note Completion

## Overview
When a case note is marked as complete, the system now automatically records the current location as "Medical Record Department" in the timeline events. This ensures all users know where the case note is currently located.

## Implementation Details

### 1. Request Model (`app/Models/Request.php`)
**Modified the `complete()` method** to automatically include location information:

```php
public function complete(User $user): bool
{
    if (!$this->can_be_completed) {
        return false;
    }

    $this->update([
        'status' => self::STATUS_COMPLETED,
        'completed_at' => now(),
        'completed_by_user_id' => $user->id,
    ]);

    $this->events()->create([
        'type' => 'completed',
        'actor_user_id' => $user->id,
        'occurred_at' => now(),
        'metadata' => [
            'completed_by_name' => $user->name,
            'old_status' => $this->getOriginal('status'),
            'new_status' => 'completed',
            'location_name' => 'Medical Record Department',  // ← NEW
            'completion_notes' => 'Case note completed and stored in Medical Record Department'  // ← NEW
        ]
    ]);

    return true;
}
```

### 2. CaseNoteTimelineController (`app/Http/Controllers/Api/CaseNoteTimelineController.php`)
**Updated the `formatEventDescription()` method** to display location information for completed events:

```php
case 'completed':
    $completer = $metadata['completed_by_name'] ?? $event->actor->name ?? 'Unknown';
    $notes = $metadata['completion_notes'] ?? $event->reason ?? '';
    $locationName = $metadata['location_name'] ?? null;
    
    $description = "Case note completed by {$completer}";
    if ($locationName) {
        $description .= " | Location: {$locationName}";
    }
    return $description . ($notes ? " - {$notes}" : '');
```

### 3. Additional Completion Points
**Updated other completion scenarios** to include the same location information:

- **RequestController**: `returned_verified` events (when MR staff verifies returned case notes)
- **BatchRequestController**: `TYPE_VERIFIED_RECEIVED` events (when batch requests are verified)
- **CaseNoteTimelineController**: `returned_verified` event formatting

## Timeline Event Display

### Before:
```
Case note completed by John Doe
```

### After:
```
Case note completed by John Doe | Location: Medical Record Department - Case note completed and stored in Medical Record Department
```

## Benefits

1. **Clear Location Tracking**: Users always know where completed case notes are located
2. **Consistent Information**: All completion events now include standardized location information
3. **Audit Trail**: Complete history of case note locations throughout the workflow
4. **User Clarity**: No ambiguity about where completed case notes are stored

## Event Types Affected

The following event types now include automatic location recording:

- `completed` - Direct completion via Request model
- `returned_verified` - When MR staff verifies returned case notes
- `TYPE_VERIFIED_RECEIVED` - When batch requests are verified and completed

## Testing

To test this functionality:

1. **Complete a case note** using the MR Staff interface
2. **Check the timeline** to see the location information displayed
3. **Verify the metadata** contains `location_name` and `completion_notes`

## Database Impact

- **No schema changes** required
- **Metadata field** stores the location information
- **Backward compatible** with existing timeline events
- **No performance impact** on existing queries

## Future Enhancements

This implementation provides a foundation for:
- Configurable location names
- Multiple location tracking
- Location-based reporting
- Integration with physical tracking systems
