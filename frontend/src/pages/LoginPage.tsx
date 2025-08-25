import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Shield, User, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/api/auth';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
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
  const { login } = useAuth();

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
    setLoading(true);
    setError(null);
    clearErrors();

    try {
      const response = await login(data);

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
          setError(response.message || 'Login failed');
        }
      }
      // If successful, the AuthContext will handle the state update and redirect
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'CA':
        return <User className="h-4 w-4" />;
      case 'MR_STAFF':
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
      case 'MR_STAFF':
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
      case 'MR_STAFF':
        return 'default';
      case 'ADMIN':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">CNRS</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Case Note Request System</h2>
          <p className="text-gray-600">Secure access for healthcare professionals</p>
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

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

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
          <p>© 2025 Case Note Request System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
