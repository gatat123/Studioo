'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, UserPlus, TrendingUp, Calendar, BarChart3, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectGrid } from '@/components/projects/ProjectGrid';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import JoinProjectModal from '@/components/projects/JoinProjectModal';
import { CreateWorkTaskModal } from '@/components/work/CreateWorkTaskModal';
import JoinWorkTaskModal from '@/components/work/JoinWorkTaskModal';
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
import { workTasksAPI, type WorkTask } from '@/lib/api/work-tasks';

// 통계 컴포넌트 메모이제이션 (Studio)
const StudioStats = memo(function StudioStats({ projects }: { projects: Project[] }) {
  const stats = useMemo(() => {
    // Since we're fetching only studio projects, use all projects for stats
    // project_type filtering is done at API level with fetchProjects('studio')
    return {
      active: projects.filter((p) => p.status === 'active').length,
      completed: projects.filter((p) => p.status === 'completed').length,
      total: projects.length
    };
  }, [projects]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">진행중인 프로젝트</p>
            <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
          </div>
          <div className="rounded-full bg-slate-100 p-2">
            <TrendingUp className="h-5 w-5 text-slate-700" />
          </div>
        </div>
      </div>

      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">완료된 프로젝트</p>
            <p className="text-2xl font-bold text-slate-900">{stats.completed}</p>
          </div>
          <div className="rounded-full bg-slate-100 p-2">
            <Calendar className="h-5 w-5 text-slate-700" />
          </div>
        </div>
      </div>

      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">전체 프로젝트</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-full bg-slate-100 p-2">
            <BarChart3 className="h-5 w-5 text-slate-700" />
          </div>
        </div>
      </div>
    </div>
  );
});

// Work 통계 컴포넌트
const WorkStats = memo(function WorkStats({ workTasks }: { workTasks: WorkTask[] }) {
  const stats = useMemo(() => {
    return {
      active: workTasks.filter((w) => w.status === 'in_progress' || w.status === 'pending' || w.status === 'review').length,
      completed: workTasks.filter((w) => w.status === 'completed').length,
      total: workTasks.length
    };
  }, [workTasks]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">진행중인 업무</p>
            <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
          </div>
          <div className="rounded-full bg-slate-100 p-2">
            <TrendingUp className="h-5 w-5 text-slate-700" />
          </div>
        </div>
      </div>

      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">완료된 업무</p>
            <p className="text-2xl font-bold text-slate-900">{stats.completed}</p>
          </div>
          <div className="rounded-full bg-slate-100 p-2">
            <Calendar className="h-5 w-5 text-slate-700" />
          </div>
        </div>
      </div>

      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">전체 업무</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-full bg-slate-100 p-2">
            <BarChart3 className="h-5 w-5 text-slate-700" />
          </div>
        </div>
      </div>
    </div>
  );
});

export default function StudioPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const { projects, fetchProjects } = useProjectStore();
  const [activeTab, setActiveTab] = useState<'studio' | 'work'>('studio');
  const [workTasks, setWorkTasks] = useState<WorkTask[]>([]);
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
      // Work 데이터 로딩
      loadWorkTasks();
    }
  }, [isAuthenticated, fetchProjects]);

  // Work 데이터 로딩 함수
  const loadWorkTasks = async () => {
    try {
      const data = await workTasksAPI.getWorkTasks();
      setWorkTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[Studio Page] Error loading work tasks:', error);
      setWorkTasks([]);
    }
  };
  
  useEffect(() => {
    // Only redirect after initialization is complete
    if (!isInitializing && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isInitializing, isLoading, isAuthenticated, router, user?.username]);
  
  
  // Show loading during initialization
  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-12 h-12 mx-auto mb-4">
            <div className="w-full h-full border-4 border-muted border-t-accent rounded-full animate-spin will-change-transform" />
          </div>
          <p className="text-slate-600">로딩중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Filter Buttons */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === 'studio' ? 'default' : 'outline'}
              onClick={() => setActiveTab('studio')}
              className={activeTab === 'studio' ? 'bg-slate-700 text-white hover:bg-slate-800' : ''}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Studio
            </Button>
            <Button
              variant={activeTab === 'work' ? 'default' : 'outline'}
              onClick={() => setActiveTab('work')}
              className={activeTab === 'work' ? 'bg-slate-700 text-white hover:bg-slate-800' : ''}
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Work (업무 관리)
            </Button>
          </div>

          {/* Header */}
          <div className="mb-8 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  {activeTab === 'studio' ? '스튜디오' : '업무 현황 관리 및 공유'}
                </h1>
                <p className="text-slate-600 mt-1">
                  {activeTab === 'studio'
                    ? `${user?.nickname || user?.username}님의 스튜디오`
                    : `${user?.nickname || user?.username}님의 업무 관리 및 공유`
                  }
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

                {/* Join Button */}
                <Button
                  variant="outline"
                  onClick={() => setShowJoinModal(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {activeTab === 'studio' ? '초대 코드로 참여' : '업무 참여'}
                </Button>

                {/* Create Button */}
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {activeTab === 'studio' ? '새 프로젝트' : '새 업무'}
                </Button>
              </div>
            </div>

            {/* Stats */}
            {activeTab === 'studio' ? (
              <StudioStats projects={projects} />
            ) : (
              <WorkStats workTasks={workTasks} />
            )}
          </div>

          {/* Content - Conditional Rendering */}
          {activeTab === 'studio' ? (
            <ProjectGrid />
          ) : (
            <div className="space-y-6">
              {/* Work Tasks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workTasks.length > 0 ? (
                  workTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/studio/work`)}
                    >
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">{task.title}</h3>
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                        {task.description || '설명이 없습니다'}
                      </p>
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            task.priority === 'urgent'
                              ? 'bg-red-100 text-red-700'
                              : task.priority === 'high'
                              ? 'bg-orange-100 text-orange-700'
                              : task.priority === 'medium'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {task.priority === 'urgent'
                            ? '긴급'
                            : task.priority === 'high'
                            ? '높음'
                            : task.priority === 'medium'
                            ? '보통'
                            : '낮음'}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            task.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : task.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {task.status === 'completed'
                            ? '완료'
                            : task.status === 'in_progress'
                            ? '진행중'
                            : task.status === 'review'
                            ? '검토중'
                            : task.status === 'pending'
                            ? '대기'
                            : '취소'}
                        </span>
                      </div>
                      {task.dueDate && (
                        <p className="text-xs text-slate-500 mt-2">
                          마감: {new Date(task.dueDate).toLocaleDateString('ko-KR')}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <p className="text-slate-600 mb-4">업무가 없습니다</p>
                    <Button onClick={() => setShowCreateModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      새 업무 생성
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals - Conditional Rendering based on activeTab */}
      {activeTab === 'studio' ? (
        <>
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
        </>
      ) : (
        <>
          {/* Create Work Task Modal */}
          <CreateWorkTaskModal
            open={showCreateModal}
            onOpenChange={(open) => {
              setShowCreateModal(open);
              if (!open) {
                loadWorkTasks(); // Reload work tasks when modal closes
              }
            }}
          />

          {/* Join Work Task Modal */}
          <JoinWorkTaskModal
            open={showJoinModal}
            onClose={() => {
              setShowJoinModal(false);
              loadWorkTasks(); // Reload work tasks when modal closes
            }}
          />
        </>
      )}
    </div>
  );
}
