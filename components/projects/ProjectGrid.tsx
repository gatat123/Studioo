'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Search, Filter, Grid3X3, List, Calendar, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import OptimizedCard from '@/components/ui/optimized-card';
import { useInView } from 'react-intersection-observer';
import { useDebounce } from '@/hooks/useDebounce';
import { safeGetTime, safeParseDateString } from '@/lib/utils/date-helpers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/store/useProjectStore';

interface Project {
  id: string;
  name: string;
  description?: string;
  deadline?: Date | string;
  tag?: 'illustration' | 'storyboard';
  status: 'active' | 'completed' | 'archived';
  has_updates: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  thumbnail?: string;
}

// 레이지 로딩을 위한 이미지 컴포넌트
const LazyImage = memo(function LazyImage({
  src,
  alt,
  className
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: true,
    rootMargin: '100px'
  });

  return (
    <div ref={ref} className="relative w-full h-full">
      {inView && src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className={className}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <Grid3X3 className="h-12 w-12 text-gray-300 animate-pulse" />
        </div>
      )}
    </div>
  );
});

// 프로젝트 카드 컴포넌트 메모이제이션
const ProjectCard = memo(function ProjectCard({
  project,
  viewMode,
  onClick,
  deadline
}: {
  project: Project;
  viewMode: 'grid' | 'list';
  onClick: (id: string) => void;
  deadline: { text: string; className: string } | null;
}) {
  const handleClick = useCallback(() => {
    onClick(project.id);
  }, [onClick, project.id]);

  if (viewMode === 'grid') {
    return (
      <OptimizedCard
        onClick={handleClick}
        className="h-full"
      >
        <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden">
          <LazyImage
            src={project.thumbnail}
            alt={project.name}
            className="object-cover transition-transform duration-200 hover:scale-105"
          />
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
              {project.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {project.tag && (
                <Badge variant="outline" className="text-xs">
                  {project.tag === 'illustration' ? '일러스트' : '스토리보드'}
                </Badge>
              )}
            </div>

            {deadline && (
              <Badge className={cn('text-xs', deadline.className)}>
                <Calendar className="h-3 w-3 mr-1" />
                {deadline.text}
              </Badge>
            )}
          </div>
        </div>
      </OptimizedCard>
    );
  }

  // List View
  return (
    <OptimizedCard
      onClick={handleClick}
      className="p-4"
    >
      <div className="flex items-center gap-4">
        <div className="w-24 h-16 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden flex-shrink-0">
          <LazyImage
            src={project.thumbnail}
            alt={project.name}
            className="object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mb-2">
              {project.description}
            </p>
          )}
          <div className="flex items-center gap-3">
            {project.tag && (
              <Badge variant="outline" className="text-xs">
                {project.tag === 'illustration' ? '일러스트' : '스토리보드'}
              </Badge>
            )}
            <Badge
              variant={project.status === 'active' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {project.status === 'active' ? '진행중' :
               project.status === 'completed' ? '완료' : '보관'}
            </Badge>
            {deadline && (
              <Badge className={cn('text-xs', deadline.className)}>
                <Calendar className="h-3 w-3 mr-1" />
                {deadline.text}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </OptimizedCard>
  );
});

export function ProjectGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projects, isLoading, fetchProjects } = useProjectStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<'all' | 'illustration' | 'storyboard'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'archived'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'deadline'>('date');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const itemsPerPage = 12;

  // Debounce search query for performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Handle project click - useCallback으로 최적화
  const handleProjectClick = useCallback((projectId: string) => {
    router.push(`/studio/projects/${projectId}`);
  }, [router]);

  // Load projects on mount and handle URL filter
  useEffect(() => {
    fetchProjects('studio'); // Only fetch studio projects

    // Get type filter from URL (updated to use 'type' instead of 'filter')
    const urlType = searchParams.get('type');
    if (urlType && (urlType === 'illustration' || urlType === 'storyboard')) {
      setFilterTag(urlType);
    } else {
      setFilterTag('all');
    }
  }, [fetchProjects, searchParams]);

  // Filter and sort projects - useMemo로 최적화
  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    // Apply search filter with debounced value
    if (debouncedSearchQuery) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    // Apply tag filter
    if (filterTag !== 'all') {
      filtered = filtered.filter(project => project.tag === filterTag);
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(project => project.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'deadline':
          const aDeadline = a.deadline ? safeGetTime(a.deadline) : Infinity;
          const bDeadline = b.deadline ? safeGetTime(b.deadline) : Infinity;
          return aDeadline - bDeadline;
        case 'date':
        default:
          const aUpdated = safeGetTime(a.updated_at);
          const bUpdated = safeGetTime(b.updated_at);
          return bUpdated - aUpdated;
      }
    });

    return filtered;
  }, [projects, debouncedSearchQuery, filterTag, filterStatus, sortBy]);

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterTag, filterStatus, sortBy]);

  // Paginate projects - useMemo로 최적화
  const { totalPages, displayedProjects } = useMemo(() => {
    const total = Math.ceil(filteredProjects.length / itemsPerPage);
    const displayed = showAll
      ? filteredProjects
      : filteredProjects.slice(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage
        );
    return { totalPages: total, displayedProjects: displayed };
  }, [filteredProjects, showAll, currentPage, itemsPerPage]);

  // Format deadline - 메모이제이션
  const formatDeadline = useCallback((deadline?: Date | string) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = deadline instanceof Date ? deadline : safeParseDateString(deadline as string);

    if (!deadlineDate) {
      return { text: '날짜 없음', className: 'text-gray-400 bg-gray-50' };
    }

    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: '마감 지남', className: 'text-red-600 bg-red-50' };
    if (diffDays === 0) return { text: '오늘 마감', className: 'text-orange-600 bg-orange-50' };
    if (diffDays <= 3) return { text: `${diffDays}일 남음`, className: 'text-orange-600 bg-orange-50' };
    if (diffDays <= 7) return { text: `${diffDays}일 남음`, className: 'text-slate-600 bg-slate-100' };
    return { text: `${diffDays}일 남음`, className: 'text-gray-600 bg-gray-50' };
  }, []);

  // Loading skeleton
  const ProjectSkeleton = () => (
    <div className="space-y-3">
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );

  // Empty state
  const EmptyState = () => (
    <div className="col-span-full flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-gray-100 p-4 mb-4">
        <Grid3X3 className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">프로젝트가 없습니다</h3>
      <p className="text-sm text-gray-500">
        {searchQuery || filterTag !== 'all' || filterStatus !== 'all'
          ? '검색 조건에 맞는 프로젝트가 없습니다.'
          : '첫 프로젝트를 생성해보세요!'}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="프로젝트 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters and View Options */}
        <div className="flex gap-2">
          {/* Tag Filter */}
          <Select value={filterTag} onValueChange={(value: 'all' | 'illustration' | 'storyboard') => setFilterTag(value)}>
            <SelectTrigger className="w-[140px]">
              <Tag className="h-4 w-4 mr-2" />
              <SelectValue placeholder="태그" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="illustration">일러스트</SelectItem>
              <SelectItem value="storyboard">스토리보드</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="default">
                <Filter className="h-4 w-4 mr-2" />
                상태
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>프로젝트 상태</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={filterStatus === 'all'}
                onCheckedChange={() => setFilterStatus('all')}
              >
                전체
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterStatus === 'active'}
                onCheckedChange={() => setFilterStatus('active')}
              >
                진행중
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterStatus === 'completed'}
                onCheckedChange={() => setFilterStatus('completed')}
              >
                완료
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterStatus === 'archived'}
                onCheckedChange={() => setFilterStatus('archived')}
              >
                보관
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(value: 'date' | 'name' | 'deadline') => setSortBy(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">최근 수정</SelectItem>
              <SelectItem value="name">이름순</SelectItem>
              <SelectItem value="deadline">마감일순</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Projects Grid/List */}
      {isLoading ? (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        )}>
          {[...Array(6)].map((_, i) => (
            <ProjectSkeleton key={i} />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        )}>
          {displayedProjects.map((project) => {
            const deadline = formatDeadline(project.deadline);
            
            return (
              <ProjectCard
                key={project.id}
                project={project}
                viewMode={viewMode}
                onClick={handleProjectClick}
                deadline={deadline}
              />
            );
          })}
        </div>
      )}

      {/* Show All Button or Pagination */}
      {!isLoading && filteredProjects.length > itemsPerPage && (
        <div className="mt-8 flex justify-center">
          {!showAll ? (
            <div className="flex flex-col items-center gap-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
              <Button 
                variant="outline" 
                onClick={() => setShowAll(true)}
                className="mt-2"
              >
                모든 프로젝트 보기 ({filteredProjects.length}개)
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAll(false);
                setCurrentPage(1);
              }}
            >
              페이지별로 보기
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
