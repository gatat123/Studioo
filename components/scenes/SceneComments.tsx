'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ko } from 'date-fns/locale'
import { safeFormatDistanceToNow } from '@/lib/utils/date-helpers'
import { Send } from 'lucide-react'
import { socketClient } from '@/lib/socket/client'
import { useToast } from '@/hooks/use-toast'
import { commentsAPI } from '@/lib/api/comments'

interface CommentDisplay {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  createdAt: string | Date
}

interface SceneCommentsProps {
  sceneId: string
}

export default function SceneComments({ sceneId }: SceneCommentsProps) {
  const [comments, setComments] = useState<CommentDisplay[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // 댓글 목록 로드 함수
  const loadComments = useCallback(async () => {
    try {
      const data = await commentsAPI.getSceneComments(sceneId)
      const formattedComments = data.map((c: any) => ({
        id: c.id,
        userId: c.user_id,
        userName: c.user?.nickname || c.user?.username || '알 수 없는 사용자',
        userAvatar: c.user?.profile_image_url,
        content: c.content,
        createdAt: c.created_at
      }))
      setComments(formattedComments)
    } catch (error) {
      console.error('[SceneComments] Error loading comments:', error)
    }
  }, [sceneId])

  // 초기 댓글 로드
  useEffect(() => {
    void loadComments()
  }, [loadComments])

  // 커스텀 이벤트 리스너 (comment:refresh)
  useEffect(() => {
    const handleRefresh = () => {
      console.log('[SceneComments] Refresh event received, reloading comments')
      void loadComments()
    }

    window.addEventListener('comment:refresh', handleRefresh)
    return () => window.removeEventListener('comment:refresh', handleRefresh)
  }, [loadComments])

  // Socket.io 실시간 댓글 업데이트
  useEffect(() => {
    if (!sceneId) return

    console.log('[SceneComments] 🔌 Setting up socket listeners for scene:', sceneId)

    const socket = socketClient.connect()

    console.log('[SceneComments] Socket connected:', socket.connected)
    console.log('[SceneComments] Socket ID:', socket.id)

    // 댓글 생성 이벤트 핸들러
    const handleCommentCreated = (data: { comment: any, targetType: string, targetId: string }) => {
      console.log(`[SceneComments] 🔔 comment:created event received:`, {
        targetType: data.targetType,
        targetId: data.targetId,
        currentSceneId: sceneId,
        match: data.targetType === 'scene' && data.targetId === sceneId,
        commentId: data.comment?.id
      })

      if (data.targetType === 'scene' && data.targetId === sceneId) {
        console.log('[SceneComments] ✅ Event matches current scene, adding comment')

        const newComment: CommentDisplay = {
          id: data.comment.id,
          userId: data.comment.userId,
          userName: data.comment.user?.nickname || '알 수 없는 사용자',
          userAvatar: data.comment.user?.profileImageUrl,
          content: data.comment.content,
          createdAt: data.comment.createdAt
        }

        setComments(prev => {
          console.log('[SceneComments] 📝 Adding new comment to state, current count:', prev.length)
          return [newComment, ...prev]
        })
      } else {
        console.log('[SceneComments] ⏭️  Event does not match current scene, ignoring')
      }
    }

    // 댓글 업데이트 이벤트 핸들러
    const handleCommentUpdated = (data: { comment: any, targetType: string, targetId: string }) => {
      console.log(`[SceneComments] Comment updated event received:`, data)

      if (data.targetType === 'scene' && data.targetId === sceneId) {
        setComments(prev => prev.map(comment =>
          comment.id === data.comment.id
            ? { ...comment, content: data.comment.content }
            : comment
        ))
      }
    }

    // 댓글 삭제 이벤트 핸들러
    const handleCommentDeleted = (data: { commentId: string, targetType: string, targetId: string }) => {
      console.log(`[SceneComments] Comment deleted event received:`, data)

      if (data.targetType === 'scene' && data.targetId === sceneId) {
        setComments(prev => prev.filter(comment => comment.id !== data.commentId))
      }
    }

    // 이벤트 리스너 등록
    console.log('[SceneComments] 📡 Registering socket event listeners')
    socket.on('comment:created', handleCommentCreated)
    socket.on('comment:new', handleCommentCreated) // 백엔드 호환성
    socket.on('comment:updated', handleCommentUpdated)
    socket.on('comment:deleted', handleCommentDeleted)

    console.log('[SceneComments] ✅ Socket event listeners registered')

    return () => {
      console.log('[SceneComments] 🧹 Cleaning up socket event listeners')
      // 이벤트 리스너 제거
      socket.off('comment:created', handleCommentCreated)
      socket.off('comment:new', handleCommentCreated)
      socket.off('comment:updated', handleCommentUpdated)
      socket.off('comment:deleted', handleCommentDeleted)
      console.log('[SceneComments] ✅ Socket event listeners removed')
    }
  }, [sceneId])

  const handleSubmit = async () => {
    if (!newComment.trim()) return

    setIsLoading(true)
    try {
      // API 호출로 댓글 저장
      const createdComment = await commentsAPI.createComment({
        sceneId,
        content: newComment
      })

      // 로컬 상태 업데이트 (낙관적 업데이트)
      const newCommentData: CommentDisplay = {
        id: createdComment.id,
        userId: createdComment.user_id,
        userName: createdComment.user?.nickname || '알 수 없는 사용자',
        userAvatar: createdComment.user?.profile_image_url,
        content: createdComment.content,
        createdAt: createdComment.created_at || new Date()
      }
      setComments([newCommentData, ...comments])
      setNewComment('')

      toast({
        title: '댓글 작성',
        description: '댓글이 성공적으로 작성되었습니다.',
      })
    } catch (error) {
      console.error('[SceneComments] Error creating comment:', error)
      toast({
        title: '오류',
        description: '댓글 작성에 실패했습니다.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Comment Input */}
      <div className="p-4 border-b">
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요..."
            className="min-h-[80px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSubmit()
              }
            }}
          />
        </div>
        <Button 
          className="mt-2 w-full"
          onClick={handleSubmit}
          disabled={!newComment.trim() || isLoading}
        >
          <Send className="h-4 w-4 mr-2" />
          댓글 작성
        </Button>
      </div>

      {/* Comments List */}
      <div className="flex-1 p-4 space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={comment.userAvatar} />
              <AvatarFallback>{comment.userName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{comment.userName}</span>
                <span className="text-xs text-muted-foreground">
                  {safeFormatDistanceToNow(typeof comment.createdAt === 'string' ? comment.createdAt : comment.createdAt.toISOString(), {
                    addSuffix: true,
                    locale: ko
                  })}
                </span>
              </div>
              <p className="text-sm">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
