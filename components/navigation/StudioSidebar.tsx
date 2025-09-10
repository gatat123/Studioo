'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ChevronDown, 
  ChevronRight,
  Grid3X3,
  Palette,
  FileImage,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/store/useProjectStore';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  filter: 'all' | 'illustration' | 'storyboard';
  count?: number;
}

export function StudioSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projects } = useProjectStore();
  const [expandedItems, setExpandedItems] = useState<string[]>(['all']);
  const currentFilter = searchParams.get('filter') || 'all';

  // Navigation items
  const navigationItems: NavigationItem[] = [
    {
      id: 'all',
      label: 'All Projects',
      icon: <Grid3X3 className="h-4 w-4" />,
      filter: 'all',
      count: projects.length
    },
    {
      id: 'illustration',
      label: 'Illustrations',
      icon: <Palette className="h-4 w-4" />,
      filter: 'illustration',
      count: projects.filter(p => p.tag === 'illustration').length
    },
    {
      id: 'storyboard',
      label: 'Storyboards',
      icon: <FileImage className="h-4 w-4" />,
      filter: 'storyboard',
      count: projects.filter(p => p.tag === 'storyboard').length
    }
  ];

  // Toggle dropdown
  const toggleDropdown = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Handle navigation click
  const handleNavigationClick = (filter: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', filter);
    }
    router.push(`/studio?${params.toString()}`);
  };

  // Handle project click
  const handleProjectClick = (projectId: string) => {
    router.push(`/studio/projects/${projectId}`);
  };

  // Get filtered projects for each navigation item
  const getFilteredProjects = (filter: string) => {
    if (filter === 'all') return projects;
    return projects.filter(p => p.tag === filter);
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-900 border-r h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Projects</h2>
      </div>

      {/* Navigation Items */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {navigationItems.map((item) => {
            const isExpanded = expandedItems.includes(item.id);
            const isActive = currentFilter === item.filter;
            const filteredProjects = getFilteredProjects(item.filter);

            return (
              <div key={item.id} className="mb-2">
                {/* Navigation Item */}
                <div className="flex items-center gap-1">
                  {/* Expand/Collapse Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleDropdown(item.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>

                  {/* Navigation Button */}
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      "flex-1 justify-start",
                      isActive && "bg-secondary"
                    )}
                    onClick={() => handleNavigationClick(item.filter)}
                  >
                    {item.icon}
                    <span className="ml-2">{item.label}</span>
                    {item.count !== undefined && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {item.count}
                      </span>
                    )}
                  </Button>
                </div>

                {/* Dropdown Projects */}
                {isExpanded && (
                  <div className="ml-6 mt-1 space-y-0.5">
                    {filteredProjects.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-muted-foreground">
                        No projects
                      </div>
                    ) : (
                      filteredProjects.map((project) => (
                        <Button
                          key={project.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-sm font-normal pl-4"
                          onClick={() => handleProjectClick(project.id)}
                        >
                          <span className="truncate">{project.name}</span>
                          {project.hasUpdates && (
                            <div className="ml-auto h-2 w-2 bg-red-500 rounded-full" />
                          )}
                        </Button>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t">
        <Button className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>
    </div>
  );
}