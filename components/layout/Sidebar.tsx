'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  FolderOpen,
  Clock,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  LayoutGrid,
  FileText,
  Palette,
  Star,
  Archive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { projectsAPI } from '@/lib/api/projects';
import { Project } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { socketClient } from '@/lib/socket/client';

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
  isMobile?: boolean;
  isCollapsed?: boolean;
}

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  children?: NavigationItem[];
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onToggle,
  isMobile = false,
  isCollapsed: isCollapsedProp = false,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(isCollapsedProp);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Function to fetch projects
  const fetchProjects = async () => {
    try {
      setIsLoadingProjects(true);
      const fetchedProjects = await projectsAPI.getProjects();
      setProjects(fetchedProjects);
      
      // Sort by updated date for recent projects
      // const sorted = [...fetchedProjects].sort((a, b) =>
      //   new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      // );
      // setRecentProjects(sorted.slice(0, 5)); // Get 5 most recent

      // Filter starred projects (you might need to add a starred field to Project type)
      // For now, we'll just use empty array
      // setStarredProjects([]);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast({
        title: '프로젝트 불러오기 실패',
        description: '프로젝트 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Initial fetch projects data
  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const socket = socketClient.connect();

    // Listen for project updates
    const handleProjectUpdate = () => {
      fetchProjects(); // Refresh projects list
    };

    socket.on('project:created', handleProjectUpdate);
    socket.on('project:updated', handleProjectUpdate);
    socket.on('project:deleted', handleProjectUpdate);
    socket.on('project:archived', handleProjectUpdate);

    return () => {
      socket.off('project:created', handleProjectUpdate);
      socket.off('project:updated', handleProjectUpdate);
      socket.off('project:deleted', handleProjectUpdate);
      socket.off('project:archived', handleProjectUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Count projects by type
  const illustrationCount = projects.filter(p => p.tag === 'illustration').length;
  const storyboardCount = projects.filter(p => p.tag === 'storyboard').length;
  const activeCount = projects.filter(p => p.status === 'active').length;
  const archivedCount = projects.filter(p => p.status === 'archived').length;

  // Get recent projects for each type
  const allProjects = projects.slice(0, 5); // Top 5 projects
  const illustrationProjects = projects.filter(p => p.tag === 'illustration').slice(0, 5);
  const storyboardProjects = projects.filter(p => p.tag === 'storyboard').slice(0, 5);

  const navigationItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'Home',
      href: '/studio',
      icon: <Home className="h-4 w-4" />,
    },
    {
      id: 'projects',
      label: 'Projects',
      href: '/studio/projects',
      icon: <FolderOpen className="h-4 w-4" />,
      badge: activeCount > 0 ? activeCount : undefined,
      children: [
        {
          id: 'all-projects',
          label: 'All Projects',
          href: '/studio/projects',
          icon: <LayoutGrid className="h-4 w-4" />,
          badge: projects.length > 0 ? projects.length : undefined,
          children: allProjects.length > 0 ? allProjects.map(p => ({
            id: `project-${p.id}`,
            label: p.name,
            href: `/studio/projects/${p.id}`,
            icon: p.tag === 'illustration' ? <Palette className="h-3 w-3" /> : <FileText className="h-3 w-3" />,
          })) : [{
            id: 'no-projects',
            label: 'No projects yet',
            href: '#',
            icon: <span className="h-3 w-3" />,
          }],
        },
        {
          id: 'illustrations',
          label: 'Illustrations',
          href: '/studio/projects?type=illustration',
          icon: <Palette className="h-4 w-4" />,
          badge: illustrationCount > 0 ? illustrationCount : undefined,
          children: illustrationProjects.length > 0 ? illustrationProjects.map(p => ({
            id: `ill-project-${p.id}`,
            label: p.name,
            href: `/studio/projects/${p.id}`,
            icon: <Palette className="h-3 w-3" />,
          })) : [{
            id: 'no-illustrations',
            label: 'No illustrations',
            href: '#',
            icon: <span className="h-3 w-3" />,
          }],
        },
        {
          id: 'storyboards',
          label: 'Storyboards',
          href: '/studio/projects?type=storyboard',
          icon: <FileText className="h-4 w-4" />,
          badge: storyboardCount > 0 ? storyboardCount : undefined,
          children: storyboardProjects.length > 0 ? storyboardProjects.map(p => ({
            id: `story-project-${p.id}`,
            label: p.name,
            href: `/studio/projects/${p.id}`,
            icon: <FileText className="h-3 w-3" />,
          })) : [{
            id: 'no-storyboards',
            label: 'No storyboards',
            href: '#',
            icon: <span className="h-3 w-3" />,
          }],
        },
      ],
    },
    {
      id: 'recent',
      label: 'Recent',
      href: '/studio/recent',
      icon: <Clock className="h-4 w-4" />,
    },
    {
      id: 'starred',
      label: 'Starred',
      href: '/studio/starred',
      icon: <Star className="h-4 w-4" />,
    },
    {
      id: 'team',
      label: 'Team',
      href: '/studio/team',
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: 'archive',
      label: 'Archive',
      href: '/studio/archive',
      icon: <Archive className="h-4 w-4" />,
      badge: archivedCount > 0 ? archivedCount : undefined,
    },
  ];

  const bottomNavigationItems: NavigationItem[] = [
    {
      id: 'settings',
      label: 'Settings',
      href: '/settings/profile',
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  // Sync with prop
  useEffect(() => {
    setIsCollapsed(isCollapsedProp);
  }, [isCollapsedProp]);

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
    if (onToggle) onToggle();
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const renderNavigationItem = (item: NavigationItem, depth = 0) => {
    const isActive = pathname === item.href || 
                    (item.href === '/studio/projects' && pathname.startsWith('/studio/projects'));
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);

    return (
      <div key={item.id}>
        <Button
          variant={isActive ? 'secondary' : 'ghost'}
          className={cn(
            'w-full justify-start text-left',
            depth === 1 && 'ml-4 text-sm',
            depth === 2 && 'ml-8 text-xs',
            depth > 2 && 'ml-12 text-xs',
            isCollapsed && depth === 0 && 'justify-center px-2'
          )}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              router.push(item.href);
            }
          }}
          asChild={false}
        >
          <div className="flex items-center w-full">
            {item.icon}
            {!isCollapsed && (
              <>
                <span className={cn(
                  'ml-2 flex-1 text-left truncate',
                  depth > 1 && 'ml-1'
                )}>{item.label}</span>
                {item.badge && depth < 2 && (
                  <Badge variant="secondary" className="ml-auto h-5 px-1 text-xs">
                    {item.badge}
                  </Badge>
                )}
                {hasChildren && (
                  <ChevronRight
                    className={cn(
                      'h-3 w-3 transition-transform ml-1',
                      isExpanded && 'rotate-90'
                    )}
                  />
                )}
              </>
            )}
          </div>
        </Button>
        {hasChildren && isExpanded && !isCollapsed && (
          <div className="mt-0.5">
            {item.children?.map((child) => renderNavigationItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (isMobile && isOpen) {
      // Auto-close on mobile after navigation
    }
  }, [pathname, isMobile, isOpen]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] bg-white border-r transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64',
          isMobile && !isOpen && '-translate-x-full',
          'md:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Collapse Toggle Button */}
          <div className="p-4 flex items-center justify-between">
            {!isCollapsed && (
              <h2 className="text-lg font-semibold">Navigation</h2>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              className={cn(isCollapsed && 'mx-auto')}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Search Bar */}
          {!isCollapsed && (
            <div className="px-4 pb-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          )}

          <Separator />

          {/* Navigation Items */}
          <ScrollArea className="flex-1 px-4 py-2">
            {isLoadingProjects ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-1">
                {navigationItems
                  .filter(item => {
                    if (!searchQuery) return true;
                    return item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.children?.some(child => 
                        child.label.toLowerCase().includes(searchQuery.toLowerCase())
                      );
                  })
                  .map((item) => renderNavigationItem(item))}
              </div>
            )}
          </ScrollArea>

          <Separator />

          {/* Bottom Navigation */}
          <div className="p-4 space-y-1">
            {bottomNavigationItems.map((item) => renderNavigationItem(item))}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
