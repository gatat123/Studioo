'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import NextImage from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Archive,
  Download,
  Layers,
  AlertTriangle,
  FileText,
  X
} from 'lucide-react'
import { projectsAPI, ProjectWithParticipants } from '@/lib/api/projects'
import { commentsAPI } from '@/lib/api/comments'
import { useToast } from '@/hooks/use-toast'
import type { Scene, Comment, Image } from '@/types'
import { cn } from '@/lib/utils'
import { safeFormatDistanceToNow } from '@/lib/utils/date-helpers'

// Extended Image type for project
type ProjectImage = Image & {
  url?: string
  version?: number
}

// Scene with images
interface SceneWithImages extends Scene {
  lineArtImages?: ProjectImage[]
  artImages?: ProjectImage[]
}

interface ArchivedProjectViewProps {
  project_id: string
  isArchived?: boolean
}

export function ArchivedProjectView({ project_id: projectId, isArchived: _isArchived = true }: ArchivedProjectViewProps) {
  const router = useRouter()
  const { toast } = useToast()

  // Core states
  const [project, setProject] = useState<ProjectWithParticipants | null>(null)
  const [scenes, setScenes] = useState<SceneWithImages[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  // UI states
  const [selectedScene, setSelectedScene] = useState<SceneWithImages | null>(null)
  const [selectedImage, setSelectedImage] = useState<ProjectImage | null>(null)
  const [imageViewMode, setImageViewMode] = useState<'lineart' | 'art' | 'both'>('both')

  const fetchProjectDetails = useCallback(async () => {
    try {
      const [projectData, commentsData] = await Promise.all([
        projectsAPI.getProject(projectId),
        commentsAPI.getProjectComments(projectId),
      ])

      // For illustration projects, create a default scene if none exists
      let scenesData = projectData.scenes || [];

      if (projectData.tag === 'illustration') {
        // Illustration projects: Ensure at least one default scene
        if (!scenesData.length) {
          scenesData = [{
            id: `${projectId}-default`,
            project_id: projectId,
            scene_number: 1,
            description: '일러스트',
            notes: '',
            images: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }];
        }
      }

      // Process scenes to separate line art and art images
      const processedScenes = scenesData.map((scene: Scene) => ({
        ...scene,
        lineArtImages: scene.images?.filter((img: Image) => img.type === 'lineart')
          .map((img: Image) => ({
            ...img,
            url: img.file_url?.replace('studioo-backend-production.up.railway.app', 'courageous-spirit-production.up.railway.app'),
            file_url: img.file_url?.replace('studioo-backend-production.up.railway.app', 'courageous-spirit-production.up.railway.app')
          })) || [],
        artImages: scene.images?.filter((img: Image) => img.type === 'art')
          .map((img: Image) => ({
            ...img,
            url: img.file_url?.replace('studioo-backend-production.up.railway.app', 'courageous-spirit-production.up.railway.app'),
            file_url: img.file_url?.replace('studioo-backend-production.up.railway.app', 'courageous-spirit-production.up.railway.app')
          })) || []
      }))

      setProject(projectData)
      setScenes(processedScenes)
      setComments(commentsData)

      // Auto-select scene based on project type
      if (processedScenes.length > 0) {
        setSelectedScene(processedScenes[0])
      }
    } catch (error) {
      console.error('Failed to fetch archived project:', error)
      toast({
        title: '오류',
        description: '프로젝트 정보를 불러올 수 없습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [projectId, toast])

  useEffect(() => {
    void fetchProjectDetails()
  }, [fetchProjectDetails])

  const _handleCommentsUpdate = (updatedComments: Comment[]) => {
    setComments(updatedComments)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">프로젝트를 찾을 수 없습니다.</p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => router.push('/studio/archive')}>
                아카이브로 돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between bg-card flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/studio/archive')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{project.name}</h1>
              <Badge variant="secondary">
                <Archive className="h-3 w-3 mr-1" />
                아카이브됨
              </Badge>
              <Badge variant={project.tag === 'illustration' ? 'default' : 'secondary'}>
                {project.tag === 'illustration' ? '일러스트' : '스토리보드'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{project.description}</p>
            {project.archivedAt && (
              <p className="text-xs text-muted-foreground">
                {safeFormatDistanceToNow(project.archivedAt)} 아카이브됨
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            읽기 전용
          </Badge>
        </div>
      </div>

      {/* Archive Notice */}
      <Alert className="m-4 mb-2">
        <Archive className="h-4 w-4" />
        <AlertDescription>
          이 프로젝트는 아카이브되어 읽기 전용 모드입니다. 편집할 수 없습니다.
        </AlertDescription>
      </Alert>

      {/* Main Content - Different layout based on project type */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Scene List (only for storyboard) */}
        {project.tag === 'storyboard' ? (
          <div className="w-80 border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">씬 목록</h2>
              <Badge variant="outline">{scenes.length} 씬</Badge>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {scenes.map((scene, index) => (
                <Card
                  key={scene.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-accent",
                    selectedScene?.id === scene.id && "border-primary bg-accent"
                  )}
                  onClick={() => setSelectedScene(scene)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            씬 {scene.scene_number || index + 1}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{scene.description || `씬 ${index + 1}`}</p>
                        {scene.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {scene.notes}
                          </p>
                        )}
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          <span>선화: {scene.lineArtImages?.length || 0}</span>
                          <span>아트: {scene.artImages?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {scenes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">씬이 없습니다</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        ) : null}

        {/* Center Panel - Image Viewer */}
        <div className="flex-1 flex flex-col bg-muted/30 min-w-0">
          {(selectedScene || project.tag === 'illustration') ? (
            <>
              {/* Image View Controls */}
              <div className="border-b bg-card px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={imageViewMode === 'lineart' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setImageViewMode('lineart')}
                    >
                      선화
                    </Button>
                    <Button
                      variant={imageViewMode === 'art' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setImageViewMode('art')}
                    >
                      아트
                    </Button>
                    <Button
                      variant={imageViewMode === 'both' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setImageViewMode('both')}
                    >
                      모두
                    </Button>
                  </div>
                </div>
              </div>

              {/* Image Display Area */}
              <div className="flex-1 overflow-auto p-4">
                <div className={cn(
                  "grid gap-4",
                  imageViewMode === 'both' ? 'grid-cols-2' : 'grid-cols-1'
                )}>
                  {/* Line Art Section */}
                  {(imageViewMode === 'lineart' || imageViewMode === 'both') && (
                    <div>
                      <h3 className="font-medium mb-3 text-sm">선화</h3>
                      <div className="border-2 border-dashed rounded-lg p-8 bg-card">
                        {selectedScene?.images && selectedScene.images.filter((img: Image) => img.type === 'lineart').length > 0 ? (
                          <div className="space-y-3">
                            {(() => {
                              // Get lineart images from the images array
                              const lineartImages = selectedScene?.images?.filter((img: Image) => img.type === 'lineart') || [];
                              // Show only the current version image
                              const currentImage = lineartImages.find((img: Image) => img.is_current) || lineartImages[lineartImages.length - 1];

                              if (!currentImage) return null;

                              return (
                                <div key={currentImage.id} className="relative group">
                                  <div className="relative w-full aspect-video">
                                    <NextImage
                                      src={(currentImage as ProjectImage).url || (currentImage as ProjectImage).file_url}
                                      alt="Line art"
                                      fill
                                      className="rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all object-contain"
                                      onClick={() => setSelectedImage(currentImage)}
                                      unoptimized
                                    />
                                  </div>
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <Button
                                      size="icon"
                                      variant="secondary"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        const link = document.createElement('a')
                                        link.href = (currentImage as ProjectImage).url || (currentImage as ProjectImage).file_url
                                        link.download = `lineart-v${(currentImage as ProjectImage).version}.png`
                                        link.click()
                                      }}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="text-center">
                            <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                            <p className="text-sm text-muted-foreground">선화 이미지가 없습니다</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Art Section */}
                  {(imageViewMode === 'art' || imageViewMode === 'both') && (
                    <div>
                      <h3 className="font-medium mb-3 text-sm">아트</h3>
                      <div className="border-2 border-dashed rounded-lg p-8 bg-card">
                        {selectedScene?.images && selectedScene.images.filter((img: Image) => img.type === 'art').length > 0 ? (
                          <div className="space-y-3">
                            {(() => {
                              // Get art images from the images array
                              const artImages = selectedScene?.images?.filter((img: Image) => img.type === 'art') || [];
                              // Show only the current version image
                              const currentImage = artImages.find((img: Image) => img.is_current) || artImages[artImages.length - 1];

                              if (!currentImage) return null;

                              return (
                                <div key={currentImage.id} className="relative group">
                                  <div className="relative w-full aspect-video">
                                    <NextImage
                                      src={(currentImage as ProjectImage).url || (currentImage as ProjectImage).file_url}
                                      alt="Art"
                                      fill
                                      className="rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all object-contain"
                                      onClick={() => setSelectedImage(currentImage)}
                                      unoptimized
                                    />
                                  </div>
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <Button
                                      size="icon"
                                      variant="secondary"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        const link = document.createElement('a')
                                        link.href = (currentImage as ProjectImage).url || (currentImage as ProjectImage).file_url
                                        link.download = `art-v${(currentImage as ProjectImage).version}.png`
                                        link.click()
                                      }}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="text-center">
                            <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                            <p className="text-sm text-muted-foreground">아트 이미지가 없습니다</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Layers className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {project.tag === 'storyboard' ? '왼쪽에서 씬을 선택하세요' : '이미지가 없습니다'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - History Section with integrated comments (Read-only) */}
        <div className="w-96 border-l bg-card flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">히스토리</h3>
              <Badge variant="outline">{comments.length}</Badge>
            </div>
            <Badge variant="secondary" className="text-xs">
              읽기 전용
            </Badge>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {comments.length > 0 ? (
                comments.map((comment, index) => {
                  const isAnnotation = comment.content?.startsWith('[ANNOTATION]')
                  const displayContent = isAnnotation
                    ? comment.content.substring(12) || '주석을 남겼습니다'
                    : comment.content

                  return (
                    <div key={`${comment.id}-${index}`} className="flex gap-3">
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">
                            {comment.user?.nickname || comment.user?.username || 'Unknown'}
                          </p>
                          <Badge variant={isAnnotation ? 'default' : 'outline'} className="text-xs">
                            {isAnnotation ? '주석' : '댓글'}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleString()}
                          </p>
                        </div>

                        <p className="text-sm break-words">
                          {displayContent}
                        </p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">히스토리가 없습니다</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <div className="relative w-full h-full">
              <NextImage
                src={selectedImage.url || selectedImage.file_url}
                alt="Image viewer"
                width={1920}
                height={1080}
                className="object-contain"
                onClick={(e) => e.stopPropagation()}
                unoptimized
              />
            </div>
            <Button
              className="absolute top-4 right-4"
              size="icon"
              variant="secondary"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg">
              <p className="text-sm font-medium">
                {selectedImage.type === 'lineart' ? '선화' : '아트'} - 버전 {selectedImage.version}
              </p>
              <p className="text-xs text-muted-foreground">
                업로드: {selectedImage.uploader?.nickname || selectedImage.uploader?.username || 'Unknown'}
              </p>
              <Badge variant="secondary" className="text-xs mt-2">
                아카이브됨 - 읽기 전용
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}