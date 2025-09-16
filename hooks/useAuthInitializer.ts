'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import Cookies from 'js-cookie';

/**
 * Custom hook to initialize auth state
 * Handles hydration issues and ensures auth state is consistent
 */
export function useAuthInitializer() {
  const initialized = useRef(false);
  const { checkAuth, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    // Only run once on mount
    if (initialized.current) return;
    initialized.current = true;

    const initAuth = async () => {
      // Get the current token
      const token = Cookies.get('token');

      // If token exists but no auth state, restore it
      if (token && (!isAuthenticated || !user)) {
        await checkAuth();
      }

      // If no token but auth state exists, clear it
      if (!token && isAuthenticated) {
        useAuthStore.getState().logout();
      }
    };

    // Run initialization
    initAuth();
  }, [checkAuth, isAuthenticated, user]);

  return { isAuthenticated, user };
}