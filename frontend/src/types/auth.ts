export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  pending_requests_count?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  errors?: Record<string, string[]>;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

export interface Role {
  value: string;
  label: string;
  description: string;
}

export interface CheckEmailResponse {
  success: boolean;
  exists: boolean;
  user_role?: string;
  user_name?: string;
}
