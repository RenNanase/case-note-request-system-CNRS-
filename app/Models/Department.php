<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Department extends Model
{
    use SoftDeletes, LogsActivity;

    protected $fillable = [
        'name',
        'code',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
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
            ->logOnly(['name', 'code', 'description', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relationships
     */
    public function doctors(): HasMany
    {
        return $this->hasMany(Doctor::class);
    }

    public function requests(): HasMany
    {
        return $this->hasMany(\App\Models\Request::class);
    }

    /**
     * Scope a query to only include active departments.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to search departments by name or code
     */
    public function scopeSearch(Builder $query, string $search): Builder
    {
        return $query->where(function($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('code', 'like', "%{$search}%");
        });
    }

    /**
     * Get the department's full name with code
     */
    public function getFullNameAttribute(): string
    {
        return $this->code ? "{$this->code} - {$this->name}" : $this->name;
    }

    /**
     * Format the department for select options
     */
    public function toSelectOption(): array
    {
        return [
            'value' => $this->id,
            'label' => $this->full_name,
            'code' => $this->code,
        ];
    }

    public function scopeByCode($query, $code)
    {
        return $query->where('code', $code);
    }

    public function setCodeAttribute($value): void
    {
        $this->attributes['code'] = strtoupper($value);
    }
}
