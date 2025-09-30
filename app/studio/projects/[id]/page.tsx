'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import NextImage from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
// import { Avatar, AvatarFallback } from '@/components/ui/avatar' // Currently unused
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Upload,
  Image as ImageIcon,
  Layers,
  Settings,
  Download,
  Mouse,
  X,
  History,
  GitCompare,
  RefreshCw,
  PenTool,
  Play,
  RotateCcw,
  FileText,
  Package,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { projectsAPI, ProjectWithParticipants } from '@/lib/api/projects'
import { scenesAPI } from '@/lib/api/scenes'
import { commentsAPI } from '@/lib/api/comments'
import { imagesAPI } from '@/lib/api/images'
import { socketClient } from '@/lib/socket/client'
import api from '@/lib/api/client'
import { useToast } from '@/hooks/use-toast'
import type { Scene, Comment, Image } from '@/types'
import { AnnotationViewModal } from '@/components/projects/AnnotationViewModal'
import AnnotationModal from '@/components/annotation-modal'
import { OverallStoryModal } from '@/components/projects/OverallStoryModal'
import { SetListModal } from '@/components/projects/SetListModal'
import { CharacterListModal } from '@/components/projects/CharacterListModal'
import { SceneScript } from '@/components/projects/SceneScript'
import { HistorySection } from '@/components/projects/HistorySection'
import { SOCKET_EVENTS } from '@/lib/socket/events'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import ScenePlayModal from '@/components/projects/ScenePlayModal'
// TaskBoard and TodoList imports removed - Work projects are managed in the Work section

// Removed AnnotationLayer - using AnnotationModal instead

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

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const projectId = params.id as string
  
  // Core states
  const [project, setProject] = useState<ProjectWithParticipants | null>(null)
  const [scenes, setScenes] = useState<SceneWithImages[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  
  // UI states
  const [selectedScene, setSelectedScene] = useState<SceneWithImages | null>(null)
  const [selectedImage, setSelectedImage] = useState<ProjectImage | null>(null)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 })
  const [imageViewMode, setImageViewMode] = useState<'lineart' | 'art' | 'both'>('both')
  
  // Scene management
  const [newSceneName, setNewSceneName] = useState('')
  const [newSceneDescription, setNewSceneDescription] = useState('')
  const [isAddingScene, setIsAddingScene] = useState(false)
  // const [editingSceneId] = useState<string | null>(null) // Removed unused state
  
  // Comment management - removed as it's handled by HistorySection
  // const [newComment, setNewComment] = useState('')
  // const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  // const [showHistorySection, setShowHistorySection] = useState(false)
  
  // Upload states
  const [isDragging, setIsDragging] = useState(false)
  const [annotationModalData, setAnnotationModalData] = useState<{image: string; text: string} | null>(null)
  const [showAnnotationModal, setShowAnnotationModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(100)
  
  // Image management states
  const [showHistory, setShowHistory] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [selectedHistoryType, setSelectedHistoryType] = useState<'lineart' | 'art'>('lineart')
  const [imageHistory, setImageHistory] = useState<ProjectImage[]>([])
  const [compareImages, setCompareImages] = useState<{left: ProjectImage, right: ProjectImage} | null>(null)
  const [selectedLineartVersion, setSelectedLineartVersion] = useState<number | null>(null)
  const [selectedArtVersion, setSelectedArtVersion] = useState<number | null>(null)
  
  // Annotation states
  const [showAnnotation, setShowAnnotation] = useState(false)
  const [annotationImage, setAnnotationImage] = useState<ProjectImage | null>(null)
  const [, setAnnotationText] = useState('')
  const [showScenePlay, setShowScenePlay] = useState(false)
  
  // New Story/Set/Character states
  const [showOverallStoryModal, setShowOverallStoryModal] = useState(false)
  const [showSetListModal, setShowSetListModal] = useState(false)
  const [showCharacterListModal, setShowCharacterListModal] = useState(false)
  const [overallStory, setOverallStory] = useState('')
  const [setList, setSetList] = useState<Array<{id: string; location: string; items: string[]}>>([])
  const [characterList, setCharacterList] = useState<Array<{id: string; name: string; age: string; description: string}>>([])
  // const [, setShowScriptForScene] = useState<string | null>(null) // Removed unused state

  useEffect(() => {
    // Don't change sidebar state - it's now managed by RootLayout
    void fetchProjectDetails()
    
    // Connect to Socket.io and join project room
    socketClient.connect()
    socketClient.joinProject(projectId)
    
    // Set up real-time event listeners with new event system
    socketClient.on(SOCKET_EVENTS.COMMENT_NEW, () => {
      // Refetch comments to get the full comment data with proper structure
      void fetchComments()
      // Toast is now handled by HistorySection
    })

    // Also listen to legacy backend event for backward compatibility
    socketClient.on('new_comment', () => {
      void fetchComments()
    })

    socketClient.on(SOCKET_EVENTS.HISTORY_UPDATE, (data: { project_id: string; type: string; action: string }) => {
      // Handle history updates
      if (data.project_id === projectId) {
        // Refresh relevant data based on update type
        if (data.type === 'comment') {
          void fetchComments()
        } else if (data.type === 'scene' || data.type === 'image') {
          void fetchProjectDetails()
        }
      }
    })
    
    socketClient.on('new_scene', (data: {user?: {nickname?: string}}) => {
      // Refetch scenes to get the full data with proper structure
      void fetchProjectDetails()
      toast({
        title: '새 씬',
        description: `${data.user?.nickname || 'Someone'}님이 새 씬을 추가했습니다.`
      })
    })
    
    // Standard Socket.io event for image upload
    socketClient.on(SOCKET_EVENTS.IMAGE_UPLOAD, (data: {image?: {type?: string}; user?: {nickname?: string}}) => {
      // Refetch images for the scene to get the full data
      void fetchProjectDetails() // 전체 프로젝트 데이터를 다시 가져와서 이미지 업데이트

      toast({
        title: '새 이미지',
        description: `${data.user?.nickname || 'Someone'}님이 ${data.image?.type === 'lineart' ? '라인아트' : '아트'} 이미지를 업로드했습니다.`
      })
    })
    
    // Standard Socket.io event for image version changes
    socketClient.on(SOCKET_EVENTS.IMAGE_VERSION_CHANGE, (data: {imageType?: string; user?: {nickname?: string}}) => {
      void fetchProjectDetails() // 전체 프로젝트 데이터를 다시 가져와서 이미지 업데이트

      toast({
        title: '이미지 버전 변경',
        description: `${data.user?.nickname || 'Someone'}님이 ${data.imageType === 'lineart' ? '선화' : '아트'} 버전을 변경했습니다.`
      })
    })
    
    // Cleanup on unmount
    return () => {
      socketClient.leaveProject(projectId)
      socketClient.off(SOCKET_EVENTS.COMMENT_NEW)
      socketClient.off('new_comment') // Remove legacy event listener
      socketClient.off(SOCKET_EVENTS.HISTORY_UPDATE)
      socketClient.off('new_scene')
      socketClient.off(SOCKET_EVENTS.IMAGE_UPLOAD)
      socketClient.off(SOCKET_EVENTS.IMAGE_VERSION_CHANGE)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Scene room 참가 - selectedScene이 변경될 때
  useEffect(() => {
    if (!selectedScene?.id) return

    const socket = socketClient.connect()

    console.log('[ProjectPage] 🚪 Joining scene room:', selectedScene.id)
    socket.emit('join_scene', { projectId, sceneId: selectedScene.id })

    // Scene별 댓글 로드
    const fetchSceneComments = async () => {
      try {
        const sceneComments = await commentsAPI.getSceneComments(selectedScene.id)
        setComments(sceneComments || [])
        console.log('[ProjectPage] 📝 Loaded scene comments:', sceneComments?.length || 0)
      } catch (error) {
        console.error('[ProjectPage] Error loading scene comments:', error)
      }
    }

    void fetchSceneComments()

    // Cleanup: scene room 떠나기
    return () => {
      console.log('[ProjectPage] 🚪 Leaving scene room:', selectedScene.id)
      socket.emit('leave_room', { roomId: `scene:${selectedScene.id}` })
    }
  }, [selectedScene?.id, projectId])

  const fetchComments = async () => {
    try {
      const commentsData = await commentsAPI.getProjectComments(projectId)
      setComments(commentsData || [])
    } catch {
      // Error handling for failed comment fetch
    }
  }

  // Removed unused function - images are fetched via fetchProjectDetails
  // const fetchSceneImages = async () => {
  //   try {
  //     // Refetch the entire project to get updated scene data
  //     await fetchProjectDetails()
  //   } catch {
  //   }
  // }

  const fetchProjectDetails = async () => {
    try {
      const [projectData, commentsData, storyData] = await Promise.all([
        projectsAPI.getProject(projectId),
        commentsAPI.getProjectComments(projectId),
        api.get(`/api/projects/${projectId}/story`).catch(() => null)
      ])


      // For illustration projects, create a default scene if none exists
      let scenesData = projectData.scenes || [];

      if (projectData.tag === 'illustration') {
        // Illustration projects: Ensure at least one default scene
        if (!scenesData.length) {
          try {
            // Create actual default scene for illustration projects
            const defaultScene = await scenesAPI.createScene(projectId, {
              sceneNumber: 1,
              description: '일러스트',
              notes: '기본 씬'
            });
            scenesData = [defaultScene];
          } catch {
            // Fallback to virtual scene if API fails
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
      } else {
        // Storyboard projects: Fetch scenes if needed
        if (!scenesData.length) {
          scenesData = await scenesAPI.getScenes(projectId, true);
        }
      }

      // Process scenes to separate line art and art images
      const processedScenes = scenesData.map((scene: Scene) => {
        const lineartImages = scene.images?.filter((img: any) => img.type === 'lineart')
          .map((img: any) => ({
            ...img,
            url: img.fileUrl || img.file_url || '',
            file_url: img.fileUrl || img.file_url || ''
          })) || []

        const artImages = scene.images?.filter((img: any) => img.type === 'art')
          .map((img: any) => ({
            ...img,
            url: img.fileUrl || img.file_url || '',
            file_url: img.fileUrl || img.file_url || ''
          })) || []

        console.log('[ProjectPage] 🖼️  Processing scene images:', {
          sceneId: scene.id,
          sceneNumber: scene.scene_number,
          lineartCount: lineartImages.length,
          artCount: artImages.length,
          sampleLineartUrl: lineartImages[0]?.file_url,
          sampleArtUrl: artImages[0]?.file_url
        })

        return {
          ...scene,
          lineArtImages: lineartImages,
          artImages: artImages
        }
      })


      setProject(projectData)
      setScenes(processedScenes)
      setComments(commentsData)

      // Set story data if available (storyboard only)
      if (storyData?.story) {
        setOverallStory(storyData.story.overall_story || '')
        setSetList(storyData.story.set_list || [])
        setCharacterList(storyData.story.character_list || [])
      }

      // Auto-select scene based on project type
      if (processedScenes.length > 0) {
        setSelectedScene(processedScenes[0])
      }
    } catch {
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

    // Only allow scene creation for storyboard projects
    if (project?.tag === 'illustration') {
      toast({
        title: '알림',
        description: '일러스트 프로젝트는 씬을 추가할 수 없습니다.',
        variant: 'destructive'
      })
      return
    }

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
      
      // Emit Socket.io event for real-time update
      socketClient.emit(SOCKET_EVENTS.SCENE_CREATE, {
        project_id: projectId,
        scene: processedScene,
        user: { id: localStorage.getItem('userId'), nickname: localStorage.getItem('userNickname') }
      })
      
      toast({
        title: '씬 추가',
        description: '새로운 씬이 추가되었습니다.'
      })
    } catch {
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
    } catch {
      toast({
        title: '오류',
        description: '씬 삭제에 실패했습니다.',
        variant: 'destructive'
      })
    }
  }

  // Comment submission is now handled by HistorySection component
  const handleCommentsUpdate = (updatedComments: Comment[]) => {
    setComments(updatedComments)
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

    // For illustration projects, use the default scene
    let targetScene = selectedScene
    if (!targetScene && project?.tag === 'illustration' && scenes.length > 0) {
      targetScene = scenes[0]
      setSelectedScene(targetScene)
    }

    if (!targetScene) {
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
      await uploadImage(file, type, targetScene)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScene, project, scenes])

  const uploadImage = async (file: File, type: 'lineart' | 'art', targetScene?: SceneWithImages) => {
    // Use provided targetScene or selectedScene
    const sceneToUse = targetScene || selectedScene

    // For illustration projects, auto-select first scene if needed
    if (!sceneToUse && project?.tag === 'illustration' && scenes.length > 0) {
      const defaultScene = scenes[0]
      setSelectedScene(defaultScene)
      return uploadImage(file, type, defaultScene)
    }

    if (!sceneToUse) return
    
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
        sceneToUse.id,
        file,
        type,
        (progress) => setUploadProgress(progress)
      )
      
      // Convert Image to ProjectImage type
      const projectImage: ProjectImage = {
        id: newImage.id,
        scene_id: newImage.scene_id,
        type: newImage.type,
        file_url: newImage.file_url,
        url: newImage.file_url, // Set url same as fileUrl for consistency
        uploaded_at: newImage.uploaded_at || new Date().toISOString(),
        uploaded_by: newImage.uploaded_by,
        uploader: newImage.uploader,
        is_current: true
      }
      
      
      // Update scenes with new image
      setScenes(prevScenes =>
        prevScenes.map(scene => {
          if (scene.id === sceneToUse.id) {
            const updatedScene = { ...scene }
            
            // Update images array (main array used for display)
            if (!updatedScene.images) {
              updatedScene.images = []
            }
            
            // Mark all existing images of same type as not current
            updatedScene.images = updatedScene.images.map((img: Image) =>
              img.type === type ? { ...img, is_current: false } : img
            )
            
            // Add new image as current
            updatedScene.images.push({ ...projectImage, is_current: true })
            
            // Also update legacy arrays for backward compatibility
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
      
      // Emit Socket.io event for real-time update
      socketClient.emit(SOCKET_EVENTS.IMAGE_UPLOAD, {
        project_id: projectId,
        scene_id: sceneToUse.id,
        image: projectImage,
        type,
        user: { id: localStorage.getItem('userId'), nickname: localStorage.getItem('userNickname') }
      })
      
      toast({
        title: '업로드 완료',
        description: `${type === 'lineart' ? '선화' : '아트'} 이미지가 업로드되었습니다.`
      })
    } catch {
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
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between bg-card flex-shrink-0">
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
              {project.project_type === 'work' ? (
                <Badge variant="default">
                  업무
                </Badge>
              ) : (
                <Badge variant={project.tag === 'illustration' ? 'default' : 'secondary'}>
                  {project.tag === 'illustration' ? '일러스트' : '스토리보드'}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{project.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Studio project buttons */}
          {project.project_type === 'studio' && (
            <>
              {/* Storyboard-specific buttons */}
              {project.tag === 'storyboard' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOverallStoryModal(true)}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    전체 스토리
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSetListModal(true)}
                  >
                    <Package className="h-4 w-4 mr-1" />
                    세트
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCharacterListModal(true)}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    캐릭터
                  </Button>
                </>
              )}
            </>
          )}

          <Link href={`/studio/projects/${projectId}/settings`}>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content - Different layout based on project type */}
      <div className="flex-1 flex overflow-hidden">
        {/* Work Project Layout - Redirect to Work section */}
        {project.project_type === 'work' ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold">업무 프로젝트</h2>
              <p className="text-gray-600">이 프로젝트는 업무 섹션에서 관리됩니다.</p>
              <Button
                onClick={() => window.location.href = '/studio/work'}
                className="mt-4"
              >
                업무 섹션으로 이동
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Studio Project Layout - Left Panel - Scene List (only for storyboard) */}
            {project.tag === 'storyboard' ? (
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
                onKeyDown={(e) => e.key === 'Enter' && handleAddScene()}
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
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {/* Edit scene functionality */}}>
                            <Edit className="h-4 w-4 mr-2" />
                            편집
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation()
                              void handleDeleteScene(scene.id)
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

                    {/* Play Button - Only for storyboard projects */}
                    {project.tag === 'storyboard' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowScenePlay(true)}
                        className="ml-2"
                        title="씬 플레이 모드"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Action buttons for selected view mode */}
                  {imageViewMode !== 'both' && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Get current displayed image
                          const images = selectedScene?.images?.filter((img: Image) => img.type === imageViewMode) || [];
                          const currentImage = imageViewMode === 'lineart'
                            ? (selectedLineartVersion
                                ? images.find((img: Image) => (img as ProjectImage).version === selectedLineartVersion)
                                : images.find((img: Image) => img.is_current) || images[images.length - 1])
                            : (selectedArtVersion
                                ? images.find((img: Image) => (img as ProjectImage).version === selectedArtVersion)
                                : images.find((img: Image) => img.is_current) || images[images.length - 1])
                          
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
                          if (!selectedScene) return;
                          setSelectedHistoryType(imageViewMode)
                          const history = await imagesAPI.getImageHistory(selectedScene.id, imageViewMode)
                          // Fix image URLs and add version numbers
                          const fixedHistory = history.map((img: ProjectImage, index: number) => ({
                            ...img,
                            url: img.url?.replace('studioo-backend-production.up.railway.app', 'courageous-spirit-production.up.railway.app'),
                            file_url: img.file_url?.replace('studioo-backend-production.up.railway.app', 'courageous-spirit-production.up.railway.app'),
                            version: (img as ProjectImage).version || history.length - index // Add version if missing
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
                        {selectedScene?.images && selectedScene.images.filter((img: Image) => img.type === 'lineart').length > 0 ? (
                          <div className="space-y-3">
                            {(() => {
                              // Get lineart images from the images array
                              const lineartImages = selectedScene?.images?.filter((img: Image) => img.type === 'lineart') || [];
                              // Show only the current version image
                              const currentImage = selectedLineartVersion ?
                                lineartImages.find((img: Image) => (img as ProjectImage).version === selectedLineartVersion) :
                                lineartImages.find((img: Image) => img.is_current) || lineartImages[lineartImages.length - 1]; // Current or Latest version
                              
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
                                        link.href = (currentImage as ProjectImage).url || (currentImage as ProjectImage).file_url
                                        link.download = `lineart-v${(currentImage as ProjectImage).version}.png`
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
                        {selectedScene?.images && selectedScene.images.filter((img: Image) => img.type === 'art').length > 0 ? (
                          <div className="space-y-3">
                            {(() => {
                              // Get art images from the images array
                              const artImages = selectedScene?.images?.filter((img: Image) => img.type === 'art') || [];
                              // Show only the current version image
                              const currentImage = selectedArtVersion ?
                                artImages.find((img: Image) => (img as ProjectImage).version === selectedArtVersion) :
                                artImages.find((img: Image) => img.is_current) || artImages[artImages.length - 1]; // Current or Latest version
                              
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
                                        link.href = (currentImage as ProjectImage).url || (currentImage as ProjectImage).file_url
                                        link.download = `art-v${(currentImage as ProjectImage).version}.png`
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
                <p className="text-muted-foreground">
                  {project.tag === 'storyboard' ? '왼쪽에서 씬을 선택하세요' : '이미지를 업로드하세요'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - History Section with integrated comments */}
        <div className="w-96 border-l bg-card flex flex-col h-full overflow-hidden">
          <HistorySection
            project_id={projectId}
            sceneId={selectedScene?.id}
            comments={comments}
            onCommentsUpdate={handleCommentsUpdate}
            onAnnotationClick={(annotation) => {
              setAnnotationModalData(annotation)
              setShowAnnotationModal(true)
            }}
          />
        </div>
          </>
        )}
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
            </div>
          </div>
        </div>
      )}
      
      {/* Image View Modal with Zoom and Drag */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" 
          onClick={() => {
            setSelectedImage(null)
            setZoomLevel(100)
            setImagePosition({ x: 0, y: 0 })
          }}
        >
          <div 
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => {
              e.preventDefault()
              const delta = e.deltaY > 0 ? -10 : 10
              setZoomLevel(prev => Math.min(Math.max(prev + delta, 25), 500))
            }}
            onMouseDown={(e) => {
              if (zoomLevel > 100) {
                setIsDraggingImage(true)
                setDragStartPos({
                  x: e.clientX - imagePosition.x,
                  y: e.clientY - imagePosition.y
                })
                e.preventDefault()
              }
            }}
            onMouseMove={(e) => {
              if (isDraggingImage && zoomLevel > 100) {
                setImagePosition({
                  x: e.clientX - dragStartPos.x,
                  y: e.clientY - dragStartPos.y
                })
              }
            }}
            onMouseUp={() => setIsDraggingImage(false)}
            onMouseLeave={() => setIsDraggingImage(false)}
            style={{ cursor: isDraggingImage ? 'grabbing' : (zoomLevel > 100 ? 'grab' : 'default') }}
          >
            <div className="relative max-w-full max-h-[90vh]" style={{
              transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${zoomLevel / 100})`,
            }}>
              <NextImage
                src={selectedImage.url || selectedImage.file_url}
                alt="Preview"
                width={1920}
                height={1080}
                className="object-contain"
                style={{
                transition: isDraggingImage ? 'none' : 'transform 0.2s',
                cursor: isDraggingImage ? 'grabbing' : (zoomLevel > 100 ? 'grab' : 'default'),
                userSelect: 'none'
              }}
              draggable={false}
                unoptimized
              />
            </div>

            {/* Controls Overlay */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className="bg-background/90 backdrop-blur-sm px-3 py-1 rounded-lg flex items-center gap-2">
                <Mouse className="h-4 w-4" />
                <span className="text-sm font-medium">{zoomLevel}%</span>
              </div>
              {(zoomLevel > 100 || imagePosition.x !== 0 || imagePosition.y !== 0) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/90 backdrop-blur-sm hover:bg-background"
                  onClick={() => {
                    setZoomLevel(100)
                    setImagePosition({ x: 0, y: 0 })
                  }}
                  title="초기화"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="bg-background/90 backdrop-blur-sm hover:bg-background"
                onClick={() => {
                  setSelectedImage(null)
                  setZoomLevel(100)
                  setImagePosition({ x: 0, y: 0 })
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
              {imageHistory.map((img: ProjectImage) => (
                <div key={img.id} className="space-y-2">
                  <div className="relative w-full aspect-video">
                    <NextImage
                      src={img.url || img.file_url}
                      alt={`Version ${img.version}`}
                      fill
                      className="rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow object-cover"
                      unoptimized
                      onClick={async () => {
                        try {
                        // API 호출하여 현재 버전 설정
                        await imagesAPI.setCurrentImage(selectedScene.id, img.id)
                        
                        // 로컬 상태 업데이트
                        if (selectedHistoryType === 'lineart') {
                          setSelectedLineartVersion(img.version)
                        } else {
                          setSelectedArtVersion(img.version)
                        }
                        
                        // 전체 프로젝트 데이터를 다시 로드하여 이미지 정보 업데이트
                        await fetchProjectDetails()
                        
                        // 버전 정보 업데이트
                        if (selectedHistoryType === 'lineart') {
                          setSelectedLineartVersion(img.version)
                        } else {
                          setSelectedArtVersion(img.version)
                        }
                        
                        // 히스토리도 업데이트
                        const updatedHistory = imageHistory.map(histImg => ({
                          ...histImg,
                          is_current: histImg.id === img.id ? true :
                                    (histImg.type === img.type ? false : histImg.is_current)
                        }))
                        setImageHistory(updatedHistory)
                        
                        setShowHistory(false)
                        toast({
                          title: '버전 변경 완료',
                          description: `버전 ${img.version}으로 변경되었습니다.`
                        })
                      } catch {
                        toast({
                          title: '버전 변경 실패',
                          description: '버전 변경 중 오류가 발생했습니다.',
                          variant: 'destructive'
                        })
                      }
                    }}
                  />
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">버전 {img.version}</p>
                      {img.is_current && (
                        <Badge variant="default" className="text-xs">현재</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      {new Date(img.uploaded_at).toLocaleString()}
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
                <div className="relative w-full h-[calc(100%-40px)]">
                  <NextImage
                    src={compareImages.left.url || compareImages.left.file_url}
                    alt="Left comparison"
                    fill
                    className="object-contain rounded-lg"
                    unoptimized
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-center">현재 버전</h3>
              {compareImages.right && (
                <div className="relative w-full h-[calc(100%-40px)]">
                  <NextImage
                    src={compareImages.right.url || compareImages.right.file_url}
                    alt="Right comparison"
                    fill
                    className="object-contain rounded-lg"
                    unoptimized
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
      
      {/* Scene Play Modal */}
      {showScenePlay && (
        <ScenePlayModal
          scenes={scenes}
          imageType={imageViewMode === 'both' ? 'lineart' : imageViewMode}
          onClose={() => setShowScenePlay(false)}
        />
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
              // Create annotation comment with metadata
              const comment = await commentsAPI.createComment({
                projectId: projectId,
                sceneId: selectedScene?.id,
                content: `[ANNOTATION]${text || '주석을 남겼습니다'}`,
                metadata: {
                  annotation_image: canvasDataUrl,
                  original_image_id: annotationImage.id,
                  image_type: annotationImage.type
                }
              })
              
              setComments([...comments, comment])
              setShowAnnotation(false)
              setAnnotationImage(null)
              setAnnotationText('')
              
              toast({
                title: '주석 저장',
                description: '주석이 저장되었습니다.'
              })
            } catch {
              toast({
                title: '오류',
                description: '주석 저장에 실패했습니다.',
                variant: 'destructive'
              })
            }
          }}
        />
      )}
      
      {/* Annotation View Modal */}
      <AnnotationViewModal
        open={showAnnotationModal}
        onOpenChange={setShowAnnotationModal}
        annotation={annotationModalData}
      />
      
      {/* Studio project-specific modals */}
      {project.project_type === 'studio' && project.tag === 'storyboard' && (
        <>
          <OverallStoryModal
            open={showOverallStoryModal}
            onOpenChange={setShowOverallStoryModal}
            projectId={projectId}
            initialStory={overallStory}
            isReadOnly={false}
          />

          <SetListModal
            open={showSetListModal}
            onOpenChange={setShowSetListModal}
            projectId={projectId}
            initialSetList={setList}
            isReadOnly={false}
          />

          <CharacterListModal
            open={showCharacterListModal}
            onOpenChange={setShowCharacterListModal}
            projectId={projectId}
            initialCharacterList={characterList}
            isReadOnly={false}
          />

          {/* Scene Script (bottom panel) */}
          {selectedScene && (
            <SceneScript
              sceneId={selectedScene.id}
              sceneNumber={selectedScene.scene_number || scenes.indexOf(selectedScene) + 1}
              isReadOnly={false}
            />
          )}
        </>
      )}
    </div>
  )
}
