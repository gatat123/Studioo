'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Archive,
  Search,
  RotateCcw,
  Trash2,
  Calendar,
  User,
  Users,
  AlertTriangle,
  Clock,
  HardDrive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useArchiveStore } from '@/store/useArchiveStore';
import { formatDistanceToNow, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ArchivePage() {
  const { toast } = useToast();
  const {
    archivedProjects,
    searchQuery,
    sortBy,
    sortOrder,
    currentPage,
    itemsPerPage,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    setCurrentPage,
    getFilteredProjects,
    getPaginatedProjects,
    removeArchivedProject,
  } = useArchiveStore();

  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Mock data for demonstration
  useEffect(() => {
    // In real implementation, fetch archived projects from API
    const mockProjects = [
      {
        id: '1',
        name: '2024 브랜드 리뉴얼',
        description: '새로운 브랜드 아이덴티티 디자인 프로젝트',
        thumbnail: '/api/placeholder/400/300',
        ownerId: 'user1',
        ownerName: '김디자인',
        ownerAvatar: '/api/placeholder/40/40',
        archivedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        archivedBy: 'user1',
        archivedByName: '김디자인',
        deletionDate: addDays(new Date(), 25).toISOString(),
        collaborators: 3,
        files: 24,
        lastActivity: new Date(Date.now() - 86400000 * 10).toISOString(),
        canRestore: true,
        canDelete: true,
        tags: ['브랜딩', 'UI/UX'],
      },
      {
        id: '2',
        name: '모바일 앱 UI 개선',
        description: 'iOS/Android 앱 UI 전면 개편',
        thumbnail: '/api/placeholder/400/300',
        ownerId: 'user2',
        ownerName: '이개발',
        ownerAvatar: '/api/placeholder/40/40',
        archivedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
        archivedBy: 'user2',
        archivedByName: '이개발',
        deletionDate: addDays(new Date(), 15).toISOString(),
        collaborators: 5,
        files: 42,
        lastActivity: new Date(Date.now() - 86400000 * 20).toISOString(),
        canRestore: true,
        canDelete: false,
        tags: ['모바일', 'UI디자인'],
      },
    ];

    useArchiveStore.getState().setArchivedProjects(mockProjects);
  }, []);

  const filteredProjects = getPaginatedProjects();
  const totalPages = Math.ceil(getFilteredProjects().length / itemsPerPage);

  const handleSelectAll = () => {
    if (selectedProjects.length === filteredProjects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(filteredProjects.map(p => p.id));
    }
  };

  const handleSelectProject = (projectId: string) => {
    if (selectedProjects.includes(projectId)) {
      setSelectedProjects(selectedProjects.filter(id => id !== projectId));
    } else {
      setSelectedProjects([...selectedProjects, projectId]);
    }
  };

  const handleRestoreProject = async (projectId: string) => {
    try {
      toast({
        title: '복원 중',
        description: '프로젝트를 복원하고 있습니다...',
      });

      // API call would go here
      setTimeout(() => {
        removeArchivedProject(projectId);
        toast({
          title: '복원 완료',
          description: '프로젝트가 성공적으로 복원되었습니다.',
        });
      }, 1500);
    } catch {
      // Failed to restore project
      toast({
        title: '복원 실패',
        description: '프로젝트 복원 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleBatchRestore = async () => {
    if (selectedProjects.length === 0) return;

    try {
      toast({
        title: '일괄 복원 중',
        description: `${selectedProjects.length}개 프로젝트를 복원하고 있습니다...`,
      });

      // API call would go here
      setTimeout(() => {
        selectedProjects.forEach(id => removeArchivedProject(id));
        setSelectedProjects([]);
        toast({
          title: '일괄 복원 완료',
          description: `${selectedProjects.length}개 프로젝트가 복원되었습니다.`,
        });
      }, 2000);
    } catch {
      // Failed to batch restore projects
      toast({
        title: '일괄 복원 실패',
        description: '프로젝트 복원 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      toast({
        title: '삭제 중',
        description: '프로젝트를 영구 삭제하고 있습니다...',
      });

      // API call would go here
      setTimeout(() => {
        removeArchivedProject(projectToDelete);
        setShowDeleteDialog(false);
        setProjectToDelete(null);
        toast({
          title: '삭제 완료',
          description: '프로젝트가 영구적으로 삭제되었습니다.',
        });
      }, 1500);
    } catch {
      // Failed to delete project
      toast({
        title: '삭제 실패',
        description: '프로젝트 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const getDaysUntilDeletion = (deletionDate?: string) => {
    if (!deletionDate) return null;
    return Math.ceil((new Date(deletionDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="container max-w-7xl py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Archive className="w-8 h-8" />
              아카이브
            </h1>
            <p className="text-muted-foreground">
              아카이브된 프로젝트를 관리하고 복원할 수 있습니다.
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-4">
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{archivedProjects.length}</p>
                  <p className="text-xs text-muted-foreground">전체 아카이브</p>
                </div>
              </div>
            </Card>
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {archivedProjects.filter(p => p.deletionDate && getDaysUntilDeletion(p.deletionDate)! <= 7).length}
                  </p>
                  <p className="text-xs text-muted-foreground">곧 삭제 예정</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Alert for pending deletions */}
        {archivedProjects.some(p => p.deletionDate && getDaysUntilDeletion(p.deletionDate)! <= 7) && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              일부 프로젝트가 7일 이내에 영구 삭제될 예정입니다. 필요한 경우 복원해주세요.
            </AlertDescription>
          </Alert>
        )}

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="프로젝트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Sort */}
          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
            const [field, order] = value.split('-');
            setSortBy(field as 'archivedAt' | 'name' | 'deletionDate');
            setSortOrder(order as 'asc' | 'desc');
          }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="archivedAt-desc">최근 아카이브순</SelectItem>
              <SelectItem value="archivedAt-asc">오래된 아카이브순</SelectItem>
              <SelectItem value="name-asc">이름순 (가-하)</SelectItem>
              <SelectItem value="name-desc">이름순 (하-가)</SelectItem>
              <SelectItem value="deletionDate-asc">삭제 예정일순</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
            <TabsList>
              <TabsTrigger value="grid">그리드</TabsTrigger>
              <TabsTrigger value="list">리스트</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Batch Actions */}
          {selectedProjects.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedProjects.length}개 선택됨</Badge>
              <Button onClick={handleBatchRestore} size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                일괄 복원
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Projects Grid/List */}
      {filteredProjects.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Archive className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">아카이브된 프로젝트가 없습니다</h3>
            <p className="text-muted-foreground">
              프로젝트를 아카이브하면 여기에 표시됩니다.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Select All */}
          <div className="flex items-center gap-2 mb-4">
            <Checkbox
              checked={selectedProjects.length === filteredProjects.length && filteredProjects.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <label className="text-sm text-muted-foreground cursor-pointer" onClick={handleSelectAll}>
              모두 선택
            </label>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => {
                const daysUntilDeletion = getDaysUntilDeletion(project.deletionDate);
                const isSelected = selectedProjects.includes(project.id);

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className={cn(
                      "overflow-hidden hover:shadow-lg transition-shadow",
                      isSelected && "ring-2 ring-primary"
                    )}>
                      <CardHeader className="p-0">
                        <div className="relative">
                          <div className="aspect-video bg-muted" />
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSelectProject(project.id)}
                            className="absolute top-2 left-2"
                          />
                          {daysUntilDeletion && daysUntilDeletion <= 7 && (
                            <Badge
                              variant="destructive"
                              className="absolute top-2 right-2"
                            >
                              {daysUntilDeletion}일 후 삭제
                            </Badge>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-1">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {project.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mb-3">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={project.ownerAvatar} />
                            <AvatarFallback>{project.ownerName[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {project.ownerName}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(project.archivedAt), {
                              addSuffix: true,
                              locale: ko,
                            })} 아카이브됨
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="secondary" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            {project.collaborators}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            <HardDrive className="w-3 h-3 mr-1" />
                            {project.files}
                          </Badge>
                        </div>

                        {project.tags && project.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap mb-3">
                            {project.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="p-4 pt-0">
                        <div className="flex gap-2 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleRestoreProject(project.id)}
                            disabled={!project.canRestore}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            복원
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              setProjectToDelete(project.id);
                              setShowDeleteDialog(true);
                            }}
                            disabled={!project.canDelete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProjects.map((project) => {
                const daysUntilDeletion = getDaysUntilDeletion(project.deletionDate);
                const isSelected = selectedProjects.includes(project.id);

                return (
                  <Card
                    key={project.id}
                    className={cn(
                      "p-4",
                      isSelected && "ring-2 ring-primary"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelectProject(project.id)}
                      />

                      <div className="w-16 h-16 bg-muted rounded" />

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{project.name}</h3>
                          {daysUntilDeletion && daysUntilDeletion <= 7 && (
                            <Badge variant="destructive" className="text-xs">
                              {daysUntilDeletion}일 후 삭제
                            </Badge>
                          )}
                        </div>

                        {project.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {project.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {project.ownerName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(project.archivedAt), {
                              addSuffix: true,
                              locale: ko,
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {project.collaborators}명
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3" />
                            {project.files}개 파일
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreProject(project.id)}
                          disabled={!project.canRestore}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          복원
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            setProjectToDelete(project.id);
                            setShowDeleteDialog(true);
                          }}
                          disabled={!project.canDelete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                이전
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>프로젝트 영구 삭제</DialogTitle>
            <DialogDescription>
              이 프로젝트를 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject}>
              영구 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}