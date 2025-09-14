'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectGrid } from '@/components/projects/ProjectGrid';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import JoinProjectModal from '@/components/projects/JoinProjectModal';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useAuthStore } from '@/store/useAuthStore';
import { useProjectStore } from '@/store/useProjectStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function StudioPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const { projects, fetchProjects } = useProjectStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  useEffect(() => {
    // Debug: Check localStorage and cookies
    if (typeof window !== 'undefined') {
      console.log('🔍 Debug - localStorage token:', localStorage.getItem('token'));
      console.log('🔍 Debug - cookie token:', document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]);
    }
    
    // Give zustand time to hydrate from localStorage
    const timer = setTimeout(() => {
      checkAuth().finally(() => {
        setIsInitializing(false);
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      void fetchProjects();
    }
  }, [isAuthenticated, fetchProjects]);
  
  useEffect(() => {
    console.log('🎭 Studio - Auth state:', { isInitializing, isLoading, isAuthenticated, user: user?.username });
    
    // Only redirect after initialization is complete
    if (!isInitializing && !isLoading && !isAuthenticated) {
      console.log('⚠️ Studio - Redirecting to login page');
      router.push('/login');
    }
  }, [isInitializing, isLoading, isAuthenticated, router, user?.username]);
  
  
  // Show loading during initialization
  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">스튜디오</h1>
                <p className="text-gray-600 mt-1">
                  {user?.nickname || user?.username}님의 작업 공간
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Notifications */}
                <NotificationCenter userId={user?.id} />
                
                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {user?.nickname?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.nickname}</p>
                        <p className="text-xs leading-none text-muted-foreground">@{user?.username}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        <span>프로필</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>설정</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => {
                        void useAuthStore.getState().logout();
                        router.push('/login');
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>로그아웃</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Join Project Button */}
                <Button 
                  variant="outline"
                  onClick={() => setShowJoinModal(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  초대 코드로 참여
                </Button>
                
                {/* Create Project Button */}
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  새 프로젝트
                </Button>
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex gap-6 mt-4">
              <div>
                <span className="text-2xl font-bold text-gray-900">
                  {projects.filter(p => p.status === 'active').length}
                </span>
                <span className="text-gray-600 ml-2">진행중</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-gray-900">
                  {projects.filter(p => p.status === 'completed').length}
                </span>
                <span className="text-gray-600 ml-2">완료</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-gray-900">
                  {projects.length}
                </span>
                <span className="text-gray-600 ml-2">전체</span>
              </div>
            </div>
          </div>

          {/* Project Grid Component */}
          <ProjectGrid />
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal} 
      />

      {/* Join Project Modal */}
      <JoinProjectModal
        open={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />
    </div>
  );
}
