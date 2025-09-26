'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminAuthProvider from '@/components/admin/AdminAuthProvider';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      // Only check auth on initial mount
      if (!isInitialized) {
        // If we have persisted auth state, use it
        if (isAuthenticated && user) {
          // Verify the user is admin
          if (!user.is_admin) {
            router.push('/studio');
            return;
          }
          setIsInitialized(true);
        } else {
          // Only call checkAuth if we don't have auth state
          await checkAuth();

          const currentUser = useAuthStore.getState().user;
          const currentAuth = useAuthStore.getState().isAuthenticated;

          if (!currentAuth || !currentUser || !currentUser.is_admin) {
            router.push('/studio');
            return;
          }

          setIsInitialized(true);
        }
      }
    };

    initializeAuth();
  }, [isInitialized, isAuthenticated, user, router, checkAuth]);

  // Show loading only on initial load
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Verify admin status
  if (!user?.is_admin) {
    return null;
  }

  return (
    <AdminAuthProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {/* Admin Sidebar */}
        <AdminSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </AdminAuthProvider>
  );
}
