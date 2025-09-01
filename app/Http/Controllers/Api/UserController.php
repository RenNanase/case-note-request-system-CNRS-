<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    /**
     * Get all users with pagination and filtering
     */
    public function index(HttpRequest $request): JsonResponse
    {
        try {
            $query = User::with(['roles'])
                ->select('id', 'name', 'email', 'is_active', 'password_changed', 'last_login_at', 'created_at');

            // Filter by role
            if ($request->has('role') && $request->role) {
                $query->whereHas('roles', function ($q) use ($request) {
                    $q->where('name', $request->role);
                });
            }

            // Filter by status
            if ($request->has('status') && $request->status) {
                if ($request->status === 'active') {
                    $query->where('is_active', true);
                } elseif ($request->status === 'inactive') {
                    $query->where('is_active', false);
                }
            }

            // Filter by password status
            if ($request->has('password_status') && $request->password_status) {
                if ($request->password_status === 'changed') {
                    $query->where('password_changed', true);
                } elseif ($request->password_status === 'not_changed') {
                    $query->where('password_changed', false);
                }
            }

            // Search by name or email
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            }

            // Sort
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Paginate
            $perPage = $request->get('per_page', 15);
            $users = $query->paginate($perPage);

            // Add role information to each user
            $users->getCollection()->transform(function ($user) {
                $user->role = $user->roles->first()?->name ?? 'No Role';
                return $user;
            });

            return response()->json([
                'success' => true,
                'data' => $users
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching users', [
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
     * Create a new user
     */
    public function store(HttpRequest $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|in:CA,MR_STAFF,ADMIN',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $admin = Auth::user();

            // Create user with default password
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make(User::getDefaultPassword()),
                'password_changed' => false,
                'is_active' => true,
            ]);

            // Assign role
            $role = Role::where('name', $request->role)->first();
            if ($role) {
                $user->assignRole($role);
            }

            // Log the user creation
            activity()
                ->performedOn($user)
                ->causedBy($admin)
                ->log("User created with role: {$request->role}");

            return response()->json([
                'success' => true,
                'message' => 'User created successfully',
                'data' => [
                    'user' => $user->load(['roles']),
                    'default_password' => User::getDefaultPassword()
                ]
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error creating user', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error creating user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a specific user
     */
    public function show(int $id): JsonResponse
    {
        try {
            $user = User::with(['roles'])->find($id);

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $user
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching user', [
                'user_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error fetching user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a user
     */
    public function update(HttpRequest $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $id,
            'role' => 'sometimes|required|in:CA,MR_STAFF,ADMIN',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = User::find($id);
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

            $admin = Auth::user();
            $changes = [];

            // Update basic info
            if ($request->has('name')) {
                $changes['name'] = $request->name;
            }
            if ($request->has('email')) {
                $changes['email'] = $request->email;
            }

            $user->update($changes);

            // Update role if provided
            if ($request->has('role')) {
                $user->syncRoles([$request->role]);
            }

            // Log the update
            activity()
                ->performedOn($user)
                ->causedBy($admin)
                ->log('User updated');

            return response()->json([
                'success' => true,
                'message' => 'User updated successfully',
                'data' => $user->load(['roles'])
            ]);

        } catch (\Exception $e) {
            Log::error('Error updating user', [
                'user_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error updating user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reset user password to default
     */
    public function resetPassword(int $id): JsonResponse
    {
        try {
            $user = User::find($id);
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

            $admin = Auth::user();
            $user->resetToDefaultPassword($admin->name);

            // Log the password reset
            activity()
                ->performedOn($user)
                ->causedBy($admin)
                ->log('Password reset to default');

            return response()->json([
                'success' => true,
                'message' => 'Password reset successfully',
                'data' => [
                    'default_password' => User::getDefaultPassword()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error resetting password', [
                'user_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error resetting password: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle user account status (activate/deactivate)
     */
    public function toggleStatus(int $id): JsonResponse
    {
        try {
            $user = User::find($id);
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

            $admin = Auth::user();

            if ($user->is_active) {
                $user->deactivate($admin->name);
                $message = 'User deactivated successfully';
                $action = 'deactivated';
            } else {
                $user->activate();
                $message = 'User activated successfully';
                $action = 'activated';
            }

            // Log the status change
            activity()
                ->performedOn($user)
                ->causedBy($admin)
                ->log("User {$action}");

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => [
                    'is_active' => $user->is_active
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error toggling user status', [
                'user_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error updating user status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user statistics
     */
    public function statistics(): JsonResponse
    {
        try {
            $stats = [
                'total_users' => User::count(),
                'active_users' => User::where('is_active', true)->count(),
                'inactive_users' => User::where('is_active', false)->count(),
                'users_by_role' => [
                    'CA' => User::role('CA')->count(),
                    'MR_STAFF' => User::role('MR_STAFF')->count(),
                    'ADMIN' => User::role('ADMIN')->count(),
                ],
                'password_status' => [
                    'changed' => User::where('password_changed', true)->count(),
                    'not_changed' => User::where('password_changed', false)->count(),
                ],
                'recent_logins' => User::whereNotNull('last_login_at')
                    ->where('last_login_at', '>=', now()->subDays(7))
                    ->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching user statistics', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error fetching statistics: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get users by role (legacy method for compatibility)
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



