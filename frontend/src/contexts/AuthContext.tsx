import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '@/api/auth';
import type { User, LoginCredentials, AuthResponse, AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('cnrs_token');
      const storedUser = localStorage.getItem('cnrs_user');

      console.log('🔐 AuthContext: Initializing auth state...', {
        hasStoredToken: !!storedToken,
        hasStoredUser: !!storedUser,
        storedTokenPreview: storedToken ? `${storedToken.substring(0, 20)}...` : null
      });

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);

          // Verify token is still valid by checking with server
          console.log('🔐 AuthContext: Verifying token with server...');
          const response = await authApi.me();
          console.log('🔐 AuthContext: Server response:', response);

          if (response.success && response.user) {
            setUser(response.user);
            // Update stored user info in case roles/permissions changed
            localStorage.setItem('cnrs_user', JSON.stringify(response.user));
            console.log('🔐 AuthContext: User authenticated successfully:', {
              id: response.user.id,
              name: response.user.name,
              roles: response.user.roles,
              permissions: response.user.permissions
            });
          } else {
            // Token is invalid, clear storage
            console.log('🔐 AuthContext: Token invalid, clearing storage');
            localStorage.removeItem('cnrs_token');
            localStorage.removeItem('cnrs_user');
            setToken(null);
            setUser(null);
          }
        } catch (error) {
          // Network error or token expired
          console.error('🔐 AuthContext: Error verifying token:', error);
          localStorage.removeItem('cnrs_token');
          localStorage.removeItem('cnrs_user');
          setToken(null);
          setUser(null);
        }
      } else {
        console.log('🔐 AuthContext: No stored auth data found');
      }

      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {

        console.log('🔐 AuthContext: Starting login process...');
      const response = await authApi.login(credentials);
      console.log('🔐 AuthContext: API response received:', response);

      if (response.success && response.user && response.access_token) {
        console.log('🔐 AuthContext: Login successful, setting user and token...');
        setUser(response.user);
        setToken(response.access_token);

        // Persist to localStorage
        localStorage.setItem('cnrs_token', response.access_token);
        localStorage.setItem('cnrs_user', JSON.stringify(response.user));

        console.log('🔐 AuthContext: User and token stored successfully:', {
          userId: response.user.id,
          userName: response.user.name,
          tokenPreview: response.access_token.substring(0, 20) + '...',
          localStorageToken: localStorage.getItem('cnrs_token') ? 'stored' : 'missing',
          localStorageUser: localStorage.getItem('cnrs_user') ? 'stored' : 'missing'
        });
      } else {
        console.log('🔐 AuthContext: Login failed or incomplete response:', response);
      }

      return response;
    } catch (error) {
      console.error('🔐 AuthContext: Login error:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.',
      };
    }
  };

  const logout = async () => {
    try {
      // Attempt to logout on server (revoke token)
      await authApi.logout();
    } catch (error) {
      // Continue with local logout even if server request fails
      console.warn('Server logout failed, continuing with local logout');
    } finally {
      // Clear local state and storage
      setUser(null);
      setToken(null);
      localStorage.removeItem('cnrs_token');
      localStorage.removeItem('cnrs_user');
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.me();
      if (response.success && response.user) {
        setUser(response.user);
        localStorage.setItem('cnrs_user', JSON.stringify(response.user));
        return response.user;
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
    return null;
  };

  const isAuthenticated = !!user && !!token;

  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) ?? false;
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated,
    hasRole,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
