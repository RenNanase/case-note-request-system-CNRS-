<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Spatie\Permission\Models\Role;

class AssignApiRole extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:assign-api-role {email : The email of the user} {role : The role to assign (CA, MR_STAFF, ADMIN)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Assign API role to a user';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        $roleName = strtoupper($this->argument('role'));

        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("User with email {$email} not found!");
            return 1;
        }

        // Check if API role exists
        $apiRole = Role::where('name', $roleName)->where('guard_name', 'api')->first();
        if (!$apiRole) {
            $this->error("API role '{$roleName}' not found! Run php artisan db:seed --class=ApiPermissionsSeeder first.");
            return 1;
        }

        // Assign the API role
        $user->assignRole($apiRole);

        $this->info("✅ API role '{$roleName}' assigned to {$user->name} ({$user->email})");

        // Verify the assignment
        $this->line('');
        $this->info("🔍 VERIFICATION:");
        $this->line("  API Roles: " . $user->fresh()->getRoleNames('api')->join(', ') ?: 'None');
        $this->line("  API Permissions: " . $user->fresh()->getAllPermissions('api')->pluck('name')->join(', ') ?: 'None');
        $this->line("  Can create_requests (API): " . ($user->fresh()->can('create_requests') ? '✅ YES' : '❌ NO'));

        return 0;
    }
}
