import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authAPI } from '@/lib/api/auth';
import Cookies from 'js-cookie';
import type { User } from '@/types';

// Auth store state interface
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: { username: string; password: string }) => Promise<void>;
  register: (data: { username: string; email: string; password: string; nickname: string }) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

// Create auth store with persistence
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login function with actual API call
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authAPI.login(credentials);
          
          if (response.user) {
            const user: User = {
              ...response.user,
              profileImageUrl: response.user.profileImageUrl || undefined,
              createdAt: response.user.createdAt || new Date().toISOString(),
              updatedAt: response.user.updatedAt || new Date().toISOString(),
              isActive: response.user.isActive !== undefined ? response.user.isActive : true,
              // 임시로 특정 사용자를 관리자로 설정 (테스트용)
              isAdmin: response.user.username === 'gatat123' ? true : response.user.isAdmin
            };
            
            // Set cookie for middleware authentication
            const token = response.accessToken || response.token;
            if (token) {
              // Extract domain for cookie (for Railway deployment)
              const hostname = window.location.hostname;
              const domain = hostname.includes('railway.app') ? `.${hostname.split('.').slice(-3).join('.')}` : undefined;
              
              Cookies.set('token', token, { 
                expires: 7,
                sameSite: 'lax',
                secure: window.location.protocol === 'https:',
                domain: domain
              });
            }
            
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '로그인에 실패했습니다.';
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Register function with actual API call
      register: async (data) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authAPI.register(data);
          
          if (response.user) {
            const user: User = {
              ...response.user,
              profileImageUrl: response.user.profileImageUrl || undefined,
              createdAt: response.user.createdAt || new Date().toISOString(),
              updatedAt: response.user.updatedAt || new Date().toISOString(),
              isActive: response.user.isActive !== undefined ? response.user.isActive : true,
              // 임시로 특정 사용자를 관리자로 설정 (테스트용)
              isAdmin: response.user.username === 'gatat123' ? true : response.user.isAdmin
            };
            
            // Set cookie for middleware authentication
            const token = response.accessToken || response.token;
            if (token) {
              // Extract domain for cookie (for Railway deployment)
              const hostname = window.location.hostname;
              const domain = hostname.includes('railway.app') ? `.${hostname.split('.').slice(-3).join('.')}` : undefined;
              
              Cookies.set('token', token, { 
                expires: 7,
                sameSite: 'lax',
                secure: window.location.protocol === 'https:',
                domain: domain
              });
            }
            
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '회원가입에 실패했습니다.';
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Logout function
      logout: async () => {
        try {
          await authAPI.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear state and cookies
          set({
            user: null,
            isAuthenticated: false,
            error: null,
          });
          
          // Remove authentication cookie
          Cookies.remove('token');
          
          // Clear other stores if needed
          if (typeof window !== 'undefined') {
            // Clear any other persisted data
            localStorage.removeItem('project-storage');
            localStorage.removeItem('ui-storage');
            localStorage.removeItem('auth-storage');
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            localStorage.removeItem('user');
          }
        }
      },

      // Set user directly
      setUser: (user) => {
        set({
          user,
          isAuthenticated: true,
          error: null,
        });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Check authentication status
      checkAuth: async () => {
        set({ isLoading: true });
        
        try {
          // Check both cookie and localStorage for token
          const cookieToken = Cookies.get('token');
          const localToken = localStorage.getItem('token');
          const token = cookieToken || localToken;
          
          if (!token) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return;
          }
          
          // Sync token between cookie and localStorage
          if (cookieToken && !localToken) {
            localStorage.setItem('token', cookieToken);
          } else if (!cookieToken && localToken) {
            // Extract domain for cookie (for Railway deployment)
            const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
            const domain = hostname.includes('railway.app') ? `.${hostname.split('.').slice(-3).join('.')}` : undefined;
            
            Cookies.set('token', localToken, { 
              expires: 7,
              sameSite: 'lax',
              secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
              domain: domain
            });
          }
          
          const sessionUser = await authAPI.getSession();
          console.log('🔐 CheckAuth - Session response:', sessionUser);
          
          if (sessionUser) {
            const user: User = {
              ...sessionUser,
              profileImageUrl: sessionUser.profileImageUrl || undefined,
              createdAt: sessionUser.createdAt || new Date().toISOString(),
              updatedAt: sessionUser.updatedAt || new Date().toISOString(),
              isActive: sessionUser.isActive !== undefined ? sessionUser.isActive : true,
              // 임시로 특정 사용자를 관리자로 설정 (테스트용)
              isAdmin: sessionUser.username === 'gatat123' ? true : sessionUser.isAdmin
            };
            
            console.log('✅ CheckAuth - User authenticated:', user.username);
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            console.log('❌ CheckAuth - No session user returned');
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('CheckAuth error:', error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Failed to check authentication',
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
