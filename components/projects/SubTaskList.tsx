'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  MoreVertical,
  Edit,
  Trash2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SubTask } from '@/types'
import { cn } from '@/lib/utils'

interface SubTaskListProps {
  projectId: string
  subTasks?: SubTask[]
  onCreateSubTask?: (data: { title: string; description?: string; priority?: string }) => Promise<void>
  onUpdateSubTask?: (id: string, data: Partial<SubTask>) => Promise<void>
  onDeleteSubTask?: (id: string) => Promise<void>
}

const statusIcons = {
  todo: Circle,
  in_progress: Clock,
  review: AlertCircle,
  done: CheckCircle2,
}

const statusColors = {
  todo: 'text-slate-400',
  in_progress: 'text-slate-600',
  review: 'text-slate-700',
  done: 'text-slate-800',
}

const statusLabels = {
  todo: '할 일',
  in_progress: '진행 중',
  review: '검토',
  done: '완료',
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-slate-100 text-slate-800',
  urgent: 'bg-red-100 text-red-800',
}

const priorityLabels = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  urgent: '긴급',
}

export default function SubTaskList({
  projectId,
  subTasks = [],
  onCreateSubTask,
  onUpdateSubTask,
  onDeleteSubTask
}: SubTaskListProps) {
  const [isAddingSubTask, setIsAddingSubTask] = useState(false)
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('')
  const [newSubTaskDescription, setNewSubTaskDescription] = useState('')
  const [editingSubTaskId, setEditingSubTaskId] = useState<string | null>(null)

  const handleCreateSubTask = async () => {
    if (!newSubTaskTitle.trim() || !onCreateSubTask) return

    try {
      await onCreateSubTask({
        title: newSubTaskTitle,
        description: newSubTaskDescription || undefined,
        priority: 'medium'
      })

      setNewSubTaskTitle('')
      setNewSubTaskDescription('')
      setIsAddingSubTask(false)
    } catch (error) {
      console.error('Failed to create subtask:', error)
    }
  }

  const handleUpdateStatus = async (id: string, status: SubTask['status']) => {
    if (!onUpdateSubTask) return

    try {
      await onUpdateSubTask(id, {
        status,
        completedAt: status === 'done' ? new Date() : null
      })
    } catch (error) {
      console.error('Failed to update subtask status:', error)
    }
  }

  const handleDeleteSubTask = async (id: string) => {
    if (!confirm('이 하위 작업을 삭제하시겠습니까?') || !onDeleteSubTask) return

    try {
      await onDeleteSubTask(id)
    } catch (error) {
      console.error('Failed to delete subtask:', error)
    }
  }

  const groupedSubTasks = subTasks.reduce((acc, subTask) => {
    if (!acc[subTask.status]) {
      acc[subTask.status] = []
    }
    acc[subTask.status].push(subTask)
    return acc
  }, {} as Record<SubTask['status'], SubTask[]>)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">하위 작업</h3>
          <p className="text-sm text-muted-foreground">
            프로젝트의 세부 작업을 관리하세요
          </p>
        </div>

        <Button
          onClick={() => setIsAddingSubTask(true)}
          size="sm"
          disabled={!onCreateSubTask}
        >
          <Plus className="h-4 w-4 mr-2" />
          작업 추가
        </Button>
      </div>

      {/* Add SubTask Form */}
      {isAddingSubTask && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">새 하위 작업</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="작업 제목"
              value={newSubTaskTitle}
              onChange={(e) => setNewSubTaskTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateSubTask()}
            />
            <Textarea
              placeholder="작업 설명 (선택사항)"
              value={newSubTaskDescription}
              onChange={(e) => setNewSubTaskDescription(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button onClick={handleCreateSubTask} size="sm">
                추가
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddingSubTask(false)
                  setNewSubTaskTitle('')
                  setNewSubTaskDescription('')
                }}
              >
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SubTasks by Status */}
      <div className="grid gap-4">
        {(['todo', 'in_progress', 'review', 'done'] as const).map((status) => {
          const tasksInStatus = groupedSubTasks[status] || []
          const StatusIcon = statusIcons[status]

          return (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <StatusIcon className={cn('h-5 w-5', statusColors[status])} />
                <h4 className="font-medium">{statusLabels[status]}</h4>
                <Badge variant="outline">{tasksInStatus.length}</Badge>
              </div>

              {tasksInStatus.length > 0 ? (
                <div className="space-y-2">
                  {tasksInStatus.map((subTask) => (
                    <Card key={subTask.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium">{subTask.title}</h5>
                              <Badge
                                variant="outline"
                                className={cn('text-xs', priorityColors[subTask.priority])}
                              >
                                {priorityLabels[subTask.priority]}
                              </Badge>
                            </div>

                            {subTask.description && (
                              <p className="text-sm text-muted-foreground">
                                {subTask.description}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>생성: {new Date(subTask.createdAt).toLocaleDateString()}</span>
                              {subTask.dueDate && (
                                <span>마감: {new Date(subTask.dueDate).toLocaleDateString()}</span>
                              )}
                              {subTask.completedAt && (
                                <span>완료: {new Date(subTask.completedAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Status Change Buttons */}
                            {status !== 'done' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const nextStatus = status === 'todo'
                                    ? 'in_progress'
                                    : status === 'in_progress'
                                    ? 'review'
                                    : 'done'
                                  handleUpdateStatus(subTask.id, nextStatus)
                                }}
                              >
                                {status === 'todo' && '시작'}
                                {status === 'in_progress' && '검토'}
                                {status === 'review' && '완료'}
                              </Button>
                            )}

                            {status === 'done' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateStatus(subTask.id, 'in_progress')}
                              >
                                재시작
                              </Button>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingSubTaskId(subTask.id)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  편집
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteSubTask(subTask.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  삭제
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">이 상태의 작업이 없습니다</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {subTasks.length === 0 && !isAddingSubTask && (
        <div className="text-center py-12 text-muted-foreground">
          <Circle className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">아직 하위 작업이 없습니다</p>
          <p className="text-xs mt-1">위에서 새 작업을 추가하세요</p>
        </div>
      )}
    </div>
  )
}