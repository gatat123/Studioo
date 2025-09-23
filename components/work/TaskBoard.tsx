'use client'

import { useState, useEffect } from 'react'
import { Plus, MoreVertical, Calendar, User, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/useAuthStore'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  assignedUsers?: Array<{
    id: string
    nickname: string
    profileImageUrl?: string
  }>
  todoCount?: number
  completedTodoCount?: number
}

interface TaskBoardProps {
  projectId: string
  searchQuery?: string
}

const TASK_COLUMNS = [
  { id: 'todo', title: '할 일', color: 'bg-gray-100' },
  { id: 'in_progress', title: '진행중', color: 'bg-blue-50' },
  { id: 'review', title: '검토', color: 'bg-yellow-50' },
  { id: 'done', title: '완료', color: 'bg-green-50' },
]

export default function TaskBoard({ projectId, searchQuery }: TaskBoardProps) {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState('')
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

  // Form state
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState('medium')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')

  useEffect(() => {
    loadTasks()
  }, [projectId])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks/project/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      } else {
        throw new Error('Failed to load tasks')
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
      toast({
        title: '업무 불러오기 실패',
        description: '업무 목록을 불러올 수 없습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      toast({
        title: '입력 오류',
        description: '업무 제목을 입력해주세요.',
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          title: newTaskTitle,
          description: newTaskDescription,
          priority: newTaskPriority,
          status: selectedColumn || 'todo',
          dueDate: newTaskDueDate || undefined,
        }),
      })

      if (response.ok) {
        const newTask = await response.json()
        setTasks([...tasks, newTask])
        setShowCreateDialog(false)
        resetForm()
        toast({
          title: '업무 생성 완료',
          description: '새 업무가 추가되었습니다.',
        })
      } else {
        throw new Error('Failed to create task')
      }
    } catch (error) {
      console.error('Failed to create task:', error)
      toast({
        title: '업무 생성 실패',
        description: '업무를 생성할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setTasks(tasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        ))
        toast({
          title: '업무 상태 변경',
          description: '업무 상태가 업데이트되었습니다.',
        })
      } else {
        throw new Error('Failed to update task')
      }
    } catch (error) {
      console.error('Failed to update task:', error)
      toast({
        title: '상태 변경 실패',
        description: '업무 상태를 변경할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        setTasks(tasks.filter(task => task.id !== taskId))
        toast({
          title: '업무 삭제 완료',
          description: '업무가 삭제되었습니다.',
        })
      } else {
        throw new Error('Failed to delete task')
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
      toast({
        title: '업무 삭제 실패',
        description: '업무를 삭제할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setNewTaskTitle('')
    setNewTaskDescription('')
    setNewTaskPriority('medium')
    setNewTaskDueDate('')
  }

  const handleDragStart = (e: React.DragEvent, task: Task) => {
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
      case 'high':
        return 'text-red-600 bg-red-50'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50'
      case 'low':
        return 'text-green-600 bg-green-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const filteredTasks = tasks.filter(task => {
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
    <div className="h-full">
      <div className="grid grid-cols-4 gap-4 h-full">
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
                            {task.priority === 'high' ? '높음' :
                             task.priority === 'medium' ? '보통' : '낮음'}
                          </Badge>
                          {task.todoCount !== undefined && (
                            <span className="text-xs text-gray-500">
                              {task.completedTodoCount || 0}/{task.todoCount}
                            </span>
                          )}
                        </div>

                        {task.dueDate && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        )}

                        {task.assignedUsers && task.assignedUsers.length > 0 && (
                          <div className="flex -space-x-2">
                            {task.assignedUsers.slice(0, 3).map((user) => (
                              <Avatar key={user.id} className="h-6 w-6 border-2 border-white">
                                <AvatarImage src={user.profileImageUrl} />
                                <AvatarFallback className="text-xs">
                                  {user.nickname.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {task.assignedUsers.length > 3 && (
                              <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                +{task.assignedUsers.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  ))}

                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-600"
                  onClick={() => {
                    setSelectedColumn(column.id)
                    setShowCreateDialog(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  업무 추가
                </Button>
              </div>
            </ScrollArea>
          </div>
        ))}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 업무 추가</DialogTitle>
            <DialogDescription>
              프로젝트에 새로운 업무를 추가합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">제목</label>
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="업무 제목을 입력하세요"
              />
            </div>
            <div>
              <label className="text-sm font-medium">설명</label>
              <Textarea
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="업무 설명을 입력하세요 (선택사항)"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">우선순위</label>
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">높음</SelectItem>
                    <SelectItem value="medium">보통</SelectItem>
                    <SelectItem value="low">낮음</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">마감일</label>
                <Input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                취소
              </Button>
              <Button onClick={handleCreateTask}>
                추가
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}