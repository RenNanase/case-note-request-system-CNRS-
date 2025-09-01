<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passport\HasApiTokens;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Support\Facades\Hash;

class User extends Authenticatable
{
    /** @use HasFactory\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, LogsActivity, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'password_changed',
        'password_changed_at',
        'last_login_at',
        'is_active',
        'deactivated_at',
        'deactivated_by',
        'deactivation_reason',
        'password_reset_at',
        'password_reset_by',
        // Optional: legacy column; Spatie roles are primary source of truth
        'role',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'password_changed' => 'boolean',
            'password_changed_at' => 'datetime',
            'last_login_at' => 'datetime',
            'is_active' => 'boolean',
            'deactivated_at' => 'datetime',
            'password_reset_at' => 'datetime',
        ];
    }

    /**
     * Activity log options
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'email', 'is_active', 'password_changed'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Find user for passport password grant
     */
    public function findForPassport($username)
    {
        return $this->where('email', $username)->first();
    }

    // Roles & permissions provided by Spatie\Permission's HasRoles trait

    /**
     * Get the guard name for permissions
     */
    public function getGuardName(): string
    {
        return 'api';
    }

    /**
     * Check if user needs to change password
     */
    public function needsPasswordChange(): bool
    {
        return !$this->password_changed;
    }

    /**
     * Mark password as changed
     */
    public function markPasswordAsChanged(): void
    {
        $this->update([
            'password_changed' => true,
            'password_changed_at' => now(),
        ]);
    }

    /**
     * Reset password to default
     */
    public function resetToDefaultPassword(string $resetBy): void
    {
        $this->update([
            'password' => Hash::make('password'), // Default password
            'password_changed' => false,
            'password_changed_at' => null,
            'password_reset_at' => now(),
            'password_reset_by' => $resetBy,
        ]);
    }

    /**
     * Update last login timestamp
     */
    public function updateLastLogin(): void
    {
        $this->update(['last_login_at' => now()]);
    }

    /**
     * Deactivate user account
     */
    public function deactivate(string $deactivatedBy, string $reason = null): void
    {
        $this->update([
            'is_active' => false,
            'deactivated_at' => now(),
            'deactivated_by' => $deactivatedBy,
            'deactivation_reason' => $reason,
        ]);
    }

    /**
     * Activate user account
     */
    public function activate(): void
    {
        $this->update([
            'is_active' => true,
            'deactivated_at' => null,
            'deactivated_by' => null,
            'deactivation_reason' => null,
        ]);
    }

    /**
     * Scope to get only active users
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get only inactive users
     */
    public function scopeInactive($query)
    {
        return $query->where('is_active', false);
    }

    /**
     * Get the default password
     */
    public static function getDefaultPassword(): string
    {
        return 'password';
    }
}
