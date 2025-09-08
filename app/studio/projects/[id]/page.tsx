'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, 
  Plus,
  Send,
  MoreVertical,
  Trash2,
  Edit,
  Upload,
  Image as ImageIcon,
  MessageSquare,
  Layers,
  Settings,
  Download,
  ZoomIn,
  ZoomOut,
  X
} from 'lucide-react'
import Link from 'next/link'
import { projectsAPI, ProjectWithParticipants } from '@/lib/api/projects'
import { scenesAPI } from '@/lib/api/scenes'
import { commentsAPI } from '@/lib/api/comments'
import { imagesAPI } from '@/lib/api/images'
import { socketClient } from '@/lib/socket/client'
import { useToast } from '@/hooks/use-toast'
import { Scene, Comment, Image } from '@/types'
import { useUIStore } from '@/store/useUIStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// Dynamic import for AnnotationLayer (client-side only)
const AnnotationLayer = dynamic(
  () => import('@/components/editor/AnnotationLayer').then(mod => mod.AnnotationLayer),
  { ssr: false }
)

// Extended Image type for project
interface ProjectImage {
  id: string
  sceneId: string
  projectId?: string
  type: 'lineart' | 'art'
  version?: number
  fileUrl: string
  url?: string
  thumbnailUrl?: string
  createdAt: string | Date
  uploadedAt?: string | Date
  uploadedBy: string
  uploader?: {
    id: string
    username: string
    nickname?: string
  }
}

// Scene with images
interface SceneWithImages extends Scene {
  lineArtImages?: ProjectImage[]
  artImages?: ProjectImage[]
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { setSidebarOpen } = useUIStore()
  const projectId = params.id as string
  
  // Core states
  const [project, setProject] = useState<ProjectWithParticipants | null>(null)
  const [scenes, setScenes] = useState<SceneWithImages[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  
  // UI states
  const [selectedScene, setSelectedScene] = useState<SceneWithImages | null>(null)
  const [selectedImage, setSelectedImage] = useState<ProjectImage | null>(null)
  const [imageViewMode, setImageViewMode] = useState<'lineart' | 'art' | 'both'>('both')
  
  // Scene management
  const [newSceneName, setNewSceneName] = useState('')
  const [newSceneDescription, setNewSceneDescription] = useState('')
  const [isAddingScene, setIsAddingScene] = useState(false)
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null)
  
  // Comment management
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  
  // Upload states
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(100)

  useEffect(() => {
    // Minimize sidebar when entering project page
    setSidebarOpen(false)
    
    fetchProjectDetails()
    
    // Connect to Socket.io and join project room
    const socket = socketClient.connect()
    socketClient.joinProject(projectId)
    
    // Set up real-time event listeners
    socketClient.on('comment:created', (data: any) => {
      if (data.projectId === projectId) {
        setComments(prev => [data.comment, ...prev])
        toast({
          title: '새 댓글',
          description: `${data.comment.author?.nickname || 'Someone'}님이 댓글을 작성했습니다.`
        })
      }
    })
    
    socketClient.on('scene:created', (data: any) => {
      if (data.projectId === projectId) {
        const processedScene = {
          ...data.scene,
          lineArtImages: [],
          artImages: []
        }
        setScenes(prev => [...prev, processedScene])
      }
    })
    
    socketClient.on('image:uploaded', (data: any) => {
      if (data.projectId === projectId) {
        setScenes(prevScenes => 
          prevScenes.map(scene => {
            if (scene.id === data.sceneId) {
              const updatedScene = { ...scene }
              if (data.image.type === 'lineart') {
                updatedScene.lineArtImages = [...(scene.lineArtImages || []), data.image]
              } else {
                updatedScene.artImages = [...(scene.artImages || []), data.image]
              }
              return updatedScene
            }
            return scene
          })
        )
        toast({
          title: '새 이미지',
          description: '새로운 이미지가 업로드되었습니다.'
        })
      }
    })
    
    // Cleanup on unmount
    return () => {
      socketClient.leaveProject(projectId)
      socketClient.off('comment:created')
      socketClient.off('scene:created')
      socketClient.off('image:uploaded')
    }
  }, [projectId])

  const fetchProjectDetails = async () => {
    try {
      const [projectData, scenesData, commentsData] = await Promise.all([
        projectsAPI.getProject(projectId),
        scenesAPI.getScenes(projectId),
        commentsAPI.getProjectComments(projectId)
      ])
      
      // Process scenes to separate line art and art images
      const processedScenes = scenesData.map((scene: any) => ({
        ...scene,
        lineArtImages: scene.images?.filter((img: any) => img.type === 'lineart') || [],
        artImages: scene.images?.filter((img: any) => img.type === 'art') || []
      }))
      
      setProject(projectData)
      setScenes(processedScenes)
      setComments(commentsData)
      
      // Select first scene by default
      if (processedScenes.length > 0) {
        setSelectedScene(processedScenes[0])
      }
    } catch (error) {
      console.error('프로젝트 정보 로드 실패:', error)
      toast({
        title: '오류',
        description: '프로젝트 정보를 불러올 수 없습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddScene = async () => {
    if (!newSceneName.trim()) return
    
    setIsAddingScene(true)
    try {
      const newScene = await scenesAPI.createScene(projectId, {
        sceneNumber: scenes.length + 1,
        description: newSceneName,
        notes: newSceneDescription
      })
      
      const processedScene = {
        ...newScene,
        lineArtImages: [],
        artImages: []
      }
      
      setScenes([...scenes, processedScene])
      setSelectedScene(processedScene)
      setNewSceneName('')
      setNewSceneDescription('')
      
      toast({
        title: '씬 추가',
        description: '새로운 씬이 추가되었습니다.'
      })
    } catch (error) {
      console.error('씬 추가 실패:', error)
      toast({
        title: '오류',
        description: '씬 추가에 실패했습니다.',
        variant: 'destructive'
      })
    } finally {
      setIsAddingScene(false)
    }
  }

  const handleDeleteScene = async (sceneId: string) => {
    if (!confirm('이 씬을 삭제하시겠습니까?')) return
    
    try {
      await scenesAPI.deleteScene(projectId, sceneId)
      
      setScenes(scenes.filter(s => s.id !== sceneId))
      if (selectedScene?.id === sceneId) {
        setSelectedScene(scenes[0] || null)
      }
      
      toast({
        title: '씬 삭제',
        description: '씬이 삭제되었습니다.'
      })
    } catch (error) {
      toast({
        title: '오류',
        description: '씬 삭제에 실패했습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return
    
    setIsSubmittingComment(true)
    try {
      const comment = await commentsAPI.createComment({
        projectId,
        sceneId: selectedScene?.id,
        content: newComment
      })
      setComments([comment, ...comments])
      setNewComment('')
      toast({
        title: '댓글 작성',
        description: '댓글이 작성되었습니다.'
      })
    } catch (error) {
      toast({
        title: '오류',
        description: '댓글 작성에 실패했습니다.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmittingComment(false)
    }
  }

  // Drag and Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, type: 'lineart' | 'art') => {
    e.preventDefault()
    setIsDragging(false)
    
    if (!selectedScene) {
      toast({
        title: '씬 선택',
        description: '먼저 씬을 선택해주세요.',
        variant: 'destructive'
      })
      return
    }
    
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      toast({
        title: '오류',
        description: '이미지 파일만 업로드 가능합니다.',
        variant: 'destructive'
      })
      return
    }
    
    for (const file of imageFiles) {
      await uploadImage(file, type)
    }
  }, [selectedScene])

  const uploadImage = async (file: File, type: 'lineart' | 'art') => {
    if (!selectedScene) return
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast({
        title: '오류',
        description: 'JPEG, PNG, WebP 파일만 업로드 가능합니다.',
        variant: 'destructive'
      })
      return
    }
    
    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      // Use the existing images API with proper parameters
      const newImage = await imagesAPI.uploadImage(
        selectedScene.id,
        file,
        type,
        (progress) => setUploadProgress(progress)
      )
      
      // Update scenes with new image
      setScenes(prevScenes => 
        prevScenes.map(scene => {
          if (scene.id === selectedScene.id) {
            const updatedScene = { ...scene }
            if (type === 'lineart') {
              updatedScene.lineArtImages = [...(scene.lineArtImages || []), newImage]
            } else {
              updatedScene.artImages = [...(scene.artImages || []), newImage]
            }
            setSelectedScene(updatedScene)
            return updatedScene
          }
          return scene
        })
      )
      
      toast({
        title: '업로드 완료',
        description: `${type === 'lineart' ? '선화' : '아트'} 이미지가 업로드되었습니다.`
      })
    } catch (error) {
      toast({
        title: '업로드 실패',
        description: '이미지 업로드에 실패했습니다.',
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'lineart' | 'art') => {
    if (!e.target.files) return
    
    const files = Array.from(e.target.files)
    for (const file of files) {
      await uploadImage(file, type)
    }
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
              <Button onClick={() => router.push('/studio')}>
                스튜디오로 돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/studio')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{project.name}</h1>
              <Badge variant={project.tag === 'illustration' ? 'default' : 'secondary'}>
                {project.tag === 'illustration' ? '일러스트' : '스토리보드'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{project.description}</p>
          </div>
        </div>
        
        <Link href={`/studio/projects/${projectId}/settings`}>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Scene List */}
        <div className="w-80 border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">씬 목록</h2>
              <Badge variant="outline">{scenes.length} 씬</Badge>
            </div>
            
            {/* Add Scene Form */}
            <div className="space-y-2">
              <Input
                placeholder="새 씬 이름"
                value={newSceneName}
                onChange={(e) => setNewSceneName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddScene()}
              />
              <Button 
                onClick={handleAddScene}
                disabled={isAddingScene || !newSceneName.trim()}
                className="w-full"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                씬 추가
              </Button>
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
                            씬 {scene.sceneNumber || index + 1}
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
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingSceneId(scene.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            편집
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteScene(scene.id)
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {scenes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">아직 씬이 없습니다</p>
                  <p className="text-xs mt-1">위에서 새 씬을 추가하세요</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Center Panel - Image Viewer */}
        <div className="flex-1 flex flex-col bg-muted/30">
          {selectedScene ? (
            <>
              {/* Image View Controls */}
              <div className="border-b bg-card px-4 py-2 flex items-center justify-between">
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
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm w-12 text-center">{zoomLevel}%</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
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
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-lg p-8 transition-colors bg-card",
                          isDragging && "border-primary bg-primary/5"
                        )}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'lineart')}
                      >
                        {selectedScene.lineArtImages && selectedScene.lineArtImages.length > 0 ? (
                          <div className="space-y-3">
                            {selectedScene.lineArtImages.map((img) => (
                              <div key={img.id} className="relative group">
                                <img 
                                  src={img.url || img.fileUrl} 
                                  alt="Line art"
                                  className="w-full rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
                                  onClick={() => setSelectedImage(img)}
                                />
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      // Download functionality
                                      const link = document.createElement('a')
                                      link.href = img.url || img.fileUrl
                                      link.download = `lineart-v${img.version}.png`
                                      link.click()
                                    }}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground mb-2">
                              선화 이미지를 드래그하여 업로드
                            </p>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => handleFileSelect(e, 'lineart')}
                              className="hidden"
                              id="lineart-upload"
                            />
                            <label htmlFor="lineart-upload">
                              <Button variant="outline" size="sm" asChild>
                                <span>파일 선택</span>
                              </Button>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Art Section */}
                  {(imageViewMode === 'art' || imageViewMode === 'both') && (
                    <div>
                      <h3 className="font-medium mb-3 text-sm">아트</h3>
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-lg p-8 transition-colors bg-card",
                          isDragging && "border-primary bg-primary/5"
                        )}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'art')}
                      >
                        {selectedScene.artImages && selectedScene.artImages.length > 0 ? (
                          <div className="space-y-3">
                            {selectedScene.artImages.map((img) => (
                              <div key={img.id} className="relative group">
                                <img 
                                  src={img.url || img.fileUrl} 
                                  alt="Art"
                                  className="w-full rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
                                  onClick={() => setSelectedImage(img)}
                                />
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      // Download functionality
                                      const link = document.createElement('a')
                                      link.href = img.url || img.fileUrl
                                      link.download = `art-v${img.version}.png`
                                      link.click()
                                    }}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center">
                            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground mb-2">
                              아트 이미지를 드래그하여 업로드
                            </p>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => handleFileSelect(e, 'art')}
                              className="hidden"
                              id="art-upload"
                            />
                            <label htmlFor="art-upload">
                              <Button variant="outline" size="sm" asChild>
                                <span>파일 선택</span>
                              </Button>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Upload Progress */}
                {isUploading && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-center mt-2 text-muted-foreground">
                      업로드 중... {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Layers className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">왼쪽에서 씬을 선택하세요</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Comments */}
        <div className="w-96 border-l bg-card flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">댓글</h2>
              <Badge variant="outline">{comments.length}</Badge>
            </div>
          </div>
          
          {/* Comment List */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {comment.author?.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {comment.author?.nickname || comment.author?.username || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">아직 댓글이 없습니다</p>
                  <p className="text-xs text-muted-foreground mt-1">첫 댓글을 작성해보세요</p>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Comment Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                placeholder={selectedScene ? `씬 ${selectedScene.sceneNumber}에 댓글 작성...` : "댓글을 입력하세요..."}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] resize-none"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleSubmitComment()
                  }
                }}
              />
              <Button 
                onClick={handleSubmitComment}
                disabled={isSubmittingComment || !newComment.trim()}
                size="icon"
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Ctrl+Enter로 전송
            </p>
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img 
              src={selectedImage.url || selectedImage.fileUrl} 
              alt="Image viewer"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}