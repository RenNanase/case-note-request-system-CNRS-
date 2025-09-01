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
        return [
            'id' => $this->id,
            'mrn' => $this->mrn,
            'name' => $this->name,
            'nric' => $this->nationality_id ?: 'N/A', // Use nationality_id as NRIC
            'nationality_id' => $this->nationality_id,
            'date_of_birth' => null, // Field not available in simplified structure
            'phone' => null, // Field not available in simplified structure
            'has_medical_alerts' => false, // Field not available, default to false
        ];
    }
}
