<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class OpenedCaseNote extends Model
{
    use LogsActivity;

    // User type constants
    const USER_TYPE_OT_STAFF = 'ot_staff';
    const USER_TYPE_ED_STAFF = 'ed_staff';
    const USER_TYPE_MEDICAL_STAFF = 'medical_staff';
    const USER_TYPE_ICU_STAFF = 'icu_staff';

    protected $fillable = [
        'patient_id',
        'department_id',
        'location_id',
        'doctor_id',
        'user_type',
        'remarks',
        'opened_by_user_id',
        'opened_at',
        'is_active',
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Activity log options
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['patient_id', 'department_id', 'location_id', 'doctor_id', 'user_type', 'remarks', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relationships
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function openedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by_user_id');
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

    public function scopeByPatient(Builder $query, int $patientId): Builder
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeByDepartment(Builder $query, int $departmentId): Builder
    {
        return $query->where('department_id', $departmentId);
    }

    public function scopeByLocation(Builder $query, int $locationId): Builder
    {
        return $query->where('location_id', $locationId);
    }

    public function scopeByDoctor(Builder $query, int $doctorId): Builder
    {
        return $query->where('doctor_id', $doctorId);
    }

    public function scopeByUserType(Builder $query, string $userType): Builder
    {
        return $query->where('user_type', $userType);
    }

    public function scopeByOpenedBy(Builder $query, int $userId): Builder
    {
        return $query->where('opened_by_user_id', $userId);
    }

    /**
     * Accessors & Mutators
     */
    public function getUserTypeLabelAttribute(): string
    {
        return match($this->user_type) {
            self::USER_TYPE_OT_STAFF => 'OT Staff',
            self::USER_TYPE_ED_STAFF => 'ED Staff',
            self::USER_TYPE_MEDICAL_STAFF => 'Medical Staff',
            self::USER_TYPE_ICU_STAFF => 'ICU Staff',
            default => 'Unknown'
        };
    }

    /**
     * Static methods
     */
    public static function getUserTypeOptions(): array
    {
        return [
            self::USER_TYPE_OT_STAFF => 'OT Staff',
            self::USER_TYPE_ED_STAFF => 'ED Staff',
            self::USER_TYPE_MEDICAL_STAFF => 'Medical Staff',
            self::USER_TYPE_ICU_STAFF => 'ICU Staff',
        ];
    }

    /**
     * Check if a patient has an active opened case note
     */
    public static function hasActiveOpenedCaseNote(int $patientId): bool
    {
        return self::where('patient_id', $patientId)
            ->where('is_active', true)
            ->exists();
    }

    /**
     * Get active opened case note for a patient
     */
    public static function getActiveOpenedCaseNote(int $patientId): ?self
    {
        return self::where('patient_id', $patientId)
            ->where('is_active', true)
            ->with(['patient', 'department', 'location', 'doctor', 'openedBy'])
            ->first();
    }
}
