<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Spatie\Permission\Models\Role;

class FixUserRoles extends Command
{
    protected $signature = 'user:fix-roles {email}';
    protected $description = 'Fix user roles by ensuring they have the correct roles assigned to the api guard';

    public function handle()
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("User with email {$email} not found.");
            return 1;
        }

        $this->info("=== FIXING USER ROLES: {$user->name} ({$user->email}) ===");

        // Get current roles
        $currentRoles = $user->getRoleNames();
        $this->info("Current roles: " . $currentRoles->implode(', '));

        // Get the role names the user should have
        $roleNames = $currentRoles->toArray();

        // Ensure each role is assigned to both web and api guards
        foreach ($roleNames as $roleName) {
            $this->info("Processing role: {$roleName}");

            // Get the role for the api guard
            $apiRole = Role::where('name', $roleName)->where('guard_name', 'api')->first();

            if (!$apiRole) {
                $this->error("API role '{$roleName}' not found!");
                continue;
            }

            // Check if user already has this role for api guard
            if (!$user->hasRole($roleName, 'api')) {
                $user->assignRole($apiRole);
                $this->info("Assigned '{$roleName}' role to 'api' guard");
            } else {
                $this->info("User already has '{$roleName}' role for 'api' guard");
            }
        }

        // Verify the fix
        $this->info("\n=== VERIFICATION ===");
        $newApiRoles = $user->getRoleNames('api');
        $this->info("API roles after fix: " . $newApiRoles->implode(', '));

        $this->info("\n=== ROLE FIX COMPLETE ===");
        return 0;
    }
}
