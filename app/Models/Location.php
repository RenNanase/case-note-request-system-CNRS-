<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Location extends Model
{
    use SoftDeletes, LogsActivity;

    // Location type constants
    const TYPE_WARD = 'ward';
    const TYPE_CLINIC = 'clinic';
    const TYPE_ROOM = 'room';
    const TYPE_OFFICE = 'office';
    const TYPE_ARCHIVE = 'archive';

    protected $fillable = [
        'name',
        'type',
        'building',
        'floor',
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
            ->logOnly(['name', 'type', 'building', 'floor', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relationships
     */
    public function requests(): HasMany
    {
        return $this->hasMany(Request::class);
    }

    public function requestEvents(): HasMany
    {
        return $this->hasMany(RequestEvent::class, 'to_location_id');
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

    public function scopeByType($query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    public function scopeByBuilding($query, string $building): Builder
    {
        return $query->where('building', $building);
    }

    public function scopeSearch($query, string $term): Builder
    {
        return $query->where(function ($q) use ($term) {
            $q->where('name', 'LIKE', "%{$term}%")
              ->orWhere('building', 'LIKE', "%{$term}%")
              ->orWhere('floor', 'LIKE', "%{$term}%")
              ->orWhere('description', 'LIKE', "%{$term}%");
        });
    }

    /**
     * Accessors & Mutators
     */
    public function getFullNameAttribute(): string
    {
        $parts = [$this->name];
        
        if ($this->building) {
            $parts[] = $this->building;
        }
        
        if ($this->floor) {
            $parts[] = "Floor {$this->floor}";
        }
        
        return implode(', ', $parts);
    }

    public function getTypeLabelAttribute(): string
    {
        return match($this->type) {
            self::TYPE_WARD => 'Ward',
            self::TYPE_CLINIC => 'Clinic',
            self::TYPE_ROOM => 'Room',
            self::TYPE_OFFICE => 'Office',
            self::TYPE_ARCHIVE => 'Archive',
            default => 'Unknown'
        };
    }

    public function setNameAttribute($value): void
    {
        $this->attributes['name'] = ucwords(strtolower($value));
    }

    public function setBuildingAttribute($value): void
    {
        $this->attributes['building'] = $value ? ucwords(strtolower($value)) : null;
    }

    /**
     * Helper methods
     */
    public function toSelectOption(): array
    {
        return [
            'value' => $this->id,
            'label' => $this->full_name,
            'type' => $this->type_label,
        ];
    }

    public static function getTypeOptions(): array
    {
        return [
            self::TYPE_WARD => 'Ward',
            self::TYPE_CLINIC => 'Clinic',
            self::TYPE_ROOM => 'Room',
            self::TYPE_OFFICE => 'Office',
            self::TYPE_ARCHIVE => 'Archive',
        ];
    }
}
