<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class FilingRequest extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'filing_number',
        'submitted_by_user_id',
        'case_note_ids',
        'patient_ids',
        'case_note_description',
        'expected_case_note_count',
        'status',
        'approved_by_user_id',
        'approved_at',
        'approval_notes',
        'submission_notes',
    ];

    protected $casts = [
        'case_note_ids' => 'array',
        'patient_ids' => 'array',
        'approved_at' => 'datetime',
    ];

    // Status constants
    const STATUS_PENDING = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';

    /**
     * Activity log options
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['status', 'approved_by_user_id', 'approved_at', 'approval_notes'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Boot method to set up model events
     */
    protected static function boot()
    {
        parent::boot();

        // Generate filing number when creating
        static::creating(function ($filingRequest) {
            if (empty($filingRequest->filing_number)) {
                $filingRequest->filing_number = self::generateFilingNumber();
            }
        });
    }

    /**
     * Generate a unique filing number
     */
    public static function generateFilingNumber(): string
    {
        $prefix = 'FIL';
        $date = now()->format('Ymd');

        // Get the last filing number for today
        $lastFiling = self::where('filing_number', 'like', "{$prefix}-{$date}-%")
            ->orderBy('filing_number', 'desc')
            ->first();

        if ($lastFiling) {
            // Extract the sequence number and increment
            $parts = explode('-', $lastFiling->filing_number);
            $sequence = (int) end($parts) + 1;
        } else {
            $sequence = 1;
        }

        return "{$prefix}-{$date}-" . str_pad($sequence, 3, '0', STR_PAD_LEFT);
    }

    /**
     * Relationships
     */
    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    /**
     * Get the patients for this filing request
     */
    public function getPatients()
    {
        if (empty($this->patient_ids)) {
            return collect();
        }
        
        return Patient::whereIn('id', $this->patient_ids)->get();
    }

    /**
     * Get the actual case note requests (legacy support)
     */
    public function getCaseNoteRequests()
    {
        if (empty($this->case_note_ids)) {
            return collect();
        }
        
        return Request::whereIn('id', $this->case_note_ids ?? [])->get();
    }

    /**
     * Check if this is a patient-based filing request
     */
    public function isPatientBased(): bool
    {
        return !empty($this->patient_ids);
    }

    /**
     * Check if this is a case note-based filing request (legacy)
     */
    public function isCaseNoteBased(): bool
    {
        return !empty($this->case_note_ids);
    }

    /**
     * Get patient count
     */
    public function getPatientCountAttribute(): int
    {
        return count($this->patient_ids ?? []);
    }

    /**
     * Get case note count (legacy)
     */
    public function getCaseNoteCountAttribute(): int
    {
        return count($this->case_note_ids ?? []);
    }

    /**
     * Check if the filing request can be approved
     */
    public function canBeApproved(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Check if the filing request can be rejected
     */
    public function canBeRejected(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Approve the filing request
     */
    public function approve(User $approvingUser, ?string $notes = null): bool
    {
        if (!$this->canBeApproved()) {
            return false;
        }

        $this->update([
            'status' => self::STATUS_APPROVED,
            'approved_by_user_id' => $approvingUser->id,
            'approved_at' => now(),
            'approval_notes' => $notes,
        ]);

        // Create timeline events based on filing type
        if ($this->isPatientBased()) {
            // For patient-based filing requests, create events for each patient
            $patients = $this->getPatients();
            foreach ($patients as $patient) {
                // You might want to create a patient filing approval event
                // This could be logged in a separate patient_events table or activity log
                activity('patient_filing')
                    ->performedOn($patient)
                    ->causedBy($approvingUser)
                    ->withProperties([
                        'filing_request_id' => $this->id,
                        'filing_number' => $this->filing_number,
                        'approved_by_name' => $approvingUser->name,
                        'approval_notes' => $notes,
                        'case_note_description' => $this->case_note_description,
                    ])
                    ->log("Patient case notes filing request approved by {$approvingUser->name}");
            }
        } else {
            // Legacy case note-based filing
            $caseNotes = $this->getCaseNoteRequests();
            foreach ($caseNotes as $caseNote) {
                $caseNote->events()->create([
                    'type' => 'filing_approved',
                    'actor_user_id' => $approvingUser->id,
                    'reason' => "Filing request approved by {$approvingUser->name}",
                    'occurred_at' => now(),
                    'metadata' => [
                        'filing_request_id' => $this->id,
                        'filing_number' => $this->filing_number,
                        'approved_by_name' => $approvingUser->name,
                        'approval_notes' => $notes,
                    ]
                ]);
            }
        }

        return true;
    }

    /**
     * Reject the filing request
     */
    public function reject(User $rejectingUser, ?string $notes = null): bool
    {
        if (!$this->canBeRejected()) {
            return false;
        }

        $this->update([
            'status' => self::STATUS_REJECTED,
            'approved_by_user_id' => $rejectingUser->id,
            'approved_at' => now(),
            'approval_notes' => $notes,
        ]);

        // Create timeline events based on filing type
        if ($this->isPatientBased()) {
            // For patient-based filing requests, log rejection for each patient
            $patients = $this->getPatients();
            foreach ($patients as $patient) {
                activity('patient_filing')
                    ->performedOn($patient)
                    ->causedBy($rejectingUser)
                    ->withProperties([
                        'filing_request_id' => $this->id,
                        'filing_number' => $this->filing_number,
                        'rejected_by_name' => $rejectingUser->name,
                        'rejection_notes' => $notes,
                        'case_note_description' => $this->case_note_description,
                    ])
                    ->log("Patient case notes filing request rejected by {$rejectingUser->name}");
            }
        } else {
            // Legacy case note-based filing
            $caseNotes = $this->getCaseNoteRequests();
            foreach ($caseNotes as $caseNote) {
                $caseNote->events()->create([
                    'type' => 'filing_rejected',
                    'actor_user_id' => $rejectingUser->id,
                    'reason' => "Filing request rejected by {$rejectingUser->name}",
                    'occurred_at' => now(),
                    'metadata' => [
                        'filing_request_id' => $this->id,
                        'filing_number' => $this->filing_number,
                        'rejected_by_name' => $rejectingUser->name,
                        'rejection_notes' => $notes,
                    ]
                ]);
            }
        }

        return true;
    }
}
