<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Patient extends Model
{
    use SoftDeletes, LogsActivity;

    protected $fillable = [
        'mrn',
        'name',
        'nationality_id',
    ];

    protected $casts = [
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
            ->logOnly(['name', 'mrn', 'nationality_id'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relationships
     */
    public function caseNotes(): HasMany
    {
        return $this->hasMany(CaseNote::class);
    }

    public function requests(): HasMany
    {
        return $this->hasMany(Request::class);
    }

    /**
     * Scopes
     */
    public function scopeSearch($query, string $term): Builder
    {
        return $query->where(function ($q) use ($term) {
            $q->whereRaw('LOWER(name) LIKE ?', ["%" . strtolower($term) . "%"])
              ->orWhereRaw('LOWER(mrn) LIKE ?', ["%" . strtolower($term) . "%"])
              ->orWhereRaw('LOWER(nationality_id) LIKE ?', ["%" . strtolower($term) . "%"]);
        });
    }

    public function scopeByMrn($query, string $mrn): Builder
    {
        return $query->where('mrn', $mrn);
    }

    public function scopeByNationalityId($query, string $nationalityId): Builder
    {
        return $query->where('nationality_id', $nationalityId);
    }

    /**
     * Accessors & Mutators
     */
    public function getDisplayNameAttribute(): string
    {
        return "{$this->name} ({$this->mrn})";
    }

    public function setMrnAttribute($value): void
    {
        $this->attributes['mrn'] = strtoupper($value);
    }

    public function setNameAttribute($value): void
    {
        $this->attributes['name'] = ucwords(strtolower($value));
    }

    /**
     * Helper methods
     */
    public function getFullTextSearchAttributes(): array
    {
        return [
            'name' => $this->name,
            'mrn' => $this->mrn,
            'nationality_id' => $this->nationality_id,
        ];
    }

    public function toSearchResult(): array
    {
        // Get the most recent case note request for this patient
        $latestRequest = $this->requests()
            ->with(['department', 'location', 'currentPIC'])
            ->whereIn('status', ['approved', 'completed'])
            ->where('is_received', true)
            ->orderBy('created_at', 'desc')
            ->first();

        // Check if patient has existing requests and availability
        $hasExistingRequests = $this->requests()
            ->whereIn('status', ['approved', 'completed'])
            ->where('is_received', true)
            ->exists();

        $isAvailable = true;
        $handoverStatus = null;
        $currentHolder = null;
        $caseNoteRequestId = null;

        if ($hasExistingRequests && $latestRequest) {
            $isAvailable = !$latestRequest->current_pic_user_id || 
                          $latestRequest->handover_status === 'completed' ||
                          $latestRequest->handover_status === 'mr_staff_opened';
            
            $handoverStatus = $latestRequest->handover_status;
            $caseNoteRequestId = $latestRequest->id;
            
            if ($latestRequest->currentPIC) {
                $currentHolder = [
                    'id' => $latestRequest->currentPIC->id,
                    'name' => $latestRequest->currentPIC->name,
                    'email' => $latestRequest->currentPIC->email,
                ];
            }
        }

        return [
            'id' => $this->id,
            'mrn' => $this->mrn,
            'name' => $this->name,
            'nric' => $this->nationality_id ?: 'N/A', // Use nationality_id as NRIC
            'nationality_id' => $this->nationality_id,
            'date_of_birth' => null, // Field not available in simplified structure
            'phone' => null, // Field not available in simplified structure
            'has_medical_alerts' => false, // Field not available, default to false
            'has_existing_requests' => $hasExistingRequests,
            'is_available' => $isAvailable,
            'handover_status' => $handoverStatus,
            'current_holder' => $currentHolder,
            'case_note_request_id' => $caseNoteRequestId,
            // Add current case note location and department info
            'current_case_note' => $latestRequest ? [
                'department' => $latestRequest->department ? [
                    'id' => $latestRequest->department->id,
                    'name' => $latestRequest->department->name,
                ] : null,
                'location' => $latestRequest->location ? [
                    'id' => $latestRequest->location->id,
                    'name' => $latestRequest->location->name,
                ] : null,
                'doctor' => $latestRequest->doctor ? [
                    'id' => $latestRequest->doctor->id,
                    'name' => $latestRequest->doctor->name,
                ] : null,
            ] : null,
        ];
    }
}
