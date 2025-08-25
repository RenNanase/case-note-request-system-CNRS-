<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class CheckUserPermissions extends Command
{
    protected $signature = 'user:debug-permissions {email}';
    protected $description = 'Debug user permissions in detail';

    public function handle()
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("User with email {$email} not found.");
            return 1;
        }

        $this->info("=== DEBUGGING PERMISSIONS FOR: {$user->name} ({$user->email}) ===");

        // Check roles
        $this->info("\n📋 ROLES:");
        $this->info("All roles: " . $user->getRoleNames()->implode(', '));
        $this->info("API roles: " . $user->getRoleNames('api')->implode(', '));
        $this->info("Web roles: " . $user->getRoleNames('web')->implode(', '));

        // Check permissions
        $this->info("\n🔐 PERMISSIONS:");
        $this->info("All permissions: " . $user->getAllPermissions()->pluck('name')->implode(', '));
        $this->info("API permissions: " . $user->getAllPermissions('api')->pluck('name')->implode(', '));
        $this->info("Web permissions: " . $user->getAllPermissions('web')->pluck('name')->implode(', '));

        // Check specific permissions
        $this->info("\n🎯 SPECIFIC PERMISSION CHECKS:");
        $permissions = ['create_requests', 'view_requests', 'approve_requests'];

        foreach ($permissions as $permission) {
            $canApi = $user->can($permission);
            $canApiDirect = $user->hasPermissionTo($permission, 'api');
            $canWeb = $user->hasPermissionTo($permission, 'web');

            $this->info("{$permission}:");
            $this->info("  can(): {$permission} = " . ($canApi ? 'YES' : 'NO'));
            $this->info("  hasPermissionTo('{$permission}', 'api') = " . ($canApiDirect ? 'YES' : 'NO'));
            $this->info("  hasPermissionTo('{$permission}', 'web') = " . ($canWeb ? 'YES' : 'NO'));
        }

        // Check role assignments
        $this->info("\n🔍 ROLE ASSIGNMENTS:");
        $roleAssignments = DB::table('model_has_roles')
            ->where('model_id', $user->id)
            ->where('model_type', User::class)
            ->get();

        foreach ($roleAssignments as $assignment) {
            $role = Role::find($assignment->role_id);
            $this->info("Role ID {$assignment->role_id} ({$role->name}) assigned to guard: {$role->guard_name}");
        }

        // Check permission assignments
        $this->info("\n🔍 PERMISSION ASSIGNMENTS:");
        $permissionAssignments = DB::table('model_has_permissions')
            ->where('model_id', $user->id)
            ->where('model_type', User::class)
            ->get();

        foreach ($permissionAssignments as $assignment) {
            $permission = Permission::find($assignment->permission_id);
            $this->info("Permission ID {$assignment->permission_id} ({$permission->name}) assigned to guard: {$permission->guard_name}");
        }

        $this->info("\n=== DEBUG COMPLETE ===");
        return 0;
    }
}
