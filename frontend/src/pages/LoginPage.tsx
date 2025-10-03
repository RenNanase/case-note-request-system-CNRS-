import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Shield, User, UserCheck, ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/api/auth';



const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
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
  const [showDemo, setShowDemo] = useState(false);
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

  const watchUsername = watch('username');

  // Check if username exists when user types
  React.useEffect(() => {
    const checkUsername = async () => {
      if (watchUsername && watchUsername.length > 0 && !errors.username) {
        try {
          const response = await authApi.checkEmail(watchUsername);
          if (response.success && response.exists) {
            setUserPreview({
              name: response.user_name || 'User',
              role: response.user_role || 'Unknown',
            });
          } else {
            setUserPreview(null);
          }
        } catch (error) {
          // Ignore errors for username checking
          setUserPreview(null);
        }
      } else {
        setUserPreview(null);
      }
    };

    const debounceTimeout = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounceTimeout);
  }, [watchUsername, errors.username]);

  const onSubmit = async (data: LoginFormData) => {
    console.log('🔍 LoginPage: Form submitted, current error:', errorRef.current);
    setLoading(true);

    // IMPORTANT: Don't clear the login error here - let it persist
    // Only clear form validation errors
    clearErrors('username');
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
            errorMessage = 'Invalid username or password';
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

  // Subtle honeycomb/hexagon SVG pattern with small cells and low-opacity lines
  const honeycombSvg = encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='24' height='21' viewBox='0 0 24 21'>
      <g fill='none' stroke='rgba(0,0,0,0.08)' stroke-width='1'>
        <path d='M6 1.5 l6 3.5 v7 l-6 3.5 l-6 -3.5 v-7 z'/>
        <path d='M18 1.5 l6 3.5 v7 l-6 3.5 l-6 -3.5 v-7 z'/>
        <path d='M12 10 l6 3.5 v7 l-6 3.5 l-6 -3.5 v-7 z'/>
      </g>
    </svg>
  `);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        // Layer 1: soft white -> faint green gradient for depth
        // Layer 2: radial fade to reduce pattern intensity at center
        // Layer 3: subtle honeycomb pattern
        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,1), rgba(255,192,203,0.08)), radial-gradient(circle at 50% 40%, rgba(255,255,255,0.9), rgba(255,255,255,0.6) 35%, transparent 60%), url("data:image/svg+xml,${honeycombSvg}")`,
        backgroundSize: 'auto, 900px 900px, 24px 21px',
        backgroundPosition: 'center, center, center',
        backgroundRepeat: 'no-repeat, no-repeat, repeat',
      }}
    >
      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <h1 className="sr-only">CNRS Login</h1>
          <h2 className="text-2xl md:text-3xl font-extrabold text-black tracking-wide">CASE NOTE REQUEST SYSTEM</h2>
          <div className="mt-2 h-1 w-24 mx-auto rounded-full bg-purple-600/80"></div>
          <p className="mt-2 text-gray-700">From request to record · Tracked every step</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border border-purple-100/40 bg-white/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center text-black">Sign In</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-black">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  {...register('username')}
                  className="h-11 border-gray-300 focus-visible:ring-purple-600"
                  disabled={loading}
                />
                {errors.username && (
                  <p className="text-sm text-red-600">{errors.username.message}</p>
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
                <Label htmlFor="password" className="text-black">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    {...register('password')}
                    className="h-11 pr-10 border-gray-300 focus-visible:ring-purple-600"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-black"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
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

              {/* Error */}
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

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Credentials (collapsible) */}
        {/* <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-0">
            <button
              type="button"
              onClick={() => setShowDemo((s) => !s)}
              className="w-full flex items-center justify-between text-left py-2"
              aria-expanded={showDemo}
            >
              <div>
                <CardTitle className="text-base text-black">Demo Login Credentials</CardTitle>
                <CardDescription>Use these to test the system</CardDescription>
              </div>
              {showDemo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </CardHeader>
          {showDemo && (
            <CardContent className="space-y-3 pt-3">
              <div className="grid gap-2">
                <div className="flex items-center justify-between p-2 rounded bg-gray-50 border">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">CA</span>
                  </div>
                  <div className="text-sm text-gray-600">ca / password</div>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-gray-50 border">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    <span className="font-medium">MR Staff</span>
                  </div>
                  <div className="text-sm text-gray-600">mr / password</div>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-gray-50 border">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">Admin</span>
                  </div>
                  <div className="text-sm text-gray-600">admin / password</div>
                </div>
              </div>
            </CardContent>
          )}
        </Card> */}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>
            © 2025 CNRS. All rights reserved.{" "}
            <a
              href="https://github.com/RenNanase"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline transition-colors"
            >
              REN
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
