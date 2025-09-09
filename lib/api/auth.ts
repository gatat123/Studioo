/**
 * Authentication API Service
 * Handles all auth-related API calls
 */

import api from './client';
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
      localStorage.setItem('token', token);
      localStorage.setItem('userId', response.user.id);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Also set cookie for middleware (with secure flag for production)
      const isProduction = window.location.protocol === 'https:';
      // Extract domain for cookie (remove port if present)
      const hostname = window.location.hostname;
      const domain = hostname.includes('railway.app') ? `.${hostname.split('.').slice(-3).join('.')}` : '';
      const cookieOptions = `path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${domain ? `; Domain=${domain}` : ''}${isProduction ? '; Secure' : ''}`;
      document.cookie = `token=${token}; ${cookieOptions}`;
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
      localStorage.setItem('token', token);
      localStorage.setItem('userId', response.user.id);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Also set cookie for middleware (with secure flag for production)
      const isProduction = window.location.protocol === 'https:';
      // Extract domain for cookie (remove port if present)
      const hostname = window.location.hostname;
      const domain = hostname.includes('railway.app') ? `.${hostname.split('.').slice(-3).join('.')}` : '';
      const cookieOptions = `path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${domain ? `; Domain=${domain}` : ''}${isProduction ? '; Secure' : ''}`;
      document.cookie = `token=${token}; ${cookieOptions}`;
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
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('user');
      
      // Clear cookie
      document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
      
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
      console.log('📜 Session API Response:', response);
      return response.user;
    } catch (error) {
      console.error('❌ Session API Error:', error);
      return null;
    }
  },

  /**
   * Refresh auth token
   */
  async refreshToken(): Promise<string> {
    const response = await api.post('/api/auth/refresh') as { token: string };
    
    if (response.token) {
      localStorage.setItem('token', response.token);
    }
    
    return response.token;
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
      // Server-side: can't check localStorage
      return false;
    }
    return !!localStorage.getItem('token');
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
    return localStorage.getItem('token');
  },
};