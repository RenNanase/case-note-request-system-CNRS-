<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Carbon\Carbon;

class CaseNoteHandover extends Model
{
    use SoftDeletes, LogsActivity;

    // Handover status constants
    const STATUS_PENDING = 'pending';
    const STATUS_Acknowledge = 'Acknowledge';
    const STATUS_COMPLETED = 'completed';

    protected $fillable = [
        'case_note_request_id',
        'handed_over_by_user_id',
        'handed_over_to_user_id',
        'department_id',
        'location_id',
        'handover_doctor_id',
        'handover_reason',
        'additional_notes',
        'status',
        'Acknowledge_at',
        'Acknowledge_by_user_id',
        'acknowledgment_notes',
        'verified_at',
        'receipt_verification_notes',
    ];

    protected $casts = [
        'Acknowledge_at' => 'datetime',
        'completed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Activity log options
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['status', 'handover_reason', 'Acknowledge_at', 'acknowledgment_notes'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relationships
     */
    public function caseNoteRequest(): BelongsTo
    {
        return $this->belongsTo(Request::class, 'case_note_request_id');
    }

    public function handedOverBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handed_over_by_user_id');
    }

    public function handedOverTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handed_over_to_user_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function handoverDoctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'handover_doctor_id');
    }

    public function AcknowledgeBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'Acknowledge_by_user_id');
    }

    /**
     * Query scopes
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeAcknowledge(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_Acknowledge);
    }

    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    public function scopeByUser(Builder $query, int $userId): Builder
    {
        return $query->where('handed_over_to_user_id', $userId);
    }

    public function scopeByRequest(Builder $query, int $requestId): Builder
    {
        return $query->where('case_note_request_id', $requestId);
    }

    /**
     * Helper methods
     */
    public function canBeAcknowledge(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function canBeCompleted(): bool
    {
        return $this->status === self::STATUS_Acknowledge;
    }

    public function acknowledge(User $user, ?string $notes = null): bool
    {
        if (!$this->canBeAcknowledge()) {
            return false;
        }

        $this->update([
            'status' => self::STATUS_Acknowledge,
            'Acknowledge_at' => now(),
            'Acknowledge_by_user_id' => $user->id,
            'acknowledgment_notes' => $notes,
        ]);

        // Log the acknowledgment
        $this->logActivity('Acknowledge', $user, $notes);

        return true;
    }

    public function complete(User $user): bool
    {
        if (!$this->canBeCompleted()) {
            return false;
        }

        $this->update([
            'status' => self::STATUS_COMPLETED,
        ]);

        // Log the completion
        $this->logActivity('completed', $user);

        return true;
    }

    private function logActivity(string $action, User $user, ?string $notes = null): void
    {
        activity()
            ->performedOn($this)
            ->causedBy($user)
            ->withProperties([
                'action' => $action,
                'notes' => $notes,
                'handover_id' => $this->id,
                'request_id' => $this->case_note_request_id,
            ])
            ->log("Case note handover {$action}");
    }

    /**
     * Static methods
     */
    public static function getStatusOptions(): array
    {
        return [
            self::STATUS_PENDING => 'Pending',
            self::STATUS_Acknowledge => 'Acknowledge',
            self::STATUS_COMPLETED => 'Completed',
        ];
    }
}
