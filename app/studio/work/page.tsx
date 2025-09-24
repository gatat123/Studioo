'use client'

import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
      toast({
        title: '업무 불러오기 실패',
        description: '업무 목록을 불러올 수 없습니다.',
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
          <Button onClick={() => setShowJoinModal(true)} variant="outline">
            업무 참여
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            새 업무
          </Button>
        </div>
      </div>

      {/* Project Selector */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">업무 목록</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {(Array.isArray(workTasks) ? workTasks : []).map((workTask) => (
              <Card
                key={workTask.id}
                className={`min-w-[280px] cursor-pointer transition-all ${
                  selectedWorkTask?.id === workTask.id
                    ? 'ring-2 ring-primary shadow-lg'
                    : 'hover:shadow-md'
                }`}
                onClick={() => handleWorkTaskSelect(workTask)}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-base">{workTask.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {workTask.description || '설명이 없습니다'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        workTask.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        workTask.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        workTask.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {workTask.priority === 'urgent' ? '긴급' :
                         workTask.priority === 'high' ? '높음' :
                         workTask.priority === 'medium' ? '보통' : '낮음'}
                      </span>
                      {workTask.dueDate && (
                        <span className="text-xs text-gray-500">
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
                    projectId={selectedWorkTask.id}
                    searchQuery={searchQuery}
                  />
                </div>

                {/* Personal Todo Sidebar */}
                <div className="w-80 border-l pl-4">
                  <h3 className="text-lg font-semibold mb-4">개인 Todo</h3>
                  <TodoList
                    projectId={selectedWorkTask.id}
                    userId={user?.id}
                    searchQuery={searchQuery}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="team" className="flex-1 overflow-hidden px-4">
              <TeamOverview
                projectId={selectedWorkTask.id}
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
                <Button onClick={() => setShowCreateModal(true)} className="flex-1">
                  새 업무 생성
                </Button>
                <Button onClick={() => setShowJoinModal(true)} variant="outline" className="flex-1">
                  업무 참여
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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