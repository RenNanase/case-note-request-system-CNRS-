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
        return $query->where('name', 'LIKE', "%{$term}%");
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
