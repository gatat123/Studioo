'use client'

import { useState, useEffect } from 'react'
import { Plus, MoreVertical, Calendar, ChevronRight, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/useAuthStore'
import { workTasksAPI, WorkTask } from '@/lib/api/work-tasks'
import { socketClient } from '@/lib/socket/client'

interface TaskBoardProps {
  searchQuery?: string
  onTaskCreated?: () => void
  onTaskUpdate?: () => void
}

const TASK_COLUMNS = [
  { id: 'pending', title: '할 일', color: 'bg-gray-100' },
  { id: 'in_progress', title: '진행중', color: 'bg-blue-50' },
  { id: 'review', title: '검토', color: 'bg-yellow-50' },
  { id: 'completed', title: '완료', color: 'bg-green-50' },
]

export default function TaskBoard({ searchQuery, onTaskCreated, onTaskUpdate }: TaskBoardProps) {
  const { toast } = useToast()
  const { user: _user } = useAuthStore()
  const [tasks, setTasks] = useState<WorkTask[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedTask, setDraggedTask] = useState<WorkTask | null>(null)
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null)

  useEffect(() => {
    loadTasks()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Socket.io listeners for real-time updates
  useEffect(() => {
    const socket = socketClient.connect()

    const handleReloadTasks = () => {
      loadTasks()
      // Also notify parent component about the update
      if (onTaskUpdate) {
        onTaskUpdate()
      }
    }

    socket.on('task:created', handleReloadTasks)
    socket.on('task:updated', handleReloadTasks)
    socket.on('task:deleted', handleReloadTasks)
    socket.on('work-task:updated', handleReloadTasks)
    socket.on('work-task:deleted', handleReloadTasks)

    return () => {
      socket.off('task:created', handleReloadTasks)
      socket.off('task:updated', handleReloadTasks)
      socket.off('task:deleted', handleReloadTasks)
      socket.off('work-task:updated', handleReloadTasks)
      socket.off('work-task:deleted', handleReloadTasks)
    }
  }, [onTaskUpdate]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadTasks = async () => {
    try {
      setLoading(true)
      const data = await workTasksAPI.getWorkTasks()
      setTasks(data)
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


  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const updatedTask = await workTasksAPI.updateWorkTask(taskId, {
        status: newStatus as 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled'
      })

      setTasks(tasks.map(task =>
        task.id === taskId ? updatedTask : task
      ))
      toast({
        title: '업무 상태 변경',
        description: '업무 상태가 업데이트되었습니다.',
      })

      // Call the onTaskUpdate callback to refresh parent component
      if (onTaskUpdate) {
        onTaskUpdate()
      }
    } catch (error) {
      console.error('Failed to update task status:', error)
      toast({
        title: '상태 변경 실패',
        description: '업무 상태를 변경할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await workTasksAPI.deleteWorkTask(taskId)
      setTasks(tasks.filter(task => task.id !== taskId))
      toast({
        title: '업무 삭제 완료',
        description: '업무가 삭제되었습니다.',
      })

      // Call the onTaskUpdate callback to refresh parent component
      if (onTaskUpdate) {
        onTaskUpdate()
      }
    } catch (error) {
      console.error('Failed to delete work task:', error)
      toast({
        title: '업무 삭제 실패',
        description: '업무를 삭제할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }


  const handleDragStart = (e: React.DragEvent, task: WorkTask) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    if (draggedTask && draggedTask.status !== status) {
      handleUpdateTaskStatus(draggedTask.id, status)
    }
    setDraggedTask(null)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-700 bg-red-100 border-red-300'
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const filteredTasks = tasks.filter(task => {
    // Filter by selected participant
    if (selectedParticipant) {
      const hasParticipant = task.participants?.some(p => p.userId === selectedParticipant)
      if (!hasParticipant) return false
    }

    // Filter by search query
    if (!searchQuery) return true
    return task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Participant Filter */}
      <div className="mb-4 flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <Users className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">참여자별 보기:</span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={!selectedParticipant ? 'default' : 'outline'}
            onClick={() => setSelectedParticipant(null)}
          >
            전체
          </Button>
          {Array.from(new Set(tasks.flatMap(task => task.participants || []))).map((participant) => (
            <Button
              key={participant.userId}
              size="sm"
              variant={selectedParticipant === participant.userId ? 'default' : 'outline'}
              onClick={() => setSelectedParticipant(participant.userId)}
            >
              {participant.user.nickname || participant.user.username}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 flex-1">
        {TASK_COLUMNS.map((column) => (
          <div
            key={column.id}
            className={`${column.color} rounded-lg p-4 h-full flex flex-col`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-700">
                {column.title}
              </h3>
              <Badge variant="secondary">
                {filteredTasks.filter(task => task.status === column.id).length}
              </Badge>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-3">
                {filteredTasks
                  .filter(task => task.status === column.id)
                  .map((task) => (
                    <Card
                      key={task.id}
                      className="cursor-move hover:shadow-md transition-shadow"
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm font-medium line-clamp-2">
                            {task.title}
                          </CardTitle>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>편집</DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-red-600"
                              >
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {task.description && (
                          <CardDescription className="text-xs mt-2 line-clamp-2">
                            {task.description}
                          </CardDescription>
                        )}
                      </CardHeader>

                      <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                        <div className="flex items-center justify-between w-full">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getPriorityColor(task.priority)}`}
                          >
                            {task.priority === 'urgent' ? '긴급' :
                             task.priority === 'high' ? '높음' :
                             task.priority === 'medium' ? '보통' : '낮음'}
                          </Badge>
                          {task.comments && (
                            <span className="text-xs text-gray-500">
                              댓글 {task.comments.length}개
                            </span>
                          )}
                        </div>

                        {/* Status Move Button */}
                        {column.id === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-7 text-xs"
                            onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                          >
                            진행중으로 <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                        )}
                        {column.id === 'in_progress' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-7 text-xs"
                            onClick={() => handleUpdateTaskStatus(task.id, 'review')}
                          >
                            검토로 <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                        )}
                        {column.id === 'review' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-7 text-xs"
                            onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                          >
                            완료로 <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                        )}

                        {task.dueDate && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        )}

                        {task.participants && task.participants.length > 0 && (
                          <div className="flex -space-x-2">
                            {task.participants.slice(0, 3).map((participant) => (
                              <Avatar key={participant.userId} className="h-6 w-6 border-2 border-white">
                                <AvatarImage src={participant.user.profileImageUrl} />
                                <AvatarFallback className="text-xs">
                                  {participant.user.nickname.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {task.participants.length > 3 && (
                              <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                +{task.participants.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  ))}

              </div>
            </ScrollArea>
          </div>
        ))}
    </div>
  )
}