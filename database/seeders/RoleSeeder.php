<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear cache to avoid permission issues
        app()['cache']->forget('spatie.permission.cache');

        // Create permissions for CNRS
        $permissions = [
            // Request permissions
            'create_requests',
            'view_requests',
            'approve_requests',
            'reject_requests',
            'handover_requests',
            'complete_requests',

            // Patient permissions
            'view_patients',
            'search_patients',

            // Report permissions
            'view_reports',
            'export_reports',

            // User management permissions
            'manage_users',
            'view_audit_logs',

            // Dashboard permissions
            'view_dashboard',
            'view_statistics',
        ];

        foreach ($permissions as $permission) {
            // Create permission for both web and api guards
            Permission::create(['name' => $permission, 'guard_name' => 'web']);
            Permission::create(['name' => $permission, 'guard_name' => 'api']);
        }

        // Create roles
        $caRole = Role::create(['name' => 'CA']); // Clinic Assistant
        $mrRole = Role::create(['name' => 'MR_STAFF']); // Medical Records Staff
        $adminRole = Role::create(['name' => 'ADMIN']); // Administrator

        // Assign permissions to CA (Clinic Assistant)
        $caRole->givePermissionTo([
            'create_requests',
            'view_requests', // only their own
            'handover_requests',
            'view_patients',
            'search_patients',
            'view_dashboard',
        ]);

        // Assign permissions to MR Staff (Medical Records)
        $mrRole->givePermissionTo([
            'view_requests', // all requests
            'approve_requests',
            'reject_requests',
            'handover_requests',
            'complete_requests',
            'view_patients',
            'search_patients',
            'view_dashboard',
            'view_statistics',
            'view_reports',
            'export_reports',
        ]);

        // Assign all permissions to Admin
        $adminRole->givePermissionTo(Permission::all());

        // Create demo users
        $users = [
            [
                'name' => 'Alice Wong (CA)',
                'email' => 'ca@cnrs.test',
                'password' => Hash::make('password'),
                'role' => 'CA'
            ],
            [
                'name' => 'Bob Chen (MR Staff)',
                'email' => 'mr@cnrs.test',
                'password' => Hash::make('password'),
                'role' => 'MR_STAFF'
            ],
            [
                'name' => 'Carol Admin',
                'email' => 'admin@cnrs.test',
                'password' => Hash::make('password'),
                'role' => 'ADMIN'
            ],
            // Additional CA users
            [
                'name' => 'David Lim (CA)',
                'email' => 'ca2@cnrs.test',
                'password' => Hash::make('password'),
                'role' => 'CA'
            ],
            // Additional MR Staff
            [
                'name' => 'Eva Martinez (MR)',
                'email' => 'mr2@cnrs.test',
                'password' => Hash::make('password'),
                'role' => 'MR_STAFF'
            ],
        ];

        foreach ($users as $userData) {
            $user = User::create([
                'name' => $userData['name'],
                'email' => $userData['email'],
                'password' => $userData['password'],
                'email_verified_at' => now(),
            ]);

            $user->assignRole($userData['role']);
        }

        $this->command->info('✅ Roles and permissions created successfully!');
        $this->command->info('📧 Demo login credentials:');
        $this->command->info('   CA: ca@cnrs.test / password');
        $this->command->info('   MR: mr@cnrs.test / password');
        $this->command->info('   Admin: admin@cnrs.test / password');
    }
}
