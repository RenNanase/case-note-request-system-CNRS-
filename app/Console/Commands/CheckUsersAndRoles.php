<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class CheckUsersAndRoles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'check:users-and-roles';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check users and their roles to understand the current system state';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("=== Checking Users and Roles ===");

        $users = User::with('roles')->get();

        $this->line("Total users: {$users->count()}");

        foreach ($users as $user) {
            $roles = $user->roles->pluck('name')->implode(', ');
            $this->line("- ID: {$user->id}, Name: {$user->name}, Email: {$user->email}");
            $this->line("  Roles: " . ($roles ?: 'No roles assigned'));
        }

        // Check specific roles
        $this->info("\n=== Users by Role ===");

        $caUsers = User::role('CA')->get();
        $this->line("CA Users: {$caUsers->count()}");
        foreach ($caUsers as $user) {
            $this->line("  - {$user->name} (ID: {$user->id})");
        }

        $mrStaffUsers = User::role('MR_STAFF')->get();
        $this->line("MR Staff Users: {$mrStaffUsers->count()}");
        foreach ($mrStaffUsers as $user) {
            $this->line("  - {$user->name} (ID: {$user->id})");
        }

        $adminUsers = User::role('ADMIN')->get();
        $this->line("Admin Users: {$adminUsers->count()}");
        foreach ($adminUsers as $user) {
            $this->line("  - {$user->name} (ID: {$user->id})");
        }
    }
}
