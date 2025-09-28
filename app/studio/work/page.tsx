'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, MoreVertical, Trash2, Link2, Check, Copy, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { workTasksAPI } from '@/lib/api/work-tasks'
import { projectsAPI } from '@/lib/api/projects' // Keep for temporary compatibility
import { useAuthStore } from '@/store/useAuthStore'
import { socketClient } from '@/lib/socket/client'
import TaskBoard from '@/components/work/TaskBoard'
import TodoList from '@/components/work/TodoList'
import TeamOverview from '@/components/work/TeamOverview'
import { CreateWorkTaskModal } from '@/components/work/CreateWorkTaskModal'
import JoinWorkTaskModal from '@/components/work/JoinWorkTaskModal'

export default function WorkPage() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const [workTasks, setWorkTasks] = useState([])
  const [selectedWorkTask, setSelectedWorkTask] = useState(null)
  const [activeTab, setActiveTab] = useState('tasks')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showInviteCodeDialog, setShowInviteCodeDialog] = useState(false)
  const [selectedInviteCode, setSelectedInviteCode] = useState('')

  // Clear localStorage cache and load projects on mount
  useEffect(() => {
    // Clear any cached project data
    if (typeof window !== 'undefined') {
      const keysToRemove = ['project-storage', 'projects-cache', 'work-projects'];
      keysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
          // Clearing localStorage key
          localStorage.removeItem(key);
        }
      });
    }
    loadWorkTasks()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Socket.io listeners for real-time updates
  useEffect(() => {
    const socket = socketClient.connect()

    socket.on('task:created', handleTaskUpdate)
    socket.on('task:updated', handleTaskUpdate)
    socket.on('task:deleted', handleTaskUpdate)
    socket.on('todo:created', handleTaskUpdate)
    socket.on('todo:updated', handleTaskUpdate)
    socket.on('todo:completed', handleTaskUpdate)

    return () => {
      socket.off('task:created')
      socket.off('task:updated')
      socket.off('task:deleted')
      socket.off('todo:created')
      socket.off('todo:updated')
      socket.off('todo:completed')
    }
  }, [selectedWorkTask]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadWorkTasks = async () => {
    try {
      setLoading(true)
      // Load work tasks using the new API
      const data = await workTasksAPI.getWorkTasks()

      // Ensure data is always an array to prevent map errors
      const workTasksArray = Array.isArray(data) ? data : []
      setWorkTasks(workTasksArray)

      if (workTasksArray.length > 0 && !selectedWorkTask) {
        setSelectedWorkTask(workTasksArray[0])
      }
    } catch (error) {
      console.error('[Work Page] Error loading work tasks:', error)
      // Set empty array on error to prevent map failures
      setWorkTasks([])

      // 더 구체적인 에러 메시지 제공
      let errorMessage = '업무 목록을 불러올 수 없습니다.'
      if (error instanceof Error) {
        if (error.message.includes('서버에 일시적인 문제')) {
          errorMessage = error.message
        } else if (error.message.includes('500')) {
          errorMessage = '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
        }
      }

      toast({
        title: '업무 불러오기 실패',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTaskUpdate = () => {
    // Trigger re-render of child components
    if (selectedWorkTask) {
      setSelectedWorkTask({ ...selectedWorkTask })
    }
  }

  const handleWorkTaskSelect = (workTask) => {
    setSelectedWorkTask(workTask)
    // Join work task room for real-time updates
    const socket = socketClient.connect()
    socket.emit('join:work-task', { workTaskId: workTask.id })
  }

  const handleDeleteWorkTask = async (workTaskId: string) => {
    try {
      await workTasksAPI.deleteWorkTask(workTaskId)
      toast({
        title: '업무 삭제 완료',
        description: '업무가 성공적으로 삭제되었습니다.',
      })
      // Reload work tasks after deletion
      await loadWorkTasks()
      // Clear selected work task if it was deleted
      if (selectedWorkTask?.id === workTaskId) {
        setSelectedWorkTask(null)
      }
    } catch (error) {
      console.error('[Work Page] Error deleting work task:', error)
      toast({
        title: '업무 삭제 실패',
        description: '업무를 삭제할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleShowInviteCode = (inviteCode: string) => {
    setSelectedInviteCode(inviteCode)
    setShowInviteCodeDialog(true)
  }

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(selectedInviteCode)
    toast({
      title: '초대코드 복사 완료',
      description: '초대코드가 클립보드에 복사되었습니다.',
    })
  }



  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-3xl font-bold">Work Management</h1>
          <p className="text-gray-600 mt-1">업무 현황 관리 및 공유</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowJoinModal(true)} variant="outline" className="bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-800">
            업무 참여
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="bg-slate-700 text-white hover:bg-slate-800 border-slate-600">
            <Plus className="mr-2 h-4 w-4" />
            새 업무
          </Button>
        </div>
      </div>

      {/* Project Selector */}
      <div className="p-4 border-b bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">업무 목록</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-600 dark:text-slate-400" />
              <Input
                placeholder="검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 placeholder:text-slate-500 dark:placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
            {(Array.isArray(workTasks) ? workTasks : []).map((workTask) => (
              <Card
                key={workTask.id}
                className={`min-w-[300px] cursor-pointer transition-all duration-300 ${
                  selectedWorkTask?.id === workTask.id
                    ? 'glass-subtle ring-2 ring-slate-400 ring-offset-2 ring-offset-background bg-white/95 dark:bg-slate-800/95 backdrop-blur-md'
                    : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-slate-800/90 hover:shadow-lg border border-slate-200 dark:border-slate-700'
                }`}
                onClick={() => handleWorkTaskSelect(workTask)}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-base flex-1">{workTask.title}</h3>
                      {/* Show dropdown menu only for creator */}
                      {user?.id === workTask.createdById && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {workTask.inviteCode && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleShowInviteCode(workTask.inviteCode)
                                }}
                              >
                                <Key className="mr-2 h-4 w-4" />
                                초대코드 확인
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm('정말로 이 업무를 삭제하시겠습니까?')) {
                                  handleDeleteWorkTask(workTask.id)
                                }
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {workTask.description || '설명이 없습니다'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        workTask.priority === 'urgent'
                          ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800' :
                        workTask.priority === 'high'
                          ? 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-300 dark:border-slate-800' :
                        workTask.priority === 'medium'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' :
                        'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700'
                      }`}>
                        {workTask.priority === 'urgent' ? '긴급' :
                         workTask.priority === 'high' ? '높음' :
                         workTask.priority === 'medium' ? '보통' : '낮음'}
                      </span>
                      {workTask.dueDate && (
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          마감: {new Date(workTask.dueDate).toLocaleDateString('ko-KR')}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {selectedWorkTask ? (
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="m-4">
              <TabsTrigger value="tasks">업무 보드</TabsTrigger>
              <TabsTrigger value="team">팀 현황</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="flex-1 overflow-hidden px-4">
              <div className="h-full flex gap-4">
                {/* Main Task Board */}
                <div className="flex-1">
                  <TaskBoard
                    searchQuery={searchQuery}
                    selectedWorkTask={selectedWorkTask}
                    onTaskUpdate={loadWorkTasks}
                  />
                </div>

                {/* Personal Todo Sidebar - Hidden as per user request */}
                {/*
                <div className="w-80 border-l pl-4">
                  <h3 className="text-lg font-semibold mb-4">업무 댓글</h3>
                  <TodoList
                    searchQuery={searchQuery}
                    onCommentCreated={loadWorkTasks}
                  />
                </div>
                */}
              </div>
            </TabsContent>

            <TabsContent value="team" className="flex-1 overflow-hidden px-4">
              <TeamOverview
                searchQuery={searchQuery}
              />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>업무가 없습니다</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                새 업무를 생성하거나 기존 업무에 참여해주세요.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setShowCreateModal(true)} className="flex-1 bg-slate-700 text-white hover:bg-slate-800 border-slate-600">
                  새 업무 생성
                </Button>
                <Button onClick={() => setShowJoinModal(true)} variant="outline" className="flex-1 bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-800">
                  업무 참여
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invite Code Dialog */}
      <Dialog open={showInviteCodeDialog} onOpenChange={setShowInviteCodeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>초대코드</DialogTitle>
            <DialogDescription>
              이 초대코드를 공유하여 다른 사용자를 업무에 참여시킬 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Input
                id="invite-code"
                value={selectedInviteCode}
                readOnly
                className="font-mono text-lg"
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="px-3"
              onClick={handleCopyInviteCode}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <CreateWorkTaskModal
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open)
          if (!open) {
            loadWorkTasks() // Reload work tasks when modal closes
          }
        }}
      />
      <JoinWorkTaskModal
        open={showJoinModal}
        onClose={() => {
          setShowJoinModal(false)
          loadWorkTasks() // Reload work tasks when modal closes
        }}
      />
    </div>
  )
}