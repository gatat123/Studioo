'use client';

import React, { useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useStores';
import { useUIStore } from '@/store/useUIStore';

interface RootLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  containerClassName?: string;
}

const RootLayout: React.FC<RootLayoutProps> = ({
  children,
  showSidebar = true,
  containerClassName,
}) => {
  const { user } = useAuth();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  const [isMobile, setIsMobile] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  // Check if it's a project page
  const isProjectPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/studio/projects/');

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-close sidebar on mobile
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();

    // Auto-minimize sidebar on project pages
    if (isProjectPage && !isMobile) {
      setIsSidebarCollapsed(true);
    }

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isProjectPage, isMobile, setSidebarOpen]);

  const handleMenuClick = () => {
    if (isMobile) {
      setSidebarOpen(!isSidebarOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Calculate main content margin based on sidebar state
  const getMainMargin = () => {
    if (!showSidebar) return '';
    if (isMobile) return '';
    return isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <Header
        onMenuClick={handleMenuClick}
        userName={user?.nickname || user?.username || 'Guest'}
        userEmail={user?.email || ''}
        userProfileImage={user?.profileImageUrl}
        notificationCount={0}
      />

      {/* Main Layout */}
      <div className="flex flex-1 relative">
        {/* Sidebar */}
        {showSidebar && (
          <Sidebar
            isOpen={isSidebarOpen}
            onToggle={isMobile ? () => setSidebarOpen(false) : handleSidebarToggle}
            isMobile={isMobile}
            isCollapsed={isSidebarCollapsed}
          />
        )}

        {/* Main Content */}
        <main
          className={cn(
            'flex-1 transition-all duration-300',
            getMainMargin(),
            'mt-0' // Header is sticky, so no additional top margin needed
          )}
        >
          <div className={cn('min-h-[calc(100vh-4rem)]', containerClassName)}>
            {children}
          </div>
          
        </main>
      </div>
    </div>
  );
};

export default RootLayout;
