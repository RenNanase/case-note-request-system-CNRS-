import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Shield, User, UserCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/api/auth';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface UserPreview {
  name: string;
  role: string;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userPreview, setUserPreview] = useState<UserPreview | null>(null);
  const errorRef = useRef<string | null>(null);
  const hasRestoredError = useRef(false);
  const { login } = useAuth();

  // Debug logging
  useEffect(() => {
    console.log('🔍 LoginPage: Error state changed to:', error);
    errorRef.current = error;
  }, [error]);

  useEffect(() => {
    console.log('🔍 LoginPage: Component mounted/rendered');
  });

  // Robust error management that persists through re-renders
  const setErrorWithPersistence = (errorMessage: string | null) => {
    console.log('🔍 LoginPage: Setting persistent error to:', errorMessage);

    // Set in both state and ref for maximum persistence
    setError(errorMessage);
    errorRef.current = errorMessage;

    // Persist to localStorage for page reload persistence
    if (errorMessage) {
      localStorage.setItem('login_error', errorMessage);
      localStorage.setItem('login_error_timestamp', Date.now().toString());
    } else {
      localStorage.removeItem('login_error');
      localStorage.removeItem('login_error_timestamp');
    }
  };

  // Clear error only when explicitly needed
  const clearError = () => {
    console.log('🔍 LoginPage: Explicitly clearing error');
    setErrorWithPersistence(null);
  };

  // Restore error from localStorage on component mount (only once)
  useEffect(() => {
    if (!hasRestoredError.current) {
      const savedError = localStorage.getItem('login_error');
      const errorTimestamp = localStorage.getItem('login_error_timestamp');

      if (savedError && errorTimestamp) {
        const errorAge = Date.now() - parseInt(errorTimestamp);
        // Only restore errors that are less than 1 hour old
        if (errorAge < 3600000) {
          console.log('🔍 LoginPage: Restoring recent error from localStorage:', savedError);
          setError(savedError);
          errorRef.current = savedError;
        } else {
          // Clear old errors
          localStorage.removeItem('login_error');
          localStorage.removeItem('login_error_timestamp');
          console.log('🔍 LoginPage: Cleared old error from localStorage');
        }
        hasRestoredError.current = true;
      }
    }
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError: setFormError,
    clearErrors,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const watchEmail = watch('email');

  // Check if email exists when user types
  React.useEffect(() => {
    const checkEmail = async () => {
      if (watchEmail && watchEmail.includes('@') && !errors.email) {
        try {
          const response = await authApi.checkEmail(watchEmail);
          if (response.success && response.exists) {
            setUserPreview({
              name: response.user_name || 'User',
              role: response.user_role || 'Unknown',
            });
          } else {
            setUserPreview(null);
          }
        } catch (error) {
          // Ignore errors for email checking
          setUserPreview(null);
        }
      } else {
        setUserPreview(null);
      }
    };

    const debounceTimeout = setTimeout(checkEmail, 500);
    return () => clearTimeout(debounceTimeout);
  }, [watchEmail, errors.email]);

  const onSubmit = async (data: LoginFormData) => {
    console.log('🔍 LoginPage: Form submitted, current error:', errorRef.current);
    setLoading(true);

    // IMPORTANT: Don't clear the login error here - let it persist
    // Only clear form validation errors
    clearErrors('email');
    clearErrors('password');

    try {
      // Call AuthContext.login directly - it will handle the API call and token storage
      const response = await login(data);
      console.log('🔍 LoginPage: AuthContext login response:', response);

      if (!response.success) {
        if (response.errors) {
          // Handle validation errors
          Object.entries(response.errors).forEach(([field, messages]) => {
            setFormError(field as keyof LoginFormData, {
              type: 'server',
              message: messages[0],
            });
          });
        } else {
          // Clean, concise error messages
          let errorMessage = response.message || 'Login failed';

          if (response.message?.includes('Invalid credentials')) {
            errorMessage = 'Invalid email or password';
          } else if (response.message?.includes('Account is deactivated')) {
            errorMessage = 'Account is deactivated';
          } else if (response.message?.includes('Too many attempts')) {
            errorMessage = 'Too many login attempts';
          } else if (response.message?.includes('Email not verified')) {
            errorMessage = 'Email not verified';
          }

          setErrorWithPersistence(errorMessage);
        }
      } else {
        // SUCCESS: Clear error and proceed with login
        console.log('🔍 LoginPage: Login successful, clearing error');
        setErrorWithPersistence(null);
        // Login is already handled by AuthContext.login
      }
    } catch (error) {
      console.error('🔍 LoginPage: Login error:', error);
      setErrorWithPersistence('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
      console.log('🔍 LoginPage: Form submission completed, final error:', errorRef.current);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'CA':
        return <User className="h-4 w-4" />;
      case 'MR STAFF':
        return <UserCheck className="h-4 w-4" />;
      case 'ADMIN':
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'CA':
        return 'Clinic Assistant';
      case 'MR STAFF':
        return 'Medical Records Staff';
      case 'ADMIN':
        return 'Administrator';
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'CA':
        return 'secondary';
      case 'MR STAFF':
        return 'default';
      case 'ADMIN':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Enhanced error display that shows from multiple sources
  const getDisplayError = () => {
    return error || errorRef.current || localStorage.getItem('login_error');
  };

  // Check if we should show an error
  const shouldShowError = () => {
    const displayError = getDisplayError();
    return displayError && displayError.trim().length > 0;
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          {/* <div className="flex justify-center mb-4">
            <img src="/cnrs.logo.png" alt="CNRS Logo" className="h-16 w-auto" />
          </div> */}
          <h2 className="text-xl font-semibold text-gray-700 mb-2">CASE NOTE REQUEST SYSTEM</h2>
          <p className="text-gray-600">From request to record . Tracked every step</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-soft-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...register('email')}
                  className="h-11"
                  disabled={loading}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}

                {/* User Preview */}
                {userPreview && (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border">
                    {getRoleIcon(userPreview.role)}
                    <span className="text-sm font-medium text-gray-700">
                      {userPreview.name}
                    </span>
                    <Badge variant={getRoleBadgeVariant(userPreview.role)} className="text-xs">
                      {getRoleLabel(userPreview.role)}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    {...register('password')}
                    className="h-11 pr-10"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Enhanced Error Alert - Minimalist Design */}
              {shouldShowError() && (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-red-700 leading-tight">
                      {getDisplayError()?.split('\n\n')[0]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearError}
                    className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
                    aria-label="Clear error"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Remove the separate clear error button since it's now integrated */}


              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card className="shadow-soft border-0 bg-white/70 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Demo Login Credentials</CardTitle>
            <CardDescription>Use these credentials to test the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <div className="flex items-center justify-between p-2 rounded bg-gray-50 border">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">CA</span>
                </div>
                <div className="text-sm text-gray-600">ca@cnrs.test / password</div>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-gray-50 border">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  <span className="font-medium">MR Staff</span>
                </div>
                <div className="text-sm text-gray-600">mr@cnrs.test / password</div>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-gray-50 border">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Admin</span>
                </div>
                <div className="text-sm text-gray-600">admin@cnrs.test / password</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>
            © 2025 CNRS. All rights reserved.{' '}
            <a
              href="https://github.com/RenNanase"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-pink-600 hover:text-pink-800 hover:underline transition-colors"
            >
              RN

            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
