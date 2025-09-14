'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, MessageSquare, PenTool, Image as ImageIcon, Layers, FileText, RefreshCw } from 'lucide-react'
import { socketClient } from '@/lib/socket/client'
import { SOCKET_EVENTS, type HistoryUpdatePayload, type CommentEventPayload } from '@/lib/socket/events'
import { commentsAPI } from '@/lib/api/comments'
import { useToast } from '@/hooks/use-toast'
import type { Comment } from '@/types'
import { format, isToday, isYesterday, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'

interface HistorySectionProps {
  projectId: string
  sceneId?: string
  comments: Comment[]
  onCommentsUpdate: (comments: Comment[]) => void
  onAnnotationClick?: (annotation: { image: string; text: string }) => void
}

interface HistoryItem {
  id: string
  type: 'comment' | 'scene' | 'image' | 'annotation' | 'system'
  content: string
  user?: {
    id?: string
    nickname?: string
    username?: string
  }
  timestamp: string
  metadata?: Record<string, unknown>
  isNew?: boolean
}

export function HistorySection({
  projectId,
  sceneId,
  comments: initialComments,
  onCommentsUpdate,
  onAnnotationClick
}: HistorySectionProps) {
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Map<string, { nickname: string; timeout: NodeJS.Timeout }>>(new Map())
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const lastCommentCountRef = useRef(initialComments.length)

  // Convert comments to history items
  const convertCommentsToHistory = useCallback((comments: Comment[]): HistoryItem[] => {
    return comments.map(comment => {
      const isAnnotation = comment.content?.startsWith('[ANNOTATION]')
      const displayContent = isAnnotation
        ? comment.content.substring(12) || '주석을 남겼습니다'
        : comment.content

      return {
        id: comment.id,
        type: isAnnotation ? 'annotation' : 'comment',
        content: displayContent,
        user: comment.user || comment.author,
        timestamp: comment.createdAt,
        metadata: comment.metadata,
        isNew: false
      } as HistoryItem
    })
  }, [])

  // Initialize history items from comments
  useEffect(() => {
    const items = convertCommentsToHistory(initialComments)
    setHistoryItems(items)
    setComments(initialComments)
    lastCommentCountRef.current = initialComments.length
  }, [initialComments, convertCommentsToHistory])

  // Setup Socket.io event listeners
  useEffect(() => {
    if (!socketClient.isConnected()) {
      socketClient.connect()
    }

    // Join project room
    socketClient.joinProject(projectId)

    // History update listener
    const handleHistoryUpdate = (payload: HistoryUpdatePayload) => {
      if (payload.projectId !== projectId) return

      const newItem: HistoryItem = {
        id: payload.data.id,
        type: payload.type,
        content: payload.data.content || `${payload.type} ${payload.action}`,
        user: payload.data.user,
        timestamp: payload.data.timestamp,
        metadata: payload.data.metadata,
        isNew: true
      }

      setHistoryItems(prev => [...prev, newItem])

      // Auto-scroll to bottom for new items
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight
          }
        }
      }, 100)
    }

    // Comment event listeners
    const handleNewComment = async (payload: CommentEventPayload) => {
      if (payload.projectId !== projectId) return

      // Refetch comments to ensure data consistency
      try {
        const updatedComments = await commentsAPI.getProjectComments(projectId)
        setComments(updatedComments)
        onCommentsUpdate(updatedComments)

        // Add to history
        const newComment = updatedComments.find(c => c.id === payload.comment.id)
        if (newComment) {
          const historyItem: HistoryItem = {
            id: newComment.id,
            type: newComment.content?.startsWith('[ANNOTATION]') ? 'annotation' : 'comment',
            content: newComment.content?.startsWith('[ANNOTATION]')
              ? newComment.content.substring(12) || '주석을 남겼습니다'
              : newComment.content,
            user: newComment.user || newComment.author,
            timestamp: newComment.createdAt,
            metadata: newComment.metadata,
            isNew: true
          }

          setHistoryItems(prev => [...prev, historyItem])
        }

        // Show notification if from another user
        if (payload.user?.id !== localStorage.getItem('userId')) {
          toast({
            title: '새 댓글',
            description: `${payload.user?.nickname || '누군가'}님이 댓글을 작성했습니다.`
          })
        }
      } catch (error) {
        console.error('Failed to fetch updated comments:', error)
      }
    }

    const handleCommentUpdate = async (payload: CommentEventPayload) => {
      if (payload.projectId !== projectId) return

      // Update local comment
      setComments(prev => prev.map(c =>
        c.id === payload.comment.id ? payload.comment : c
      ))

      // Update history item
      setHistoryItems(prev => prev.map(item =>
        item.id === payload.comment.id
          ? { ...item, content: payload.comment.content, metadata: payload.comment.metadata }
          : item
      ))
    }

    const handleCommentDelete = (payload: { projectId: string; commentId: string }) => {
      if (payload.projectId !== projectId) return

      // Remove from comments
      setComments(prev => prev.filter(c => c.id !== payload.commentId))

      // Mark as deleted in history (don't remove, keep for audit)
      setHistoryItems(prev => prev.map(item =>
        item.id === payload.commentId
          ? { ...item, content: '[삭제된 댓글]', type: 'system' as const }
          : item
      ))
    }

    // Typing indicator listeners
    const handleTypingStart = (payload: { projectId: string; userId: string; user: { nickname?: string }; location: string }) => {
      if (payload.projectId !== projectId) return
      if (payload.userId === localStorage.getItem('userId')) return

      // Clear existing timeout if any
      const existing = typingUsers.get(payload.userId)
      if (existing?.timeout) {
        clearTimeout(existing.timeout)
      }

      // Set typing user with auto-clear timeout
      const timeout = setTimeout(() => {
        setTypingUsers(prev => {
          const next = new Map(prev)
          next.delete(payload.userId)
          return next
        })
      }, 3000)

      setTypingUsers(prev => {
        const next = new Map(prev)
        next.set(payload.userId, {
          nickname: payload.user?.nickname || 'Someone',
          timeout
        })
        return next
      })
    }

    const handleTypingStop = (payload: { projectId: string; userId: string }) => {
      if (payload.projectId !== projectId) return

      setTypingUsers(prev => {
        const next = new Map(prev)
        const existing = next.get(payload.userId)
        if (existing?.timeout) {
          clearTimeout(existing.timeout)
        }
        next.delete(payload.userId)
        return next
      })
    }

    // Register all event listeners
    socketClient.on(SOCKET_EVENTS.HISTORY_UPDATE, handleHistoryUpdate)
    socketClient.on(SOCKET_EVENTS.COMMENT_NEW, handleNewComment)
    socketClient.on(SOCKET_EVENTS.COMMENT_UPDATE, handleCommentUpdate)
    socketClient.on(SOCKET_EVENTS.COMMENT_DELETE, handleCommentDelete)
    socketClient.on(SOCKET_EVENTS.TYPING_START, handleTypingStart)
    socketClient.on(SOCKET_EVENTS.TYPING_STOP, handleTypingStop)

    // Cleanup
    return () => {
      socketClient.off(SOCKET_EVENTS.HISTORY_UPDATE, handleHistoryUpdate)
      socketClient.off(SOCKET_EVENTS.COMMENT_NEW, handleNewComment)
      socketClient.off(SOCKET_EVENTS.COMMENT_UPDATE, handleCommentUpdate)
      socketClient.off(SOCKET_EVENTS.COMMENT_DELETE, handleCommentDelete)
      socketClient.off(SOCKET_EVENTS.TYPING_START, handleTypingStart)
      socketClient.off(SOCKET_EVENTS.TYPING_STOP, handleTypingStop)

      // Clear all typing timeouts
      typingUsers.forEach(user => {
        if (user.timeout) clearTimeout(user.timeout)
      })
    }
  }, [projectId, onCommentsUpdate, toast, typingUsers])

  // Handle comment input typing
  const handleCommentChange = (value: string) => {
    setNewComment(value)

    if (value && !isTyping) {
      setIsTyping(true)
      socketClient.emit(SOCKET_EVENTS.TYPING_START, {
        projectId,
        userId: localStorage.getItem('userId') || '',
        user: {
          id: localStorage.getItem('userId'),
          nickname: localStorage.getItem('userNickname')
        },
        location: 'comments',
        isTyping: true
      })
    } else if (!value && isTyping) {
      setIsTyping(false)
      socketClient.emit(SOCKET_EVENTS.TYPING_STOP, {
        projectId,
        userId: localStorage.getItem('userId') || '',
        user: {
          id: localStorage.getItem('userId'),
          nickname: localStorage.getItem('userNickname')
        },
        location: 'comments',
        isTyping: false
      })
    }
  }

  // Submit comment
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return

    setIsSubmitting(true)
    setIsTyping(false)

    // Emit typing stop
    socketClient.emit(SOCKET_EVENTS.TYPING_STOP, {
      projectId,
      userId: localStorage.getItem('userId') || '',
      user: {
        id: localStorage.getItem('userId'),
        nickname: localStorage.getItem('userNickname')
      },
      location: 'comments',
      isTyping: false
    })

    try {
      const comment = await commentsAPI.createComment({
        projectId,
        sceneId,
        content: newComment
      })

      // Optimistically add to local state
      setComments(prev => [...prev, comment])
      onCommentsUpdate([...comments, comment])

      // Add to history
      const historyItem: HistoryItem = {
        id: comment.id,
        type: 'comment',
        content: comment.content,
        user: comment.user || comment.author,
        timestamp: comment.createdAt,
        metadata: comment.metadata,
        isNew: false
      }
      setHistoryItems(prev => [...prev, historyItem])

      // Emit to other users
      socketClient.emit(SOCKET_EVENTS.COMMENT_NEW, {
        projectId,
        sceneId,
        comment,
        user: comment.user || comment.author
      })

      setNewComment('')

      // Auto-scroll to bottom
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight
          }
        }
      }, 100)

    } catch (error) {
      console.error('Failed to submit comment:', error)
      toast({
        title: '오류',
        description: '댓글 작성에 실패했습니다.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)

    if (isToday(date)) {
      return `오늘 ${format(date, 'HH:mm', { locale: ko })}`
    } else if (isYesterday(date)) {
      return `어제 ${format(date, 'HH:mm', { locale: ko })}`
    } else if (differenceInDays(new Date(), date) < 7) {
      return format(date, 'EEEE HH:mm', { locale: ko })
    } else {
      return format(date, 'MM월 dd일 HH:mm', { locale: ko })
    }
  }

  // Get icon for history item type
  const getHistoryIcon = (type: HistoryItem['type']) => {
    switch (type) {
      case 'annotation':
        return <PenTool className="h-3 w-3" />
      case 'scene':
        return <Layers className="h-3 w-3" />
      case 'image':
        return <ImageIcon className="h-3 w-3" />
      case 'system':
        return <FileText className="h-3 w-3" />
      default:
        return <MessageSquare className="h-3 w-3" />
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">히스토리</h3>
          <Badge variant="outline">{historyItems.length}</Badge>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={async () => {
            try {
              const updatedComments = await commentsAPI.getProjectComments(projectId)
              setComments(updatedComments)
              onCommentsUpdate(updatedComments)
              const items = convertCommentsToHistory(updatedComments)
              setHistoryItems(items)
              toast({
                title: '새로고침 완료',
                description: '히스토리가 업데이트되었습니다.'
              })
            } catch (error) {
              console.error('Failed to refresh:', error)
              toast({
                title: '오류',
                description: '새로고침에 실패했습니다.',
                variant: 'destructive'
              })
            }
          }}
          title="새로고침"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* History List */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-4">
          {historyItems.length > 0 ? (
            historyItems.map((item, index) => {
              const isAnnotation = item.type === 'annotation'
              const isSystem = item.type === 'system'

              return (
                <div
                  key={`${item.id}-${index}`}
                  className={`flex gap-3 ${item.isNew ? 'animate-in slide-in-from-bottom-2 duration-300' : ''}`}
                >
                  {!isSystem && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs">
                        {item.user?.nickname?.[0]?.toUpperCase() ||
                         item.user?.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {!isSystem && (
                        <p className="text-sm font-medium">
                          {item.user?.nickname || item.user?.username || 'Unknown'}
                        </p>
                      )}
                      <Badge variant={isSystem ? 'secondary' : item.type === 'annotation' ? 'default' : 'outline'} className="text-xs">
                        <span className="mr-1">{getHistoryIcon(item.type)}</span>
                        {item.type === 'comment' ? '댓글' :
                         item.type === 'annotation' ? '주석' :
                         item.type === 'scene' ? '씬' :
                         item.type === 'image' ? '이미지' :
                         '시스템'}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(item.timestamp)}
                      </p>
                    </div>

                    {isAnnotation && item.metadata?.annotationImage ? (
                      <div
                        className="cursor-pointer hover:bg-accent/50 rounded p-2 transition-colors inline-block"
                        onClick={() => {
                          if (onAnnotationClick && item.metadata?.annotationImage) {
                            onAnnotationClick({
                              image: item.metadata.annotationImage as string,
                              text: item.content
                            })
                          }
                        }}
                      >
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          {item.content} (클릭하여 보기)
                        </p>
                      </div>
                    ) : (
                      <p className={`text-sm ${isSystem ? 'text-muted-foreground italic' : ''} break-words`}>
                        {item.content}
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">아직 히스토리가 없습니다</p>
              <p className="text-xs text-muted-foreground mt-1">첫 활동을 시작해보세요</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Typing Indicators */}
      {typingUsers.size > 0 && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-t bg-muted/50">
          {Array.from(typingUsers.values()).map(user => user.nickname).join(', ')}님이 입력 중...
        </div>
      )}

      {/* Comment Input */}
      <div className="border-t bg-background p-4">
        <div className="flex items-end gap-2">
          <Textarea
            placeholder={sceneId ? '댓글을 입력하세요...' : '프로젝트에 댓글을 남기세요...'}
            value={newComment}
            onChange={(e) => handleCommentChange(e.target.value)}
            onBlur={() => {
              if (isTyping) {
                setIsTyping(false)
                socketClient.emit(SOCKET_EVENTS.TYPING_STOP, {
                  projectId,
                  userId: localStorage.getItem('userId') || '',
                  user: {
                    id: localStorage.getItem('userId'),
                    nickname: localStorage.getItem('userNickname')
                  },
                  location: 'comments',
                  isTyping: false
                })
              }
            }}
            className="flex-1 min-h-[60px] max-h-[120px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault()
                handleSubmitComment()
              }
            }}
          />
          <Button
            onClick={handleSubmitComment}
            disabled={isSubmitting || !newComment.trim()}
            size="lg"
            className="h-[60px] px-4"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Ctrl+Enter로 전송
        </p>
      </div>
    </div>
  )
}