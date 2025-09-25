export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  pending_requests_count?: number;
  needs_password_change?: boolean;
  is_active?: boolean;
  last_login_at?: string;
}

export interface UserDetail {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  password_changed: boolean;
  last_login_at: string | null;
  created_at: string;
  deactivated_at?: string;
  deactivated_by?: string;
  deactivation_reason?: string;
  password_reset_at?: string;
  password_reset_by?: string;
}

export interface UserStatistics {
  total_users: number;
  active_users: number;
  inactive_users: number;
  users_by_role: {
    CA: number;
    MR_STAFF: number;
    ADMIN: number;
  };
  password_status: {
    changed: number;
    not_changed: number;
  };
  recent_logins: number;
}

export interface CreateUserData {
  name: string;
  email: string;
  role: 'CA' | 'MR_STAFF' | 'ADMIN';
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: 'CA' | 'MR_STAFF' | 'ADMIN';
}

export interface UserListResponse {
  success: boolean;
  data: {
    data: UserDetail[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface UserStatisticsResponse {
  success: boolean;
  data: UserStatistics;
}

export interface CreateUserResponse {
  success: boolean;
  message: string;
  data: {
    user: UserDetail;
    default_password: string;
  };
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
  data: {
    default_password: string;
  };
}

export interface LoginCredentials {
  username: string;
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
  refreshUser: () => Promise<User | null>;
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
