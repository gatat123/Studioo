'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ko } from 'date-fns/locale'
import { safeFormatDistanceToNow } from '@/lib/utils/date-helpers'
import { Send } from 'lucide-react'
import { socketClient } from '@/lib/socket/client'
import { useToast } from '@/hooks/use-toast'

interface Comment {
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
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // TODO: API 호출로 댓글 로드
    const mockComments: Comment[] = [
      {
        id: '1',
        userId: 'user1',
        userName: '김디자이너',
        content: '선화 작업 잘 진행되고 있네요!',
        createdAt: new Date(Date.now() - 1000 * 60 * 30)
      },
      {
        id: '2',
        userId: 'user2',
        userName: '박작가',
        content: '캐릭터 표정이 좀 더 밝았으면 좋겠어요.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2)
      }
    ]
    setComments(mockComments)
  }, [sceneId])

  // Socket.io 실시간 댓글 업데이트
  useEffect(() => {
    if (!sceneId) return

    const socket = socketClient.connect()

    // 댓글 생성 이벤트 핸들러
    const handleCommentCreated = (data: { comment: any, targetType: string, targetId: string }) => {
      console.log(`[SceneComments] Comment created event received:`, data)

      if (data.targetType === 'scene' && data.targetId === sceneId) {
        const newComment: Comment = {
          id: data.comment.id,
          userId: data.comment.userId,
          userName: data.comment.user?.nickname || '알 수 없는 사용자',
          userAvatar: data.comment.user?.profileImageUrl,
          content: data.comment.content,
          createdAt: data.comment.createdAt
        }

        setComments(prev => [newComment, ...prev])
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
    socket.on('comment:created', handleCommentCreated)
    socket.on('comment:updated', handleCommentUpdated)
    socket.on('comment:deleted', handleCommentDeleted)

    return () => {
      // 이벤트 리스너 제거
      socket.off('comment:created', handleCommentCreated)
      socket.off('comment:updated', handleCommentUpdated)
      socket.off('comment:deleted', handleCommentDeleted)
    }
  }, [sceneId])

  const handleSubmit = async () => {
    if (!newComment.trim()) return

    setIsLoading(true)
    try {
      // TODO: API 호출로 댓글 저장
      const comment: Comment = {
        id: Date.now().toString(),
        userId: 'current-user',
        userName: '현재 사용자',
        content: newComment,
        createdAt: new Date()
      }
      setComments([comment, ...comments])
      setNewComment('')
    } catch {
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
