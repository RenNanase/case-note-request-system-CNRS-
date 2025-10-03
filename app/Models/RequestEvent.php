<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Carbon\Carbon;

class RequestEvent extends Model
{
    use LogsActivity;

    // Event type constants
    const TYPE_CREATED = 'created';
    const TYPE_SUBMITTED = 'submitted';
    const TYPE_APPROVED = 'approved';
    const TYPE_REJECTED = 'rejected';
    const TYPE_IN_PROGRESS = 'in_progress';
    const TYPE_HANDED_OVER = 'handed_over';
    const TYPE_RECEIVED = 'received';
    const TYPE_VERIFIED_RECEIVED = 'verified_received';
    const TYPE_COMPLETED = 'completed';
    const TYPE_RETURNED = 'returned';
    const TYPE_REJECTED_NOT_RECEIVED = 'rejected_not_received';
    const TYPE_RETURNED_VERIFIED = 'returned_verified';
    const TYPE_RETURNED_REJECTED = 'returned_rejected';
    const TYPE_HANDOVER_DATA_FIXED = 'handover_data_fixed';
    const TYPE_FILING_SUBMITTED = 'filing_submitted';
    const TYPE_FILING_APPROVED = 'filing_approved';
    const TYPE_FILING_REJECTED = 'filing_rejected';
    const TYPE_SENT_OUT = 'sent_out';
    const TYPE_Acknowledge_RECEIVED = 'Acknowledge_received';

    protected $fillable = [
        'request_id',
        'type',
        'actor_user_id',
        'to_location_id',
        'to_person',
        'reason',
        'metadata',
        'occurred_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'occurred_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Activity log options
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['request_id', 'type', 'actor_user_id', 'to_location_id', 'occurred_at'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relationships
     */
    public function request(): BelongsTo
    {
        return $this->belongsTo(Request::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }

    public function toLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'to_location_id');
    }

    /**
     * Scopes
     */
    public function scopeByType($query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    public function scopeByRequest($query, int $requestId): Builder
    {
        return $query->where('request_id', $requestId);
    }

    public function scopeByActor($query, int $userId): Builder
    {
        return $query->where('actor_user_id', $userId);
    }

    public function scopeChronological($query): Builder
    {
        return $query->orderBy('occurred_at');
    }

    public function scopeRecentFirst($query): Builder
    {
        return $query->orderBy('occurred_at', 'desc');
    }

    public function scopeBetweenDates($query, Carbon $from, Carbon $to): Builder
    {
        return $query->whereBetween('occurred_at', [$from, $to]);
    }

    /**
     * Accessors & Mutators
     */
    public function getTypeLabelAttribute(): string
    {
        return match($this->type) {
            self::TYPE_CREATED => 'Created',
            self::TYPE_SUBMITTED => 'Submitted',
            self::TYPE_APPROVED => 'Approved',
            self::TYPE_REJECTED => 'Rejected',
            self::TYPE_IN_PROGRESS => 'In Progress',
            self::TYPE_HANDED_OVER => 'Handed Over',
            self::TYPE_RECEIVED => 'Received',
            self::TYPE_VERIFIED_RECEIVED => 'Receipt Verified',
            self::TYPE_COMPLETED => 'Completed',
            self::TYPE_RETURNED => 'Returned',
            self::TYPE_FILING_SUBMITTED => 'Filing Submitted',
            self::TYPE_FILING_APPROVED => 'Filing Approved',
            self::TYPE_FILING_REJECTED => 'Filing Rejected',
            self::TYPE_SENT_OUT => 'Sent Out',
            self::TYPE_Acknowledge_RECEIVED => 'Acknowledge Received',
            default => 'Unknown'
        };
    }

    public function getDescriptionAttribute(): string
    {
        $description = $this->type_label;

        if ($this->actor) {
            $description .= " by {$this->actor->name}";
        }

        if ($this->to_location) {
            $description .= " to {$this->to_location->name}";
        }

        if ($this->to_person) {
            $description .= " ({$this->to_person})";
        }

        return $description;
    }

    public function getTimeAgoAttribute(): string
    {
        return $this->occurred_at->diffForHumans();
    }

    /**
     * Helper methods
     */
    public function toTimelineItem(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'type_label' => $this->type_label,
            'description' => $this->description,
            'actor' => $this->actor?->name,
            'location' => $this->toLocation?->full_name,
            'person' => $this->to_person,
            'reason' => $this->reason,
            'occurred_at' => $this->occurred_at,
            'occurred_at_human' => $this->time_ago,
            'metadata' => $this->metadata,
        ];
    }

    public static function getTypeOptions(): array
    {
        return [
            self::TYPE_CREATED => 'Created',
            self::TYPE_SUBMITTED => 'Submitted',
            self::TYPE_APPROVED => 'Approved',
            self::TYPE_REJECTED => 'Rejected',
            self::TYPE_IN_PROGRESS => 'In Progress',
            self::TYPE_HANDED_OVER => 'Handed Over',
            self::TYPE_RECEIVED => 'Received',
            self::TYPE_VERIFIED_RECEIVED => 'Receipt Verified',
            self::TYPE_COMPLETED => 'Completed',
            self::TYPE_RETURNED => 'Returned',
        ];
    }
}
