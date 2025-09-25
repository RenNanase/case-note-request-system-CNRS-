import apiClient from './client';
import type { LoginCredentials, AuthResponse, Role, CheckEmailResponse, User } from '@/types/auth';

export const authApi = {
  // User login
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Network error occurred. Please try again.',
      };
    }
  },

  // Get current user info
  async me(): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get user info',
      };
    }
  },

  // User logout
  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post('/auth/logout');
      return response.data;
    } catch (error: any) {
      // Even if logout fails on server, clear local storage
      return {
        success: true,
        message: 'Logged out successfully',
      };
    }
  },

  // Change password
  async changePassword(data: { current_password: string; new_password: string }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post('/auth/change-password', data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to change password',
      };
    }
  },

  // Check if username exists (for better UX)
  async checkEmail(username: string): Promise<CheckEmailResponse> {
    try {
      const response = await apiClient.post('/auth/check-username', { username });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        exists: false,
      };
    }
  },

  // Get available roles
  async getRoles(): Promise<{ success: boolean; roles?: Role[] }> {
    try {
      const response = await apiClient.get('/auth/roles');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
      };
    }
  },

  // Test API connection
  async testConnection(): Promise<{ success: boolean; message: string; user?: any }> {
    try {
      const response = await apiClient.get('/test');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'API connection failed',
      };
    }
  },

  // Health check (public endpoint)
  async healthCheck(): Promise<{ status: string; timestamp: string; version: string; service: string }> {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error: any) {
      throw new Error('Health check failed');
    }
  },
};
