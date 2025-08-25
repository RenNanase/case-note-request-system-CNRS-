<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Spatie\Permission\Models\Role;

class CleanupUserRoles extends Command
{
    protected $signature = 'user:cleanup-roles {email}';
    protected $description = 'Clean up duplicate roles for a user';

    public function handle()
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("User with email {$email} not found.");
            return 1;
        }

        $this->info("Cleaning up roles for user: {$user->name} ({$user->email})");

        // Get current roles
        $currentRoles = $user->getRoleNames();
        $this->info("Current roles: " . $currentRoles->implode(', '));

        // Remove all roles
        $user->syncRoles([]);
        $this->info("All roles removed.");

        // Assign only the API role
        $apiRole = Role::where('name', 'CA')->where('guard_name', 'api')->first();
        if ($apiRole) {
            $user->assignRole($apiRole);
            $this->info("API role 'CA' assigned.");
        } else {
            $this->error("API role 'CA' not found.");
            return 1;
        }

        // Verify
        $newRoles = $user->getRoleNames('api');
        $this->info("New API roles: " . $newRoles->implode(', '));

        $this->info("Role cleanup completed successfully!");
        return 0;
    }
}
