<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class SendOutCaseNote extends Model
{
    use HasFactory;

    protected $fillable = [
        'send_out_number',
        'sent_by_user_id',
        'sent_to_user_id',
        'department_id',
        'doctor_id',
        'case_note_ids',
        'case_note_count',
        'status',
        'notes',
        'sent_at',
        'acknowledged_at',
        'acknowledged_by_user_id',
        'acknowledged_case_note_ids',
        'acknowledgment_notes',
    ];

    protected $casts = [
        'case_note_ids' => 'array',
        'acknowledged_case_note_ids' => 'array',
        'sent_at' => 'datetime',
        'acknowledged_at' => 'datetime',
    ];

    // Status constants
    const STATUS_PENDING = 'pending';
    const STATUS_ACKNOWLEDGED = 'acknowledged';
    const STATUS_CANCELLED = 'cancelled';

    /**
     * Get the user who sent the case notes
     */
    public function sentBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by_user_id');
    }

    /**
     * Get the user who received the case notes
     */
    public function sentTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_to_user_id');
    }

    /**
     * Get the user who acknowledged the case notes
     */
    public function acknowledgedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by_user_id');
    }

    /**
     * Get the department
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get the doctor
     */
    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    /**
     * Get the case notes that were sent out
     */
    public function caseNotes(): BelongsToMany
    {
        return $this->belongsToMany(Request::class, 'send_out_case_note_requests', 'send_out_id', 'request_id')
            ->withTimestamps();
    }

    /**
     * Get the actual case note requests
     */
    public function getCaseNoteRequests()
    {
        return Request::whereIn('id', $this->case_note_ids ?? [])
            ->with(['patient', 'doctor', 'department', 'requestedBy', 'currentPicUser'])
            ->get();
    }

    /**
     * Check if all case notes have been acknowledged
     */
    public function isFullyAcknowledged(): bool
    {
        if (!$this->acknowledged_case_note_ids) {
            return false;
        }

        $sentCount = count($this->case_note_ids ?? []);
        $acknowledgedCount = count($this->acknowledged_case_note_ids);

        return $sentCount === $acknowledgedCount;
    }

    /**
     * Get pending case notes (not yet acknowledged)
     */
    public function getPendingCaseNotes()
    {
        $acknowledgedIds = $this->acknowledged_case_note_ids ?? [];
        $pendingIds = array_diff($this->case_note_ids ?? [], $acknowledgedIds);

        return Request::whereIn('id', $pendingIds)
            ->with(['patient', 'doctor', 'department', 'requestedBy', 'currentPicUser'])
            ->get();
    }

    /**
     * Generate send out number
     */
    public static function generateSendOutNumber(): string
    {
        $prefix = 'SO';
        $date = now()->format('Ymd');

        // Get the last send out number for today
        $lastSendOut = self::where('send_out_number', 'like', $prefix . $date . '%')
            ->orderBy('send_out_number', 'desc')
            ->first();

        if ($lastSendOut) {
            $lastNumber = (int) substr($lastSendOut->send_out_number, -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . $date . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Scope for pending send outs
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Scope for acknowledged send outs
     */
    public function scopeAcknowledged($query)
    {
        return $query->where('status', self::STATUS_ACKNOWLEDGED);
    }

    /**
     * Scope for send outs by a specific user
     */
    public function scopeSentBy($query, $userId)
    {
        return $query->where('sent_by_user_id', $userId);
    }

    /**
     * Scope for send outs to a specific user
     */
    public function scopeSentTo($query, $userId)
    {
        return $query->where('sent_to_user_id', $userId);
    }
}
