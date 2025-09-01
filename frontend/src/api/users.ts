import apiClient from './client';
import type {
  UserListResponse,
  UserStatisticsResponse,
  CreateUserData,
  UpdateUserData,
  CreateUserResponse,
  PasswordResetResponse,
} from '@/types/auth';

export const usersApi = {
  // Get all users with pagination and filtering
  getUsers: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    role?: string;
    status?: 'active' | 'inactive';
    password_status?: 'changed' | 'not_changed';
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<UserListResponse> => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
  },

  // Get user statistics
  getStatistics: async (): Promise<UserStatisticsResponse> => {
    const response = await apiClient.get('/admin/users/statistics');
    return response.data;
  },

  // Create a new user
  createUser: async (userData: CreateUserData): Promise<CreateUserResponse> => {
    const response = await apiClient.post('/admin/users', userData);
    return response.data;
  },

  // Get a specific user
  getUser: async (id: number) => {
    const response = await apiClient.get(`/admin/users/${id}`);
    return response.data;
  },

  // Update a user
  updateUser: async (id: number, userData: UpdateUserData) => {
    const response = await apiClient.put(`/admin/users/${id}`, userData);
    return response.data;
  },

  // Reset user password to default
  resetPassword: async (id: number): Promise<PasswordResetResponse> => {
    const response = await apiClient.post(`/admin/users/${id}/reset-password`);
    return response.data;
  },

  // Toggle user account status
  toggleStatus: async (id: number) => {
    const response = await apiClient.post(`/admin/users/${id}/toggle-status`);
    return response.data;
  },

  // Legacy: Get users by role (for compatibility)
  getUsersByRole: async (role: string) => {
    const response = await apiClient.get('/users', { params: { role } });
    return response.data;
  },
};
