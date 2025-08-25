<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class ApiPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear cache to avoid permission issues
        app()['cache']->forget('spatie.permission.cache');

        // Create permissions for CNRS API guard
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
            // Create permission for api guard only
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'api']);
        }

        // Get existing roles and assign API permissions
        $caRole = Role::where('name', 'CA')->where('guard_name', 'api')->first();
        if (!$caRole) {
            $caRole = Role::create(['name' => 'CA', 'guard_name' => 'api']);
        }

        $mrRole = Role::where('name', 'MR_STAFF')->where('guard_name', 'api')->first();
        if (!$mrRole) {
            $mrRole = Role::create(['name' => 'MR_STAFF', 'guard_name' => 'api']);
        }

        $adminRole = Role::where('name', 'ADMIN')->where('guard_name', 'api')->first();
        if (!$adminRole) {
            $adminRole = Role::create(['name' => 'ADMIN', 'guard_name' => 'api']);
        }

        // Assign permissions to CA (Clinic Assistant) for API
        $caRole->givePermissionTo([
            'create_requests',
            'view_requests',
            'handover_requests',
            'view_patients',
            'search_patients',
            'view_dashboard',
        ]);

        // Assign permissions to MR Staff (Medical Records) for API
        $mrRole->givePermissionTo([
            'view_requests',
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

        // Assign all permissions to Admin for API
        $adminRole->givePermissionTo(Permission::where('guard_name', 'api')->get());

        $this->command->info('✅ API permissions and roles created successfully!');
    }
}
