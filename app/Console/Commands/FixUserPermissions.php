<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Spatie\Permission\Models\Role;

class FixUserPermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:fix-permissions {email : The email of the user to fix}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix user permissions by assigning correct role';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');

        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("User with email {$email} not found!");
            return 1;
        }

        $this->info("🔧 Fixing permissions for: {$user->name} ({$user->email})");
        $this->line('');

        // Check current state
        $this->info("📋 CURRENT STATE:");
        $this->line("  Legacy role column: " . ($user->role ?? 'NULL'));
        $this->line("  Spatie roles: " . $user->getRoleNames()->join(', ') ?: 'None');
        $this->line("  Permissions: " . $user->getAllPermissions()->pluck('name')->join(', ') ?: 'None');

        $this->line('');

        // Determine correct role based on legacy column
        $legacyRole = $user->role;
        $spatieRole = null;

        switch (strtoupper($legacyRole)) {
            case 'CA':
                $spatieRole = 'CA';
                break;
            case 'MR_STAFF':
            case 'MR':
                $spatieRole = 'MR_STAFF';
                break;
            case 'ADMIN':
                $spatieRole = 'ADMIN';
                break;
            default:
                $this->error("Unknown legacy role: {$legacyRole}");
                $this->line("Available roles: CA, MR_STAFF, ADMIN");
                return 1;
        }

        $this->info("🎯 ASSIGNING ROLE:");
        $this->line("  Legacy role: {$legacyRole}");
        $this->line("  Spatie role: {$spatieRole}");

        // Check if role exists
        $role = Role::where('name', $spatieRole)->first();
        if (!$role) {
            $this->error("Role '{$spatieRole}' not found! Run php artisan db:seed --class=RoleSeeder first.");
            return 1;
        }

        // Remove existing roles and assign new one
        $user->syncRoles([$spatieRole]);

        $this->line('');
        $this->info("✅ ROLE ASSIGNED SUCCESSFULLY!");

        // Verify the change
        $this->line('');
        $this->info("🔍 VERIFICATION:");
        $this->line("  New roles: " . $user->fresh()->getRoleNames()->join(', '));
        $this->line("  New permissions: " . $user->fresh()->getAllPermissions()->pluck('name')->join(', '));
        $this->line("  Can create_requests: " . ($user->fresh()->can('create_requests') ? '✅ YES' : '❌ NO'));

        return 0;
    }
}
