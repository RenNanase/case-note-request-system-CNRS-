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
            ->logOnly(['name', 'department_id', 'is_active'])
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
        return $this->hasMany(\App\Models\Request::class);
    }

    public function caseNotes(): HasMany
    {
        return $this->hasMany(\App\Models\CaseNote::class);
    }

    /**
     * Scopes
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeInactive(Builder $query): Builder
    {
        return $query->where('is_active', false);
    }

    public function scopeByDepartment(Builder $query, int $departmentId): Builder
    {
        return $query->where('department_id', $departmentId);
    }

    public function scopeSearch(Builder $query, string $search): Builder
    {
        return $query->where('name', 'like', "%{$search}%");
    }

    /**
     * Accessors & Mutators
     */
    public function getFullNameAttribute(): string
    {
        return $this->name;
    }

    public function getDisplayNameAttribute(): string
    {
        return $this->name;
    }

    public function setNameAttribute($value): void
    {
        $this->attributes['name'] = ucwords(strtolower($value));
    }

    /**
     * Convert the doctor to a select option format
     */
    public function toSelectOption(): array
    {
        return [
            'value' => $this->id,
            'label' => $this->display_name,
            'department' => $this->department ? $this->department->name : null,
            'department_code' => $this->department ? $this->department->code : null,
        ];
    }
}
