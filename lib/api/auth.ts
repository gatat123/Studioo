/**
 * Authentication API Service
 * Handles all auth-related API calls
 */

import api from './client';
import { setAuthToken, removeAuthToken, getAuthToken, setRefreshToken, getRefreshToken, removeRefreshToken } from '@/lib/utils/cookies';
import { User, AuthResponse, LoginCredentials, RegisterData } from '@/types';

export const authAPI = {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/api/auth/register', data) as AuthResponse;

    // Store auth data - backend returns accessToken, not token
    const token = response.accessToken || response.token;
    if (token) {
      setAuthToken(token);
      if (response.refreshToken) {
        setRefreshToken(response.refreshToken);
      }
      if (response.user) {
        localStorage.setItem('userId', response.user.id);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
    }

    return response;
  },

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/api/auth/login', credentials) as AuthResponse;

    // Store auth data - backend returns accessToken, not token
    const token = response.accessToken || response.token;
    if (token) {
      setAuthToken(token);
      if (response.refreshToken) {
        setRefreshToken(response.refreshToken);
      }
      localStorage.setItem('userId', response.user.id);
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout');
    } finally {
      // Clear auth token and user data
      removeAuthToken();
      removeRefreshToken();
      localStorage.removeItem('userId');
      localStorage.removeItem('user');

      // Redirect to login
      window.location.href = '/auth/login';
    }
  },

  /**
   * Get current session
   */
  async getSession(): Promise<User | null> {
    try {
      const response = await api.get('/api/auth/session') as { user: User };
      return response.user;
    } catch {
      // Session API Error
      return null;
    }
  },

  /**
   * Refresh auth token
   */
  async refreshToken(): Promise<string> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/api/auth/refresh', { refreshToken }, { skipRefresh: true }) as { accessToken: string };

    if (response.accessToken) {
      setAuthToken(response.accessToken);
    }

    return response.accessToken;
  },

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    return api.post('/api/auth/verify-email', { token });
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    return api.post('/api/auth/forgot-password', { email });
  },

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    return api.post('/api/auth/reset-password', { token, newPassword });
  },

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return api.post('/api/auth/change-password', { currentPassword, newPassword });
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') {
      // Server-side: can't check
      return false;
    }
    return !!getAuthToken();
  },

  /**
   * Get current user from local storage
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Get auth token
   */
  getToken(): string | null {
    return getAuthToken() || null;
  },
};