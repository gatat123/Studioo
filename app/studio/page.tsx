'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, UserPlus, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectGrid } from '@/components/projects/ProjectGrid';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import JoinProjectModal from '@/components/projects/JoinProjectModal';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { GlassCard } from '@/components/ui/glass-card';
import type { Project } from '@/types';
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
import { User, Settings, LogOut, Shield } from 'lucide-react';
import Link from 'next/link';

// 통계 컴포넌트 메모이제이션
const StudioStats = memo(function StudioStats({ projects }: { projects: Project[] }) {
  const stats = useMemo(() => {
    // Filter only studio projects as additional safety
    const studioProjects = projects.filter((p) => p.project_type === 'studio');
    return {
      active: studioProjects.filter((p) => p.status === 'active').length,
      completed: studioProjects.filter((p) => p.status === 'completed').length,
      total: studioProjects.length
    };
  }, [projects]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">진행중인 프로젝트</p>
            <p className="text-2xl font-bold text-foreground">{stats.active}</p>
          </div>
          <div className="rounded-full bg-accent/10 p-2">
            <TrendingUp className="h-5 w-5 text-accent" />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">완료된 프로젝트</p>
            <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
          </div>
          <div className="rounded-full bg-green-500/10 p-2">
            <Calendar className="h-5 w-5 text-green-600" />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">전체 프로젝트</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="rounded-full bg-primary/10 p-2">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
        </div>
      </GlassCard>
    </div>
  );
});

export default function StudioPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const { projects, fetchProjects } = useProjectStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Callbacks 메모이제이션
  const handleLogout = useCallback(() => {
    void useAuthStore.getState().logout();
    router.push('/login');
  }, [router]);
  
  useEffect(() => {
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
      void fetchProjects('studio'); // Only fetch studio projects
    }
  }, [isAuthenticated, fetchProjects]);
  
  useEffect(() => {
    // Only redirect after initialization is complete
    if (!isInitializing && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isInitializing, isLoading, isAuthenticated, router, user?.username]);
  
  
  // Show loading during initialization
  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-silver-light via-white to-silver-medium flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4">
            <div className="w-full h-full border-4 border-muted border-t-accent rounded-full animate-spin will-change-transform" />
          </div>
          <p className="text-muted-foreground">로딩중...</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-silver-light via-white to-silver-medium">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <GlassCard className="mb-8 p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-3xl font-bold text-foreground">스튜디오</h1>
                <p className="text-muted-foreground mt-1">
                  {user?.nickname || user?.username}님의 작업 공간
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Notifications */}
                <NotificationCenter />

                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.profile_image_url || undefined} />
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
                    {user?.is_admin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin">
                            <Shield className="mr-2 h-4 w-4" />
                            <span>관리자 대시보드</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={handleLogout}
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
            <StudioStats projects={projects} />
          </GlassCard>

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
