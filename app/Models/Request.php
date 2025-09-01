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
use Illuminate\Support\Facades\DB;

class Request extends Model
{
    use SoftDeletes, LogsActivity;

    // Request status constants
    const STATUS_PENDING = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_COMPLETED = 'completed';
    const STATUS_REJECTED = 'rejected';
    const STATUS_PENDING_RETURN_VERIFICATION = 'pending_return_verification';

    // Priority constants
    const PRIORITY_LOW = 'low';
    const PRIORITY_NORMAL = 'normal';
    const PRIORITY_HIGH = 'high';
    const PRIORITY_URGENT = 'urgent';

    protected $fillable = [
        'request_number',
        'patient_id',
        'requested_by_user_id',
        'department_id',
        'doctor_id',
        'location_id',
        'priority',
        'status',
        'purpose',
        'remarks',
        'needed_date',
        'approved_at',
        'approved_by_user_id',
        'approval_remarks',
        'completed_at',
        'completed_by_user_id',
        'metadata',
        'current_handover_id',
        'current_pic_user_id',
        'handover_status',
        // Individual verification fields
        'is_received',
        'received_at',
        'received_by_user_id',
        'reception_notes',
        // Rejection fields
        'rejection_reason',
        'rejected_at',
        'rejected_by_user_id',
        // Return fields
        'is_returned',
        'returned_at',
        'returned_by_user_id',
        'return_notes',
        'is_rejected_return',
    ];

    protected $casts = [
        'needed_date' => 'date',
        'approved_at' => 'datetime',
        'completed_at' => 'datetime',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
        'received_at' => 'datetime',
        'is_received' => 'boolean',
        'rejected_at' => 'datetime',
        'returned_at' => 'datetime',
        'is_returned' => 'boolean',
        'is_rejected_return' => 'boolean',
    ];

    /**
     * Boot method to set up model events
     */
    protected static function boot()
    {
        parent::boot();

        // Create a "created" event when a new request is created
        static::created(function ($request) {
            // Load the doctor relationship to get the doctor name
            $doctorName = null;
            if ($request->doctor_id) {
                $doctor = \App\Models\Doctor::find($request->doctor_id);
                $doctorName = $doctor ? $doctor->name : null;
            }

            $request->events()->create([
                'type' => 'created',
                'actor_user_id' => $request->requested_by_user_id,
                'occurred_at' => $request->created_at,
                'reason' => 'Case note request created',
                'metadata' => [
                    'request_number' => $request->request_number,
                    'purpose' => $request->purpose,
                    'priority' => $request->priority,
                    'doctor_id' => $request->doctor_id,
                    'doctor_name' => $doctorName
                ]
            ]);
        });
    }

    /**
     * Activity log options
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['request_number', 'status', 'priority', 'approved_at', 'completed_at'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relationships
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function completedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by_user_id');
    }

    public function handovers(): HasMany
    {
        return $this->hasMany(CaseNoteHandover::class, 'case_note_request_id');
    }

    public function currentHandover(): BelongsTo
    {
        return $this->belongsTo(CaseNoteHandover::class, 'current_handover_id');
    }

    public function currentPIC(): BelongsTo
    {
        return $this->belongsTo(User::class, 'current_pic_user_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(RequestEvent::class)->orderBy('occurred_at');
    }



    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by_user_id');
    }

    public function rejectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by_user_id');
    }

    public function returnedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'returned_by_user_id');
    }

    public function handoverRequests(): HasMany
    {
        return $this->hasMany(HandoverRequest::class, 'case_note_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'related_request_id');
    }

    /**
     * Query scopes
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    public function scopeInProgress(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_IN_PROGRESS);
    }

    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    public function scopeRejected(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_REJECTED);
    }

    public function scopeOverdue(Builder $query): Builder
    {
        return $query->where('needed_date', '<', now()->startOfDay());
    }

    public function scopeByStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    public function scopeByPriority(Builder $query, string $priority): Builder
    {
        return $query->where('priority', $priority);
    }

    public function scopeByDepartment(Builder $query, int $departmentId): Builder
    {
        return $query->where('department_id', $departmentId);
    }

    /**
     * Accessors & Mutators
     */
    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            self::STATUS_PENDING => 'Pending',
            self::STATUS_APPROVED => 'Approved',
            self::STATUS_IN_PROGRESS => 'In Progress',
            self::STATUS_COMPLETED => 'Completed',
            self::STATUS_REJECTED => 'Rejected',
            default => 'Unknown'
        };
    }

    public function getPriorityLabelAttribute(): string
    {
        return match($this->priority) {
            self::PRIORITY_LOW => 'Low',
            self::PRIORITY_NORMAL => 'Normal',
            self::PRIORITY_HIGH => 'High',
            self::PRIORITY_URGENT => 'Urgent',
            default => 'Normal'
        };
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->needed_date &&
               $this->needed_date->isPast() &&
               !in_array($this->status, [self::STATUS_COMPLETED, self::STATUS_REJECTED]);
    }

    public function getCanBeApprovedAttribute(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function getCanBeCompletedAttribute(): bool
    {
        return in_array($this->status, [self::STATUS_APPROVED, self::STATUS_IN_PROGRESS]);
    }

    public function getDaysToCompleteAttribute(): ?int
    {
        if (!$this->completed_at || !$this->created_at) {
            return null;
        }

        return $this->created_at->diffInDays($this->completed_at);
    }

    /**
     * Helper methods
     */
    public function approve(User $user, ?string $remarks = null): bool
    {
        if (!$this->can_be_approved) {
            return false;
        }

        $this->update([
            'status' => self::STATUS_APPROVED,
            'approved_at' => now(),
            'approved_by_user_id' => $user->id,
            'approval_remarks' => $remarks,
        ]);

        $this->events()->create([
            'type' => 'approved',
            'actor_user_id' => $user->id,
            'reason' => $remarks,
            'occurred_at' => now(),
            'metadata' => [
                'approved_by_name' => $user->name,
                'approval_remarks' => $remarks,
                'old_status' => 'pending',
                'new_status' => 'approved'
            ]
        ]);

        return true;
    }

    public function reject(User $user, string $reason): bool
    {
        if (!$this->can_be_approved) {
            return false;
        }

        $this->update([
            'status' => self::STATUS_REJECTED,
            'approved_at' => now(),
            'approved_by_user_id' => $user->id,
            'approval_remarks' => $reason,
        ]);

        $this->events()->create([
            'type' => 'rejected',
            'actor_user_id' => $user->id,
            'reason' => $reason,
            'occurred_at' => now(),
            'metadata' => [
                'rejected_by_name' => $user->name,
                'rejection_reason' => $reason,
                'old_status' => 'pending',
                'new_status' => 'rejected'
            ]
        ]);

        return true;
    }

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
                'new_status' => 'completed'
            ]
        ]);

        return true;
    }

    public static function generateRequestNumber(): string
    {
        // Use the atomic sequence generation from RequestSequence model
        return \App\Models\RequestSequence::generateRequestNumber();
    }

    public static function getStatusOptions(): array
    {
        return [
            self::STATUS_PENDING => 'Pending',
            self::STATUS_APPROVED => 'Approved',
            self::STATUS_IN_PROGRESS => 'In Progress',
            self::STATUS_COMPLETED => 'Completed',
            self::STATUS_REJECTED => 'Rejected',
        ];
    }

    public static function getPriorityOptions(): array
    {
        return [
            self::PRIORITY_LOW => 'Low',
            self::PRIORITY_NORMAL => 'Normal',
            self::PRIORITY_HIGH => 'High',
            self::PRIORITY_URGENT => 'Urgent',
        ];
    }

    /**
     * Mark case note as received
     */
    public function markAsReceived(int $receivedByUserId, ?string $notes = null): void
    {
        $this->update([
            'is_received' => true,
            'received_at' => now(),
            'received_by_user_id' => $receivedByUserId,
            'reception_notes' => $notes
        ]);

        // Create timeline event
        $user = User::find($receivedByUserId);
        $this->events()->create([
            'type' => RequestEvent::TYPE_RECEIVED,
            'actor_user_id' => $receivedByUserId,
            'reason' => "Case note received by {$user->name}",
            'occurred_at' => now(),
            'metadata' => [
                'received_by_user_id' => $receivedByUserId,
                'received_by_user_name' => $user->name,
                'received_at' => now()->toDateTimeString(),
                'reception_notes' => $notes,
            ]
        ]);
    }

    /**
     * Check if case note can be marked as received
     */
    public function canBeReceived(): bool
    {
        return $this->status === self::STATUS_APPROVED && !$this->is_received;
    }
}
