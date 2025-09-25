<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class ImportProgress extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'import_type',
        'file_name',
        'total_rows',
        'processed_rows',
        'imported_count',
        'skipped_count',
        'duplicate_count',
        'error_count',
        'status',
        'started_at',
        'completed_at',
        'estimated_completion',
        'progress_percentage',
        'current_batch',
        'total_batches',
        'processing_speed',
        'memory_usage',
        'error_log',
        'metadata',
        'requested_by_user_id',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'estimated_completion' => 'datetime',
        'progress_percentage' => 'decimal:2',
        'metadata' => 'array',
        'error_log' => 'array',
    ];

    // Status constants
    const STATUS_PENDING = 'pending';
    const STATUS_PROCESSING = 'processing';
    const STATUS_COMPLETED = 'completed';
    const STATUS_FAILED = 'failed';
    const STATUS_CANCELLED = 'cancelled';

    // Import type constants
    const TYPE_PATIENTS = 'patients';
    const TYPE_CASE_NOTES = 'case_notes';
    const TYPE_USERS = 'users';

    /**
     * Relationships
     */
    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    /**
     * Scopes
     */
    public function scopeByType($query, $type)
    {
        return $query->where('import_type', $type);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeActive($query)
    {
        return $query->whereIn('status', [self::STATUS_PENDING, self::STATUS_PROCESSING]);
    }

    public function scopeRecent($query, $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Accessors & Mutators
     */
    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            self::STATUS_PENDING => 'Pending',
            self::STATUS_PROCESSING => 'Processing',
            self::STATUS_COMPLETED => 'Completed',
            self::STATUS_FAILED => 'Failed',
            self::STATUS_CANCELLED => 'Cancelled',
            default => 'Unknown',
        };
    }

    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            self::STATUS_PENDING => 'bg-yellow-100 text-yellow-800',
            self::STATUS_PROCESSING => 'bg-purple-100 text-purple-800',
            self::STATUS_COMPLETED => 'bg-green-100 text-green-800',
            self::STATUS_FAILED => 'bg-red-100 text-red-800',
            self::STATUS_CANCELLED => 'bg-gray-100 text-gray-800',
            default => 'bg-gray-100 text-gray-800',
        };
    }

    public function getIsActiveAttribute(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_PROCESSING]);
    }

    public function getIsCompletedAttribute(): bool
    {
        return in_array($this->status, [self::STATUS_COMPLETED, self::STATUS_FAILED, self::STATUS_CANCELLED]);
    }

    public function getRemainingRowsAttribute(): int
    {
        return max(0, $this->total_rows - $this->processed_rows);
    }

    public function getElapsedTimeAttribute(): string
    {
        if (!$this->started_at) {
            return '0s';
        }

        $endTime = $this->completed_at ?? now();
        $duration = $this->started_at->diffInSeconds($endTime);
        
        if ($duration < 60) {
            return $duration . 's';
        } elseif ($duration < 3600) {
            return round($duration / 60, 1) . 'm';
        } else {
            $hours = floor($duration / 3600);
            $minutes = round(($duration % 3600) / 60, 1);
            return $hours . 'h ' . $minutes . 'm';
        }
    }

    public function getEstimatedTimeRemainingAttribute(): string
    {
        if ($this->progress_percentage <= 0 || $this->progress_percentage >= 100) {
            return 'N/A';
        }

        if (!$this->processing_speed || $this->processing_speed <= 0) {
            return 'Calculating...';
        }

        $remainingRows = $this->remaining_rows;
        $estimatedSeconds = $remainingRows / $this->processing_speed;
        
        if ($estimatedSeconds < 60) {
            return round($estimatedSeconds) . 's';
        } elseif ($estimatedSeconds < 3600) {
            return round($estimatedSeconds / 60, 1) . 'm';
        } else {
            $hours = floor($estimatedSeconds / 3600);
            $minutes = round(($estimatedSeconds % 3600) / 60, 1);
            return $hours . 'h ' . $minutes . 'm';
        }
    }

    /**
     * Methods
     */
    public function updateProgress(int $processedRows, int $importedCount = 0, int $skippedCount = 0, int $duplicateCount = 0, int $errorCount = 0)
    {
        $this->processed_rows = $processedRows;
        $this->imported_count = $importedCount;
        $this->skipped_count = $skippedCount;
        $this->duplicate_count = $duplicateCount;
        $this->error_count = $errorCount;
        
        // Calculate progress percentage
        if ($this->total_rows > 0) {
            $this->progress_percentage = round(($processedRows / $this->total_rows) * 100, 2);
        }

        // Calculate processing speed (rows per second)
        if ($this->started_at && $this->processed_rows > 0) {
            $elapsedSeconds = $this->started_at->diffInSeconds(now());
            if ($elapsedSeconds > 0) {
                $this->processing_speed = round($this->processed_rows / $elapsedSeconds, 2);
            }
        }

        // Estimate completion time
        if ($this->processing_speed && $this->processing_speed > 0) {
            $remainingRows = $this->remaining_rows;
            $estimatedSeconds = $remainingRows / $this->processing_speed;
            $this->estimated_completion = now()->addSeconds($estimatedSeconds);
        }

        $this->save();
    }

    public function markAsStarted()
    {
        $this->status = self::STATUS_PROCESSING;
        $this->started_at = now();
        $this->save();
    }

    public function markAsCompleted()
    {
        $this->status = self::STATUS_COMPLETED;
        $this->completed_at = now();
        $this->progress_percentage = 100;
        $this->save();
    }

    public function markAsFailed(string $errorMessage)
    {
        $this->status = self::STATUS_FAILED;
        $this->completed_at = now();
        
        $errorLog = $this->error_log ?? [];
        $errorLog[] = [
            'timestamp' => now()->toISOString(),
            'message' => $errorMessage,
        ];
        $this->error_log = $errorLog;
        
        $this->save();
    }

    public function cancel()
    {
        $this->status = self::STATUS_CANCELLED;
        $this->completed_at = now();
        $this->save();
    }

    public function addError(string $errorMessage, array $context = [])
    {
        $errorLog = $this->error_log ?? [];
        $errorLog[] = [
            'timestamp' => now()->toISOString(),
            'message' => $errorMessage,
            'context' => $context,
        ];
        $this->error_log = $errorLog;
        $this->save();
    }

    public function getProgressBarColor(): string
    {
        if ($this->progress_percentage >= 80) {
            return 'bg-green-500';
        } elseif ($this->progress_percentage >= 50) {
            return 'bg-purple-500';
        } elseif ($this->progress_percentage >= 20) {
            return 'bg-yellow-500';
        } else {
            return 'bg-gray-500';
        }
    }
}
