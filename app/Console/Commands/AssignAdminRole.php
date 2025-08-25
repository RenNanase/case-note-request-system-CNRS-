<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Spatie\Permission\Models\Role;

class AssignAdminRole extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:assign {email : The email of the user to make admin}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Assign admin role to a user by email';

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
        
        // Make sure ADMIN role exists
        $adminRole = Role::firstOrCreate(['name' => 'ADMIN']);
        
        // Assign admin role
        $user->assignRole('ADMIN');
        
        $this->info("✅ Admin role assigned to {$user->name} ({$user->email})");
        $this->info("Current user roles: " . $user->roles->pluck('name')->join(', '));
        
        return 0;
    }
}
