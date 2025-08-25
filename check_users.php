<?php

require 'vendor/autoload.php';

$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    $userCount = App\Models\User::count();
    echo "Total users: $userCount\n";
    
    if ($userCount > 0) {
        $users = App\Models\User::take(3)->get(['id', 'name', 'email']);
        echo "\nFirst 3 users:\n";
        foreach ($users as $user) {
            echo "- ID: {$user->id}, Name: {$user->name}, Email: {$user->email}\n";
        }
    } else {
        echo "No users found. You may need to create a user first.\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
