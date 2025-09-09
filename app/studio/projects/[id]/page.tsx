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
  Mouse,
  X,
  History,
  GitCompare,
  RefreshCw,
  PenTool
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
import AnnotationModal from '@/components/annotation-modal'

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
  
  // Image management states
  const [showHistory, setShowHistory] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [selectedHistoryType, setSelectedHistoryType] = useState<'lineart' | 'art'>('lineart')
  const [imageHistory, setImageHistory] = useState<any[]>([])
  const [compareImages, setCompareImages] = useState<{left: any, right: any} | null>(null)
  const [selectedLineartVersion, setSelectedLineartVersion] = useState<number | null>(null)
  const [selectedArtVersion, setSelectedArtVersion] = useState<number | null>(null)
  
  // Annotation states
  const [showAnnotation, setShowAnnotation] = useState(false)
  const [annotationImage, setAnnotationImage] = useState<any>(null)
  const [annotationText, setAnnotationText] = useState('')

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
          description: `${data.comment.user?.nickname || data.comment.author?.nickname || 'Someone'}님이 댓글을 작성했습니다.`
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
              const imageWithUrl = { 
                ...data.image, 
                url: (data.image.url || data.image.fileUrl)?.replace('studioo-backend-production.up.railway.app', 'courageous-spirit-production.up.railway.app'),
                fileUrl: data.image.fileUrl?.replace('studioo-backend-production.up.railway.app', 'courageous-spirit-production.up.railway.app')
              }
              if (data.image.type === 'lineart') {
                updatedScene.lineArtImages = [...(scene.lineArtImages || []), imageWithUrl]
              } else {
                updatedScene.artImages = [...(scene.artImages || []), imageWithUrl]
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
      const [projectData, commentsData] = await Promise.all([
        projectsAPI.getProject(projectId),
        commentsAPI.getProjectComments(projectId)
      ])
      
      console.log('Frontend: Received project data:', {
        projectId,
        hasScenes: !!projectData.scenes,
        scenesCount: projectData.scenes?.length,
        scenes: projectData.scenes?.map((s: any) => ({
          id: s.id,
          imagesCount: s.images?.length,
          images: s.images
        }))
      });
      
      // Use scenes from projectData if available, otherwise fetch separately
      let scenesData = projectData.scenes || [];
      if (!scenesData.length) {
        console.log('Frontend: No scenes in project data, fetching separately');
        scenesData = await scenesAPI.getScenes(projectId, true);
      }
      
      // Process scenes to separate line art and art images
      const processedScenes = scenesData.map((scene: any) => ({
        ...scene,
        lineArtImages: scene.images?.filter((img: any) => img.type === 'lineart')
          .map((img: any) => ({ 
            ...img, 
            url: (img.url || img.fileUrl)?.replace('studioo-backend-production.up.railway.app', 'courageous-spirit-production.up.railway.app'),
            fileUrl: img.fileUrl?.replace('studioo-backend-production.up.railway.app', 'courageous-spirit-production.up.railway.app')
          })) || [],
        artImages: scene.images?.filter((img: any) => img.type === 'art' || img.type === 'storyboard')
          .map((img: any) => ({ 
            ...img, 
            url: (img.url || img.fileUrl)?.replace('studioo-backend-production.up.railway.app', 'courageous-spirit-production.up.railway.app'),
            fileUrl: img.fileUrl?.replace('studioo-backend-production.up.railway.app', 'courageous-spirit-production.up.railway.app')
          })) || []
      }))
      
      console.log('Frontend: Processed scenes:', processedScenes);
      
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
      
      // Convert Image to ProjectImage type
      const projectImage: ProjectImage = {
        id: newImage.id,
        sceneId: newImage.sceneId,
        type: newImage.type,
        fileUrl: newImage.fileUrl,
        url: newImage.fileUrl, // Set url same as fileUrl for consistency
        createdAt: newImage.uploadedAt || new Date().toISOString(),
        uploadedAt: newImage.uploadedAt,
        uploadedBy: newImage.uploadedBy,
        uploader: newImage.uploader
      }
      
      console.log('Uploaded image:', {
        id: projectImage.id,
        fileUrl: projectImage.fileUrl,
        url: projectImage.url,
        type: projectImage.type
      })
      
      // Update scenes with new image
      setScenes(prevScenes => 
        prevScenes.map(scene => {
          if (scene.id === selectedScene.id) {
            const updatedScene = { ...scene }
            if (type === 'lineart') {
              updatedScene.lineArtImages = [...(scene.lineArtImages || []), projectImage]
            } else {
              updatedScene.artImages = [...(scene.artImages || []), projectImage]
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
                  
                  {/* Action buttons for selected view mode */}
                  {imageViewMode !== 'both' && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Get current displayed image
                          const currentImage = imageViewMode === 'lineart' 
                            ? (selectedLineartVersion 
                                ? selectedScene.lineArtImages?.find(img => img.version === selectedLineartVersion)
                                : selectedScene.lineArtImages?.[selectedScene.lineArtImages.length - 1])
                            : (selectedArtVersion
                                ? selectedScene.artImages?.find(img => img.version === selectedArtVersion)
                                : selectedScene.artImages?.[selectedScene.artImages.length - 1])
                          
                          if (currentImage) {
                            setAnnotationImage(currentImage)
                            setShowAnnotation(true)
                          } else {
                            toast({
                              title: '이미지 없음',
                              description: '주석을 남길 이미지가 없습니다.',
                              variant: 'destructive'
                            })
                          }
                        }}
                      >
                        <PenTool className="h-4 w-4 mr-1" />
                        주석
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          setSelectedHistoryType(imageViewMode)
                          const history = await imagesAPI.getImageHistory(selectedScene.id, imageViewMode)
                          // Fix image URLs to use correct backend URL
                          const fixedHistory = history.map((img: any) => ({
                            ...img,
                            url: img.url?.replace('studioo-backend-production.up.railway.app', 'courageous-spirit-production.up.railway.app'),
                            fileUrl: img.fileUrl?.replace('studioo-backend-production.up.railway.app', 'courageous-spirit-production.up.railway.app')
                          }))
                          setImageHistory(fixedHistory)
                          setShowHistory(true)
                        }}
                      >
                        <History className="h-4 w-4 mr-1" />
                        히스토리
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          document.getElementById(`${imageViewMode}-reupload`)?.click()
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        재업로드
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e, imageViewMode)}
                        className="hidden"
                        id={`${imageViewMode}-reupload`}
                      />
                    </div>
                  )}
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
                            {(() => {
                              // Show only the current version image
                              const currentImage = selectedLineartVersion ? 
                                selectedScene.lineArtImages.find(img => img.version === selectedLineartVersion) :
                                selectedScene.lineArtImages[selectedScene.lineArtImages.length - 1]; // Latest version
                              
                              if (!currentImage) return null;
                              
                              return (
                                <div key={currentImage.id} className="relative group">
                                  <img 
                                    src={currentImage.url || currentImage.fileUrl} 
                                    alt="Line art"
                                    className="w-full rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all"
                                    onClick={() => setSelectedImage(currentImage)}
                                  />
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <Button
                                      size="icon"
                                      variant="secondary"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        // Compare functionality
                                        if (!compareImages) {
                                          setCompareImages({ left: currentImage, right: null })
                                        } else if (compareImages.left && !compareImages.right) {
                                          setCompareImages({ ...compareImages, right: currentImage })
                                          setShowCompare(true)
                                        }
                                      }}
                                    >
                                      <GitCompare className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="secondary"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        // Download functionality
                                        const link = document.createElement('a')
                                        link.href = currentImage.url || currentImage.fileUrl
                                        link.download = `lineart-v${currentImage.version}.png`
                                        link.click()
                                      }}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="destructive"
                                      className="h-8 w-8"
                                      onClick={async () => {
                                        if (confirm('이 이미지를 삭제하시겠습니까?')) {
                                          await imagesAPI.deleteImage(currentImage.id)
                                          await fetchProjectDetails()
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })()}
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
                            {(() => {
                              // Show only the current version image
                              const currentImage = selectedArtVersion ? 
                                selectedScene.artImages.find(img => img.version === selectedArtVersion) :
                                selectedScene.artImages[selectedScene.artImages.length - 1]; // Latest version
                              
                              if (!currentImage) return null;
                              
                              return (
                                <div key={currentImage.id} className="relative group">
                                  <img 
                                    src={currentImage.url || currentImage.fileUrl} 
                                    alt="Art"
                                    className="w-full rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all"
                                    onClick={() => setSelectedImage(currentImage)}
                                  />
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <Button
                                      size="icon"
                                      variant="secondary"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        // Compare functionality
                                        if (!compareImages) {
                                          setCompareImages({ left: currentImage, right: null })
                                        } else if (compareImages.left && !compareImages.right) {
                                          setCompareImages({ ...compareImages, right: currentImage })
                                          setShowCompare(true)
                                        }
                                      }}
                                    >
                                      <GitCompare className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="secondary"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        // Download functionality
                                        const link = document.createElement('a')
                                        link.href = currentImage.url || currentImage.fileUrl
                                        link.download = `art-v${currentImage.version}.png`
                                        link.click()
                                      }}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="destructive"
                                      className="h-8 w-8"
                                      onClick={async () => {
                                        if (confirm('이 이미지를 삭제하시겠습니까?')) {
                                          await imagesAPI.deleteImage(currentImage.id)
                                          await fetchProjectDetails()
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })()}
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
                comments.map((comment) => {
                  const isAnnotation = comment.content?.startsWith('[ANNOTATION]')
                  const annotationText = isAnnotation ? comment.content.substring(12) : comment.content
                  
                  return (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {comment.user?.username?.[0]?.toUpperCase() || comment.author?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {comment.user?.nickname || comment.user?.username || comment.author?.nickname || comment.author?.username || 'Unknown'}
                          </p>
                          {isAnnotation && (
                            <Badge variant="secondary" className="text-xs">
                              <PenTool className="h-3 w-3 mr-1" />
                              주석
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        {isAnnotation ? (
                          <div
                            className="cursor-pointer hover:bg-accent/50 rounded p-2 transition-colors"
                            onClick={() => {
                              if (comment.metadata?.annotationImage) {
                                // Show annotation image in modal
                                const img = new Image()
                                img.src = comment.metadata.annotationImage
                                const win = window.open('', '_blank')
                                if (win) {
                                  win.document.write(`
                                    <html>
                                      <head><title>주석 이미지</title></head>
                                      <body style="margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #000;">
                                        <img src="${comment.metadata.annotationImage}" style="max-width: 100%; max-height: 100vh;" />
                                      </body>
                                    </html>
                                  `)
                                }
                              }
                            }}
                          >
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                              {annotationText || '주석을 남겼습니다 (클릭하여 보기)'}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm">{comment.content}</p>
                        )}
                      </div>
                    </div>
                  )
                })
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
      
      {/* Image View Modal with Zoom */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" 
          onClick={() => {
            setSelectedImage(null)
            setZoomLevel(100)
          }}
        >
          <div 
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center" 
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => {
              e.preventDefault()
              const delta = e.deltaY > 0 ? -10 : 10
              setZoomLevel(prev => Math.min(Math.max(prev + delta, 25), 500))
            }}
          >
            <img 
              src={selectedImage.url || selectedImage.fileUrl} 
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain transition-transform duration-200"
              style={{ 
                transform: `scale(${zoomLevel / 100})`,
                cursor: zoomLevel > 100 ? 'move' : 'default'
              }}
              draggable={false}
            />
            
            {/* Controls Overlay */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className="bg-background/90 backdrop-blur-sm px-3 py-1 rounded-lg flex items-center gap-2">
                <Mouse className="h-4 w-4" />
                <span className="text-sm font-medium">{zoomLevel}%</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="bg-background/90 backdrop-blur-sm hover:bg-background"
                onClick={() => {
                  setSelectedImage(null)
                  setZoomLevel(100)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Image Info */}
            <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg">
              <p className="text-sm font-medium">
                {selectedImage.type === 'lineart' ? '선화' : '아트'} - 버전 {selectedImage.version}
              </p>
              <p className="text-xs text-muted-foreground">
                업로드: {selectedImage.uploader?.nickname || selectedImage.uploader?.username || 'Unknown'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                스크롤로 확대/축소
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* History Modal */}
      {showHistory && (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {selectedHistoryType === 'lineart' ? '선화' : '아트'} 업로드 히스토리
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="h-[calc(80vh-80px)]">
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              {imageHistory.map((img: any) => (
                <div key={img.id} className="space-y-2">
                  <img 
                    src={img.url || img.fileUrl}
                    alt={`Version ${img.version}`}
                    className="w-full rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      // Set this version as the current displayed version
                      if (selectedHistoryType === 'lineart') {
                        setSelectedLineartVersion(img.version)
                      } else {
                        setSelectedArtVersion(img.version)
                      }
                      setShowHistory(false)
                      toast({
                        title: '버전 변경',
                        description: `버전 ${img.version}으로 변경되었습니다.`
                      })
                    }}
                  />
                  <div className="text-xs space-y-1">
                    <p className="font-medium">버전 {img.version}</p>
                    <p className="text-muted-foreground">
                      {new Date(img.uploadedAt).toLocaleString()}
                    </p>
                    <p className="text-muted-foreground">
                      {img.uploader?.nickname || 'Unknown'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
      )}
      
      {/* Compare Modal */}
      {showCompare && compareImages && (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-background rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">이미지 비교</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowCompare(false)
                setCompareImages(null)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4 h-[calc(90vh-80px)]">
            <div className="space-y-2">
              <h3 className="font-medium text-center">이전 버전</h3>
              {compareImages.left && (
                <img 
                  src={compareImages.left.url || compareImages.left.fileUrl}
                  alt="Left comparison"
                  className="w-full h-[calc(100%-40px)] object-contain rounded-lg"
                />
              )}
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-center">현재 버전</h3>
              {compareImages.right && (
                <img 
                  src={compareImages.right.url || compareImages.right.fileUrl}
                  alt="Right comparison"
                  className="w-full h-[calc(100%-40px)] object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      </div>
      )}
      
      {/* Annotation Modal */}
      {showAnnotation && annotationImage && (
        <AnnotationModal
          image={annotationImage}
          onClose={() => {
            setShowAnnotation(false)
            setAnnotationImage(null)
            setAnnotationText('')
          }}
          onSave={async (canvasDataUrl, text) => {
            try {
              // Create annotation comment with special type
              const comment = await commentsAPI.createComment({
                projectId,
                sceneId: selectedScene?.id,
                content: `[ANNOTATION]${text}`,
                metadata: {
                  annotationImage: canvasDataUrl,
                  originalImageId: annotationImage.id,
                  imageType: annotationImage.type
                }
              })
              
              setComments([comment, ...comments])
              setShowAnnotation(false)
              setAnnotationImage(null)
              setAnnotationText('')
              
              toast({
                title: '주석 저장',
                description: '주석이 저장되었습니다.'
              })
            } catch (error) {
              toast({
                title: '오류',
                description: '주석 저장에 실패했습니다.',
                variant: 'destructive'
              })
            }
          }}
        />
      )}
    </div>
  )
}