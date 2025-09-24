'use client'

import { useState, useEffect } from 'react'
import { Plus, Check, X, Trash2, Clock, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/useAuthStore'
import { workTasksAPI, WorkTask, WorkTaskComment } from '@/lib/api/work-tasks'

interface TodoListProps {
  searchQuery?: string
  onCommentCreated?: () => void
}

export default function TodoList({ searchQuery, onCommentCreated }: TodoListProps) {
  const { toast } = useToast()
  const { user: currentUser } = useAuthStore()
  const [tasks, setTasks] = useState<WorkTask[]>([])
  const [loading, setLoading] = useState(true)
  const [newComments, setNewComments] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [selectedTask, setSelectedTask] = useState<WorkTask | null>(null)
  const [activeTab, setActiveTab] = useState('my')

  useEffect(() => {
    loadTasks()
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadTasks = async () => {
    try {
      setLoading(true)
      const data = await workTasksAPI.getWorkTasks()

      // Filter tasks based on activeTab
      const filteredTasks = activeTab === 'my'
        ? data.filter(task =>
            task.createdById === currentUser?.id ||
            task.participants?.some(p => p.userId === currentUser?.id)
          )
        : data.filter(task =>
            // Team tasks: exclude tasks created by current user
            task.createdById !== currentUser?.id
          )

      setTasks(filteredTasks)
    } catch (error) {
      console.error('Failed to load work tasks:', error)
      toast({
        title: '업무 불러오기 실패',
        description: '업무 목록을 불러올 수 없습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateComment = async (taskId: string) => {
    const commentText = newComments[taskId] || ''
    if (!commentText.trim()) {
      toast({
        title: '입력 오류',
        description: '댓글 내용을 입력해주세요.',
        variant: 'destructive'
      })
      return
    }

    try {
      const newCommentObj = await workTasksAPI.addComment(taskId, commentText)

      // Update the task with the new comment
      setTasks(tasks.map(task =>
        task.id === taskId
          ? { ...task, comments: [...(task.comments || []), newCommentObj] }
          : task
      ))

      // Clear the comment for this specific task
      setNewComments(prev => ({ ...prev, [taskId]: '' }))

      // Call the parent callback to refresh data
      if (onCommentCreated) {
        onCommentCreated()
      }

      toast({
        title: '댓글 추가 완료',
        description: '새 댓글이 추가되었습니다.',
      })
    } catch (error) {
      console.error('Failed to create comment:', error)
      toast({
        title: '댓글 추가 실패',
        description: '댓글을 추가할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateComment = async (taskId: string, commentId: string) => {
    if (!editContent.trim()) {
      toast({
        title: '입력 오류',
        description: '댓글 내용을 입력해주세요.',
        variant: 'destructive'
      })
      return
    }

    try {
      const updatedComment = await workTasksAPI.updateComment(taskId, commentId, editContent)

      // Update the task with the updated comment
      setTasks(tasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              comments: task.comments?.map(comment =>
                comment.id === commentId ? updatedComment : comment
              ) || []
            }
          : task
      ))

      setEditingId(null)
      setEditContent('')
      toast({
        title: '댓글 수정 완료',
        description: '댓글이 수정되었습니다.',
      })
    } catch (error) {
      console.error('Failed to update comment:', error)
      toast({
        title: '댓글 수정 실패',
        description: '댓글을 수정할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteComment = async (taskId: string, commentId: string) => {
    try {
      await workTasksAPI.deleteComment(taskId, commentId)

      // Update the task by removing the comment
      setTasks(tasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              comments: task.comments?.filter(comment => comment.id !== commentId) || []
            }
          : task
      ))

      toast({
        title: '댓글 삭제 완료',
        description: '댓글이 삭제되었습니다.',
      })
    } catch (error) {
      console.error('Failed to delete comment:', error)
      toast({
        title: '댓글 삭제 실패',
        description: '댓글을 삭제할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true
    return task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           task.comments?.some(comment =>
             comment.content.toLowerCase().includes(searchQuery.toLowerCase())
           )
  })

  const activeTasks = filteredTasks.filter(task =>
    task.status === 'pending' || task.status === 'in_progress'
  )
  const completedTasks = filteredTasks.filter(task =>
    task.status === 'completed'
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60))
      return `${minutes}분 전`
    } else if (hours < 24) {
      return `${hours}시간 전`
    } else {
      const days = Math.floor(hours / 24)
      if (days < 7) {
        return `${days}일 전`
      } else {
        return date.toLocaleDateString()
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="my">내 업무</TabsTrigger>
          <TabsTrigger value="team">팀 업무</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>
                {activeTab === 'my' ? '내 업무 댓글' : '팀 업무 댓글'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'my'
                  ? '내가 생성하거나 참여중인 업무의 댓글을 관리하세요.'
                  : '다른 팀원이 생성한 업무의 댓글과 진행 상황을 확인하세요.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[calc(100%-5rem)]">
              <ScrollArea className="h-full">
                <div className="space-y-6">
                  {activeTasks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        진행중인 업무 ({activeTasks.length})
                      </h4>
                      <div className="space-y-4">
                        {activeTasks.map((task) => (
                          <Card key={task.id} className="bg-white border">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-sm font-medium">
                                    {task.title}
                                  </CardTitle>
                                  {task.description && (
                                    <CardDescription className="text-xs mt-1">
                                      {task.description}
                                    </CardDescription>
                                  )}
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full
                                      ${task.status === 'pending' ? 'bg-gray-100 text-gray-700' :
                                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                        task.status === 'review' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-green-100 text-green-700'}`}>
                                      {task.status === 'pending' ? '대기' :
                                       task.status === 'in_progress' ? '진행중' :
                                       task.status === 'review' ? '검토' : '완료'}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full
                                      ${task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                        task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-green-100 text-green-700'}`}>
                                      {task.priority === 'urgent' ? '긴급' :
                                       task.priority === 'high' ? '높음' :
                                       task.priority === 'medium' ? '보통' : '낮음'}
                                    </span>
                                    {task.comments && (
                                      <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <MessageSquare className="h-3 w-3" />
                                        {task.comments.length}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardHeader>

                            <CardContent className="pt-0">
                              {/* Comments Section */}
                              {task.comments && task.comments.length > 0 && (
                                <div className="space-y-2 mb-3">
                                  {task.comments.map((comment) => (
                                    <div key={comment.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={comment.user.profileImageUrl} />
                                        <AvatarFallback>
                                          {comment.user.nickname.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      {editingId === comment.id ? (
                                        <div className="flex-1 flex gap-2">
                                          <Input
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="flex-1 h-7 text-xs"
                                            autoFocus
                                          />
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={() => handleUpdateComment(task.id, comment.id)}
                                          >
                                            <Check className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={() => {
                                              setEditingId(null)
                                              setEditContent('')
                                            }}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="flex-1">
                                          <p
                                            className="text-xs cursor-pointer"
                                            onClick={() => {
                                              if (comment.userId === currentUser?.id) {
                                                setEditingId(comment.id)
                                                setEditContent(comment.content)
                                              }
                                            }}
                                          >
                                            {comment.content}
                                          </p>
                                          <div className="flex items-center justify-between mt-1">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-gray-500">{comment.user.nickname}</span>
                                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDate(comment.createdAt)}
                                              </span>
                                            </div>
                                            {comment.userId === currentUser?.id && (
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-5 w-5 text-red-600 hover:text-red-700"
                                                onClick={() => handleDeleteComment(task.id, comment.id)}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Add Comment Input */}
                              <div className="flex gap-2">
                                <Input
                                  placeholder="댓글 추가..."
                                  value={newComments[task.id] || ''}
                                  onChange={(e) => setNewComments(prev => ({ ...prev, [task.id]: e.target.value }))}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleCreateComment(task.id)
                                    }
                                  }}
                                  className="flex-1 h-8 text-xs"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleCreateComment(task.id)}
                                  className="h-8"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {completedTasks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-3">
                        완료된 업무 ({completedTasks.length})
                      </h4>
                      <div className="space-y-4 opacity-75">
                        {completedTasks.map((task) => (
                          <Card key={task.id} className="bg-gray-50 border-gray-200">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-medium text-gray-600">
                                {task.title}
                              </CardTitle>
                              {task.description && (
                                <CardDescription className="text-xs">
                                  {task.description}
                                </CardDescription>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                  완료
                                </span>
                                {task.comments && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {task.comments.length}
                                  </span>
                                )}
                              </div>
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredTasks.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">
                        {activeTab === 'my'
                          ? '내가 생성하거나 참여중인 업무가 없습니다.'
                          : '다른 팀원이 생성한 업무가 없습니다.'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  )
}