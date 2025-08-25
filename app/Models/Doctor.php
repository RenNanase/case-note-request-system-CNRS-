<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Doctor extends Model
{
    use SoftDeletes, LogsActivity;

    protected $fillable = [
        'name',
        'title',
        'specialization',
        'license_number',
        'phone',
        'email',
        'department_id',
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
            ->logOnly(['name', 'title', 'specialization', 'department_id', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relationships
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function requests(): HasMany
    {
        return $this->hasMany(Request::class);
    }

    public function caseNotes(): HasMany
    {
        return $this->hasMany(CaseNote::class);
    }

    /**
     * Scopes
     */
    public function scopeActive($query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeByDepartment($query, int $departmentId): Builder
    {
        return $query->where('department_id', $departmentId);
    }

    public function scopeSearch($query, string $term): Builder
    {
        return $query->where(function ($q) use ($term) {
            $q->where('name', 'LIKE', "%{$term}%")
              ->orWhere('title', 'LIKE', "%{$term}%")
              ->orWhere('specialization', 'LIKE', "%{$term}%")
              ->orWhere('license_number', 'LIKE', "%{$term}%");
        });
    }

    /**
     * Accessors & Mutators
     */
    public function getFullNameAttribute(): string
    {
        return $this->title ? "{$this->title} {$this->name}" : $this->name;
    }

    public function getDisplayNameAttribute(): string
    {
        $name = $this->full_name;
        if ($this->specialization) {
            $name .= " ({$this->specialization})";
        }
        return $name;
    }

    public function setNameAttribute($value): void
    {
        $this->attributes['name'] = ucwords(strtolower($value));
    }

    public function setTitleAttribute($value): void
    {
        $this->attributes['title'] = $value ? ucfirst(strtolower($value)) : null;
    }

    public function setSpecializationAttribute($value): void
    {
        $this->attributes['specialization'] = $value ? ucwords(strtolower($value)) : null;
    }

    /**
     * Helper methods
     */
    public function toSelectOption(): array
    {
        return [
            'value' => $this->id,
            'label' => $this->display_name,
            'department' => $this->department->name ?? null,
        ];
    }
}
