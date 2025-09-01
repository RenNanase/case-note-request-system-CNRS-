<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Http;
use App\Models\User;

class AuthController extends Controller
{
    /**
     * User login with email and password
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|min:1', // No strict rules as per requirements
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        // Try to authenticate user
        if (Auth::attempt(['email' => $request->email, 'password' => $request->password])) {
            $user = Auth::user();

            // Check if user account is active
            if (!$user->is_active) {
                Auth::logout();
                return response()->json([
                    'success' => false,
                    'message' => 'Account is deactivated. Please contact IT Department.',
                ], 401);
            }

            // Update last login timestamp
            $user->updateLastLogin();

            // Create token for the user
            $token = $user->createToken('authToken')->accessToken;

            // Log the login activity
            activity()
                ->performedOn($user)
                ->causedBy($user)
                ->log('User logged in');

            return response()->json([
                'success' => true,
                'message' => 'Login successful',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->getRoleNames(),
                    'permissions' => $user->getAllPermissions()->pluck('name'),
                    'needs_password_change' => $user->needsPasswordChange(),
                ],
                'access_token' => $token,
                'token_type' => 'Bearer',
                'expires_in' => 3600, // 1 hour
            ], 200);
        }

        return response()->json([
            'success' => false,
            'message' => 'Invalid credentials',
        ], 401);
    }

    /**
     * Change user password
     */
    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required',
            'new_password' => 'required|min:1', // No strict rules as per requirements
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = $request->user();

        // Verify current password
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect',
            ], 400);
        }

        // Update password
        $user->update([
            'password' => Hash::make($request->new_password),
        ]);

        // Mark password as changed
        $user->markPasswordAsChanged();

        // Log the password change
        activity()
            ->performedOn($user)
            ->causedBy($user)
            ->log('Password changed');

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully',
        ], 200);
    }

    /**
     * Get authenticated user information
     */
    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
                'needs_password_change' => $user->needsPasswordChange(),
                'is_active' => $user->is_active,
                'last_login_at' => $user->last_login_at,
            ]
        ], 200);
    }

    /**
     * Logout user (revoke token)
     */
    public function logout(Request $request)
    {
        $user = $request->user();

        // Revoke current access token (Passport)
        /** @var \Laravel\Passport\Token $token */
        $token = $request->user()->token();
        $token->revoke();

        // Log the logout activity
        activity()
            ->performedOn($user)
            ->causedBy($user)
            ->log('User logged out');

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully'
        ], 200);
    }

    /**
     * Get available roles for frontend
     */
    public function roles()
    {
        $roles = [
            ['value' => 'CA', 'label' => 'Clinic Assistant (CA)', 'description' => 'Can create and submit case note requests'],
            ['value' => 'MR_STAFF', 'label' => 'Medical Records Staff (MR)', 'description' => 'Can approve, reject and manage case note requests'],
            ['value' => 'ADMIN', 'label' => 'Administrator', 'description' => 'Full system access and user management']
        ];

        return response()->json([
            'success' => true,
            'roles' => $roles
        ], 200);
    }

    /**
     * Check if email exists (for better UX)
     */
    public function checkEmail(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email format',
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if ($user) {
            return response()->json([
                'success' => true,
                'exists' => true,
                'user_role' => $user->getRoleNames()->first(),
                'user_name' => $user->name,
            ], 200);
        }

        return response()->json([
            'success' => true,
            'exists' => false,
        ], 200);
    }
}
