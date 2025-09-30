'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import SceneNavigation from '@/components/scenes/SceneNavigation'
import ImageViewer from '@/components/scenes/ImageViewer'
import SceneSidebar from '@/components/scenes/SceneSidebar'
import SceneToolbar from '@/components/scenes/SceneToolbar'
import SceneDescription from '@/components/scenes/SceneDescription'
import { AnnotationTools } from '@/components/editor/AnnotationTools'
import { Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { socketClient } from '@/lib/socket/client'
import { useToast } from '@/hooks/use-toast'
import { scenesAPI } from '@/lib/api/scenes'

interface Scene {
  id: string
  name: string
  description: string
  images: {
    lineart: string | null
    art: string | null
  }
}

export default function SceneEditorPage() {
  const params = useParams()
  const projectId = params.id as string
  const sceneId = params.sceneId as string
  const { toast } = useToast()

  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false)
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [currentScene, setCurrentScene] = useState<Scene | null>(null)
  const [activeTab, setActiveTab] = useState('view')
  const [isSocketConnected, setIsSocketConnected] = useState(false)
  

  useEffect(() => {
    // 씬 데이터 로드
    const loadSceneData = async () => {
      setIsLoading(true)
      try {
        // API 호출로 실제 씬 데이터 로드
        const sceneData = await scenesAPI.getScene(projectId, sceneId)

        // 현재 활성화된 이미지 찾기
        const lineartImage = sceneData.images?.find(
          (img: any) => img.type === 'lineart' && (img.isCurrent || img.is_current)
        )
        const artImage = sceneData.images?.find(
          (img: any) => img.type === 'art' && (img.isCurrent || img.is_current)
        )

        setCurrentScene({
          id: sceneData.id,
          name: sceneData.title || `Scene ${sceneData.scene_number || sceneId}`,
          description: sceneData.description || '',
          images: {
            lineart: lineartImage?.fileUrl || lineartImage?.file_url || null,
            art: artImage?.fileUrl || artImage?.file_url || null
          }
        })

        console.log('[SceneEditor] Scene data loaded:', {
          sceneId,
          title: sceneData.title,
          sceneNumber: sceneData.scene_number,
          imagesCount: sceneData.images?.length || 0,
          lineartUrl: lineartImage?.file_url,
          artUrl: artImage?.file_url,
        })
        // Railway 빌드 캐시 갱신용 주석
      } catch (error) {
        console.error('[SceneEditor] Error loading scene data:', error)
        toast({
          title: '씬 로드 실패',
          description: '씬 데이터를 불러올 수 없습니다.',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }

    void loadSceneData()
  }, [sceneId, projectId, toast])

  // Socket.io 실시간 연결 및 이벤트 리스너
  useEffect(() => {
    if (!sceneId || !projectId) return

    const socket = socketClient.connect()

    // Socket 연결 상태 체크
    console.log(`[SceneEditor] Socket connection state:`, socket.connected)
    console.log(`[SceneEditor] Socket ID:`, socket.id)

    // 연결 핸들러
    const handleConnect = () => {
      console.log(`[SceneEditor] ✅ Socket connected! ID:`, socket.id)
      setIsSocketConnected(true)

      // 씬과 프로젝트 룸에 참가
      console.log(`[SceneEditor] Joining scene room: ${sceneId}`)
      console.log(`[SceneEditor] Joining project room: ${projectId}`)
      socket.emit('join_scene', { projectId, sceneId })
      socket.emit('join_project', { projectId })
    }

    // 연결 에러 핸들러
    const handleConnectError = (error: any) => {
      console.error(`[SceneEditor] ❌ Socket connection error:`, error)
      setIsSocketConnected(false)
    }

    // 연결 해제 핸들러
    const handleDisconnect = (reason: string) => {
      console.log(`[SceneEditor] ❌ Socket disconnected, reason:`, reason)
      setIsSocketConnected(false)
    }

    // 씬 룸 참가 성공 핸들러
    const handleJoinedScene = (data: any) => {
      console.log(`[SceneEditor] ✅ Successfully joined scene room:`, data)
    }

    // 프로젝트 룸 참가 성공 핸들러
    const handleJoinedProject = (data: any) => {
      console.log(`[SceneEditor] ✅ Successfully joined project room:`, data)
    }

    // 댓글 생성 이벤트 핸들러 (새로운 이벤트 추가)
    const handleCommentNew = (data: { comment: any, targetType: string, targetId: string, timestamp: Date }) => {
      console.log(`[SceneEditor] ✅ New comment event received:`, data)

      if (data.targetType === 'scene' && data.targetId === sceneId) {
        toast({
          title: '새 댓글',
          description: `${data.comment.user?.nickname || '사용자'}님이 댓글을 작성했습니다.`,
        })
        // SceneComments 컴포넌트에서 자동으로 새로고침하도록 커스텀 이벤트 발송
        window.dispatchEvent(new CustomEvent('comment:refresh'))
      }
    }

    // 이미지 업로드 이벤트 핸들러
    const handleImageUploaded = (data: { image: any, sceneId: string }) => {
      console.log(`[SceneEditor] ✅ Image uploaded event received:`, data)

      if (data.sceneId === sceneId) {
        // 현재 씬 데이터 업데이트
        setCurrentScene(prev => {
          if (!prev) return prev
          return {
            ...prev,
            images: {
              ...prev.images,
              [data.image.type]: data.image.fileUrl
            }
          }
        })

        toast({
          title: '이미지 업로드 완료',
          description: `새로운 ${data.image.type === 'lineart' ? '선화' : '아트'} 이미지가 업로드되었습니다.`,
        })
      }
    }

    // 이미지 업데이트 이벤트 핸들러
    const handleImageUpdated = (data: { image: any, sceneId: string }) => {
      console.log(`[SceneEditor] ✅ Image updated event received:`, data)

      if (data.sceneId === sceneId) {
        setCurrentScene(prev => {
          if (!prev) return prev
          return {
            ...prev,
            images: {
              ...prev.images,
              [data.image.type]: data.image.fileUrl
            }
          }
        })

        toast({
          title: '이미지 업데이트 완료',
          description: `${data.image.type === 'lineart' ? '선화' : '아트'} 이미지가 업데이트되었습니다.`,
        })
      }
    }

    // 댓글 생성 이벤트 핸들러
    const handleCommentCreated = (data: { comment: any, targetType: string, targetId: string }) => {
      console.log(`[SceneEditor] ✅ Comment created event received:`, data)

      if (data.targetType === 'scene' && data.targetId === sceneId) {
        toast({
          title: '새 댓글',
          description: `${data.comment.user?.nickname || '사용자'}님이 댓글을 작성했습니다.`,
        })
      }
    }

    // 댓글 업데이트 이벤트 핸들러
    const handleCommentUpdated = (data: { comment: any, targetType: string, targetId: string }) => {
      console.log(`[SceneEditor] ✅ Comment updated event received:`, data)

      if (data.targetType === 'scene' && data.targetId === sceneId) {
        toast({
          title: '댓글 수정',
          description: '댓글이 수정되었습니다.',
        })
      }
    }

    // 댓글 삭제 이벤트 핸들러
    const handleCommentDeleted = (data: { commentId: string, targetType: string, targetId: string }) => {
      console.log(`[SceneEditor] ✅ Comment deleted event received:`, data)

      if (data.targetType === 'scene' && data.targetId === sceneId) {
        toast({
          title: '댓글 삭제',
          description: '댓글이 삭제되었습니다.',
        })
      }
    }

    // 씬 업데이트 이벤트 핸들러
    const handleSceneUpdated = (data: { scene: any, sceneId: string }) => {
      console.log(`[SceneEditor] ✅ Scene updated event received:`, data)

      if (data.sceneId === sceneId) {
        setCurrentScene(prev => {
          if (!prev) return prev
          return {
            ...prev,
            name: data.scene.name || prev.name,
            description: data.scene.description || prev.description
          }
        })

        toast({
          title: '씬 업데이트',
          description: '씬 정보가 업데이트되었습니다.',
        })
      }
    }

    // 연결 상태에 따라 처리
    if (socket.connected) {
      handleConnect()
    } else {
      socket.on('connect', handleConnect)
    }

    // 이벤트 리스너 등록
    socket.on('connect_error', handleConnectError)
    socket.on('disconnect', handleDisconnect)
    socket.on('scene_joined', handleJoinedScene)
    socket.on('project_joined', handleJoinedProject)
    socket.on('scene:image-uploaded', handleImageUploaded)
    socket.on('image:upload', handleImageUploaded)
    socket.on('scene:image-updated', handleImageUpdated)
    socket.on('comment:created', handleCommentCreated)
    socket.on('comment:new', handleCommentNew)
    socket.on('comment:updated', handleCommentUpdated)
    socket.on('comment:deleted', handleCommentDeleted)
    socket.on('scene:updated', handleSceneUpdated)

    console.log(`[SceneEditor] 📡 All event listeners registered for scene: ${sceneId}`)

    return () => {
      console.log(`[SceneEditor] 🚪 Cleaning up and leaving rooms`)

      // 이벤트 리스너 제거
      socket.off('connect', handleConnect)
      socket.off('connect_error', handleConnectError)
      socket.off('disconnect', handleDisconnect)
      socket.off('scene_joined', handleJoinedScene)
      socket.off('project_joined', handleJoinedProject)
      socket.off('scene:image-uploaded', handleImageUploaded)
      socket.off('image:upload', handleImageUploaded)
      socket.off('scene:image-updated', handleImageUpdated)
      socket.off('comment:created', handleCommentCreated)
      socket.off('comment:new', handleCommentNew)
      socket.off('comment:updated', handleCommentUpdated)
      socket.off('comment:deleted', handleCommentDeleted)
      socket.off('scene:updated', handleSceneUpdated)

      // 룸 떠나기
      socket.emit('leave_room', { roomId: `scene:${sceneId}` })
      socket.emit('leave_room', { roomId: `project:${projectId}` })

      console.log(`[SceneEditor] 📡 Event listeners removed and rooms left`)
    }
  }, [sceneId, projectId, toast])

  // 키보드 단축키 핸들러
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + 1: 왼쪽 사이드바 토글
      if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault()
        setIsLeftSidebarOpen(prev => !prev)
      }
      // Ctrl/Cmd + 2: 오른쪽 사이드바 토글
      if ((e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault()
        setIsRightSidebarOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Scene Navigation Tabs */}
      <SceneNavigation 
        projectId={projectId} 
        currentSceneId={sceneId}
      />
      
      {/* Main Editor Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tools (Collapsible) */}
        <SceneToolbar 
          isOpen={isLeftSidebarOpen}
          onToggle={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        />
        
        {/* Central Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b">
              <TabsList className="justify-start rounded-none border-none">
                <TabsTrigger value="view">뷰어</TabsTrigger>
                <TabsTrigger value="annotate">주석</TabsTrigger>
              </TabsList>
              <div className="px-4">
                <Badge variant={isSocketConnected ? "default" : "destructive"} className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${isSocketConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                  {isSocketConnected ? '실시간 연결됨' : '연결 끊김'}
                </Badge>
              </div>
            </div>
            
            {/* View Tab */}
            <TabsContent value="view" className="flex-1 flex flex-col mt-0">
              <div className="flex-1 relative bg-muted/30">
                <ImageViewer 
                  sceneId={sceneId}
                  lineartImage={currentScene?.images?.lineart}
                  artImage={currentScene?.images?.art}
                />
              </div>
            </TabsContent>
            
            {/* Annotation Tab */}
            <TabsContent value="annotate" className="flex-1 flex flex-col mt-0 p-4">
              <AnnotationTools
                imageUrl={currentScene?.images?.art || currentScene?.images?.lineart}
                width={800}
                height={600}
                onSave={(_shapes) => {
                  // TODO: Save annotations to backend
                }}
              />
            </TabsContent>
          </Tabs>
          
          {/* Bottom Panel - Scene Description */}
          <SceneDescription 
            sceneId={sceneId}
            initialDescription={currentScene?.description}
          />
        </div>
        
        {/* Right Sidebar - Comments/History */}
        <SceneSidebar 
          isOpen={isRightSidebarOpen}
          onToggle={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
          sceneId={sceneId}
        />
      </div>
    </div>
  )
}
