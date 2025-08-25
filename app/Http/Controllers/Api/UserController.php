<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    /**
     * Get users by role
     */
    public function getUsersByRole(HttpRequest $request): JsonResponse
    {
        $role = $request->query('role');

        if (!$role) {
            return response()->json([
                'success' => false,
                'message' => 'Role parameter is required'
            ], 400);
        }

        try {
            Log::info('Fetching users by role', ['role' => $role]);

            $users = User::whereHas('roles', function ($query) use ($role) {
                $query->where('name', $role)->where('guard_name', 'api');
            })
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

            Log::info('Users found', ['count' => $users->count(), 'role' => $role]);

            return response()->json([
                'success' => true,
                'data' => [
                    'users' => $users
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching users by role', [
                'role' => $role,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error fetching users: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get current user profile
     */
    public function profile(): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        return response()->json([
            'success' => true,
            'user' => $user->load(['roles'])
        ]);
    }
}



