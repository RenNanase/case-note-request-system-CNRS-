<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class BatchRequest extends Model
{
    use HasFactory, SoftDeletes;

    // Status constants
    const STATUS_PENDING = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';
    const STATUS_PARTIALLY_APPROVED = 'partially_approved';

    protected $fillable = [
        'batch_number',
        'requested_by_user_id',
        'status',
        'batch_notes',
        'submitted_at',
        'processed_at',
        'processed_by_user_id',
        'processing_notes',
        'is_verified',
        'approved_count',
        'received_count',
        'verified_at',
        'verified_by_user_id',
        'verification_notes',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'processed_at' => 'datetime',
        'verified_at' => 'datetime',
        'is_verified' => 'boolean',
    ];

    /**
     * Relationships
     */
    public function requestedBy(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function processedBy(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by_user_id');
    }

    public function verifiedBy(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by_user_id');
    }

    public function requests(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Request::class, 'batch_id');
    }

    /**
     * Scopes
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    public function scopeRejected(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_REJECTED);
    }

    public function scopeByUser(Builder $query, int $userId): Builder
    {
        return $query->where('requested_by_user_id', $userId);
    }

    /**
     * Accessors & Mutators
     */
    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            self::STATUS_PENDING => 'Pending',
            self::STATUS_APPROVED => 'Approved',
            self::STATUS_REJECTED => 'Rejected',
            self::STATUS_PARTIALLY_APPROVED => 'Partially Approved',
            default => 'Unknown'
        };
    }

    public function getRequestCountAttribute(): int
    {
        return $this->requests()->count();
    }

    public function getApprovedCountAttribute(): int
    {
        return $this->requests()->where('status', Request::STATUS_APPROVED)->count();
    }

    public function getRejectedCountAttribute(): int
    {
        return $this->requests()->where('status', Request::STATUS_REJECTED)->count();
    }

    public function getPendingCountAttribute(): int
    {
        return $this->requests()->where('status', Request::STATUS_PENDING)->count();
    }

    /**
     * Helper methods
     */
    public function canBeProcessed(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function canBeApproved(): bool
    {
        return $this->canBeProcessed();
    }

    public function canBeRejected(): bool
    {
        return $this->canBeProcessed();
    }

    public function markAsSubmitted(): void
    {
        $this->update([
            'submitted_at' => now(),
            'status' => self::STATUS_PENDING
        ]);
    }

    public function markAsProcessed(string $status, int $processedByUserId, ?string $notes = null): void
    {
        $this->update([
            'status' => $status,
            'processed_at' => now(),
            'processed_by_user_id' => $processedByUserId,
            'processing_notes' => $notes
        ]);
    }

    /**
     * Mark batch as verified by CA
     */
    public function markAsVerified(int $verifiedByUserId, int $receivedCount, ?string $notes = null): void
    {
        $this->update([
            'is_verified' => true,
            'received_count' => $receivedCount,
            'verified_at' => now(),
            'verified_by_user_id' => $verifiedByUserId,
            'verification_notes' => $notes
        ]);
    }

    /**
     * Check if batch can be verified (has approved requests)
     */
    public function canBeVerified(): bool
    {
        return $this->status === self::STATUS_APPROVED &&
               !$this->is_verified &&
               $this->getApprovedCount() > 0;
    }

    /**
     * Get count of approved requests in this batch
     */
    public function getApprovedCount(): int
    {
        if ($this->approved_count !== null) {
            return $this->approved_count;
        }

        return $this->requests()->where('status', 'approved')->count();
    }

    /**
     * Calculate and cache approved count
     */
    public function updateApprovedCount(): void
    {
        $count = $this->requests()->where('status', 'approved')->count();
        $this->update(['approved_count' => $count]);
    }

    /**
     * Generate unique batch number
     */
    public static function generateBatchNumber(): string
    {
        $prefix = 'BATCH';
        $date = now()->format('Ymd');
        $counter = 1;

        do {
            $batchNumber = "{$prefix}{$date}-" . str_pad($counter, 3, '0', STR_PAD_LEFT);
            $counter++;
        } while (self::where('batch_number', $batchNumber)->exists());

        return $batchNumber;
    }

    /**
     * Check if batch is complete (all requests processed)
     */
    public function isComplete(): bool
    {
        $totalRequests = $this->requests()->count();
        $processedRequests = $this->requests()
            ->whereIn('status', [Request::STATUS_APPROVED, Request::STATUS_REJECTED])
            ->count();

        return $totalRequests > 0 && $totalRequests === $processedRequests;
    }

    /**
     * Update batch status based on individual request statuses
     */
    public function updateStatus(): void
    {
        if ($this->requests()->count() === 0) {
            return;
        }

        $approvedCount = $this->getApprovedCountAttribute();
        $rejectedCount = $this->getRejectedCountAttribute();
        $pendingCount = $this->getPendingCountAttribute();
        $totalCount = $this->getRequestCountAttribute();

        if ($pendingCount === 0) {
            if ($rejectedCount === 0) {
                $this->update(['status' => self::STATUS_APPROVED]);
            } elseif ($approvedCount === 0) {
                $this->update(['status' => self::STATUS_REJECTED]);
            } else {
                $this->update(['status' => self::STATUS_PARTIALLY_APPROVED]);
            }
        }
    }
}
