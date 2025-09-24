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
import { workTasksAPI, WorkTask, SubTask } from '@/lib/api/work-tasks'
import { socketClient } from '@/lib/socket/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface TaskBoardProps {
  searchQuery?: string
  selectedWorkTask: WorkTask | null
  onTaskCreated?: () => void
  onTaskUpdate?: () => void
}

const TASK_COLUMNS = [
  { id: 'todo', title: '할 일', color: 'bg-gray-100' },
  { id: 'in_progress', title: '진행중', color: 'bg-blue-50' },
  { id: 'review', title: '검토', color: 'bg-yellow-50' },
  { id: 'done', title: '완료', color: 'bg-green-50' },
]

export default function TaskBoard({ searchQuery, selectedWorkTask, onTaskCreated, onTaskUpdate }: TaskBoardProps) {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const [subtasks, setSubtasks] = useState<SubTask[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedTask, setDraggedTask] = useState<SubTask | null>(null)
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createDialogStatus, setCreateDialogStatus] = useState<string>('todo')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')

  useEffect(() => {
    if (selectedWorkTask) {
      loadSubTasks()
    } else {
      setSubtasks([])
      setLoading(false)
    }
  }, [selectedWorkTask]) // eslint-disable-line react-hooks/exhaustive-deps

  // Socket.io listeners for real-time updates
  useEffect(() => {
    if (!selectedWorkTask) return

    const socket = socketClient.connect()

    // Join work task room for real-time updates
    socket.emit('join:work-task', selectedWorkTask.id)

    const handleReloadSubTasks = () => {
      loadSubTasks()
      // Also notify parent component about the update
      if (onTaskUpdate) {
        onTaskUpdate()
      }
    }

    socket.on('subtask:created', handleReloadSubTasks)
    socket.on('subtask:updated', handleReloadSubTasks)
    socket.on('subtask:deleted', handleReloadSubTasks)

    return () => {
      socket.off('subtask:created', handleReloadSubTasks)
      socket.off('subtask:updated', handleReloadSubTasks)
      socket.off('subtask:deleted', handleReloadSubTasks)
      socket.emit('leave:work-task', selectedWorkTask.id)
    }
  }, [selectedWorkTask, onTaskUpdate]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadSubTasks = async () => {
    if (!selectedWorkTask) return

    try {
      setLoading(true)
      const data = await workTasksAPI.getSubTasks(selectedWorkTask.id)
      setSubtasks(data)
    } catch (error) {
      console.error('Failed to load subtasks:', error)
      toast({
        title: '세부 업무 불러오기 실패',
        description: '세부 업무 목록을 불러올 수 없습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }


  const handleCreateSubTask = async () => {
    if (!selectedWorkTask || !newTaskTitle) return

    try {
      const newSubTask = await workTasksAPI.createSubTask(selectedWorkTask.id, {
        title: newTaskTitle,
        description: newTaskDescription,
        status: createDialogStatus as 'todo' | 'in_progress' | 'review' | 'done',
        priority: 'medium'
      })

      setSubtasks([...subtasks, newSubTask])
      setCreateDialogOpen(false)
      setNewTaskTitle('')
      setNewTaskDescription('')
      toast({
        title: '세부 업무 생성 완료',
        description: '새로운 세부 업무가 추가되었습니다.',
      })
    } catch (error) {
      console.error('Failed to create subtask:', error)
      toast({
        title: '세부 업무 생성 실패',
        description: '세부 업무를 생성할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateSubTaskStatus = async (subtaskId: string, newStatus: string, newPosition: number) => {
    if (!selectedWorkTask) return

    try {
      const updatedSubTask = await workTasksAPI.updateSubTask(selectedWorkTask.id, subtaskId, {
        status: newStatus as 'todo' | 'in_progress' | 'review' | 'done',
        position: newPosition
      })

      setSubtasks(subtasks.map(task =>
        task.id === subtaskId ? updatedSubTask : task
      ))
      toast({
        title: '세부 업무 상태 변경',
        description: '세부 업무 상태가 업데이트되었습니다.',
      })
    } catch (error) {
      console.error('Failed to update subtask status:', error)
      toast({
        title: '상태 변경 실패',
        description: '세부 업무 상태를 변경할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteSubTask = async (subtaskId: string) => {
    if (!selectedWorkTask) return

    try {
      await workTasksAPI.deleteSubTask(selectedWorkTask.id, subtaskId)
      setSubtasks(subtasks.filter(task => task.id !== subtaskId))
      toast({
        title: '세부 업무 삭제 완료',
        description: '세부 업무가 삭제되었습니다.',
      })
    } catch (error) {
      console.error('Failed to delete subtask:', error)
      toast({
        title: '세부 업무 삭제 실패',
        description: '세부 업무를 삭제할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }


  const handleDragStart = (e: React.DragEvent, task: SubTask) => {
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
      // Calculate new position (add to end of column)
      const tasksInColumn = subtasks.filter(t => t.status === status)
      const newPosition = tasksInColumn.length
      handleUpdateSubTaskStatus(draggedTask.id, status, newPosition)
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

  const filteredSubTasks = subtasks.filter(task => {
    // Filter by selected assignee
    if (selectedAssignee) {
      if (task.assigneeId !== selectedAssignee) return false
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

  if (!selectedWorkTask) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p className="text-lg">왼쪽 목록에서 업무를 선택해주세요</p>
          <p className="text-sm mt-2">선택한 업무의 세부 작업이 여기에 표시됩니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Selected Work Task Info */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{selectedWorkTask.title}</h3>
            {selectedWorkTask.description && (
              <p className="text-sm text-gray-600 mt-1">{selectedWorkTask.description}</p>
            )}
          </div>
          <Badge variant="outline">
            세부 작업 {subtasks.length}개
          </Badge>
        </div>
      </div>

      {/* Assignee Filter */}
      <div className="mb-4 flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <Users className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">담당자별 보기:</span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={!selectedAssignee ? 'default' : 'outline'}
            onClick={() => setSelectedAssignee(null)}
          >
            전체
          </Button>
          {Array.from(new Set(subtasks.filter(t => t.assigneeId).map(t => t.assigneeId!))).map((assigneeId) => {
            const assignee = subtasks.find(t => t.assigneeId === assigneeId)?.assignee
            if (!assignee) return null
            return (
              <Button
                key={assigneeId}
                size="sm"
                variant={selectedAssignee === assigneeId ? 'default' : 'outline'}
                onClick={() => setSelectedAssignee(assigneeId)}
              >
                {assignee.nickname}
              </Button>
            )
          })}
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
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {filteredSubTasks.filter(task => task.status === column.id).length}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => {
                    setCreateDialogStatus(column.id)
                    setCreateDialogOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-3">
                {filteredSubTasks
                  .filter(task => task.status === column.id)
                  .sort((a, b) => a.position - b.position)
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
                                onClick={() => handleDeleteSubTask(task.id)}
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
                        {/* Creator Info */}
                        {task.createdBy && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                            <span>생성자:</span>
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={task.createdBy.profileImageUrl} />
                              <AvatarFallback className="text-[10px]">
                                {task.createdBy.nickname[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{task.createdBy.nickname}</span>
                          </div>
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
                          {task.assignee && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">담당:</span>
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={task.assignee.profileImageUrl} />
                                <AvatarFallback className="text-xs">
                                  {task.assignee.nickname[0]}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          )}
                        </div>

                        {/* Due Date */}
                        {task.dueDate && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        )}

                        {/* Status Change Button */}
                        {task.status === 'todo' && (
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              const targetTasks = filteredSubTasks.filter(t => t.status === 'in_progress')
                              handleUpdateSubTaskStatus(task.id, 'in_progress', targetTasks.length)
                            }}
                          >
                            <ChevronRight className="h-4 w-4 mr-1" />
                            진행
                          </Button>
                        )}
                        {task.status === 'in_progress' && (
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              const targetTasks = filteredSubTasks.filter(t => t.status === 'review')
                              handleUpdateSubTaskStatus(task.id, 'review', targetTasks.length)
                            }}
                          >
                            <ChevronRight className="h-4 w-4 mr-1" />
                            검토
                          </Button>
                        )}
                        {task.status === 'review' && (
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              const targetTasks = filteredSubTasks.filter(t => t.status === 'done')
                              handleUpdateSubTaskStatus(task.id, 'done', targetTasks.length)
                            }}
                          >
                            <ChevronRight className="h-4 w-4 mr-1" />
                            완료
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))}

              </div>
            </ScrollArea>
          </div>
        ))}
      </div>

      {/* Create SubTask Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>새 세부 작업 추가</DialogTitle>
            <DialogDescription>
              {TASK_COLUMNS.find(col => col.id === createDialogStatus)?.title} 칼럼에 새로운 세부 작업을 추가합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                제목
              </Label>
              <Input
                id="title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="col-span-3"
                placeholder="세부 작업 제목을 입력하세요"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                설명
              </Label>
              <Textarea
                id="description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                className="col-span-3"
                placeholder="세부 작업 설명을 입력하세요"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreateSubTask} disabled={!newTaskTitle}>
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}