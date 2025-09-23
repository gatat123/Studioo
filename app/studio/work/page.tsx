'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, Calendar, Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { projectsAPI } from '@/lib/api/projects'
import { useAuthStore } from '@/store/useAuthStore'
import { socketClient } from '@/lib/socket/client'
import TaskBoard from '@/components/work/TaskBoard'
import TodoList from '@/components/work/TodoList'
import TeamOverview from '@/components/work/TeamOverview'
import { CreateWorkProjectModal } from '@/components/projects/CreateWorkProjectModal'
import JoinProjectModal from '@/components/projects/JoinProjectModal'

export default function WorkPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [activeTab, setActiveTab] = useState('tasks')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)

  // Load projects on mount
  useEffect(() => {
    loadProjects()
  }, [])

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
  }, [selectedProject])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const data = await projectsAPI.getProjects('work')
      setProjects(data)
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0])
      }
    } catch (error) {
      toast({
        title: '프로젝트 불러오기 실패',
        description: '프로젝트 목록을 불러올 수 없습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTaskUpdate = () => {
    // Trigger re-render of child components
    if (selectedProject) {
      setSelectedProject({ ...selectedProject })
    }
  }

  const handleProjectSelect = (project) => {
    setSelectedProject(project)
    // Join project room for real-time updates
    const socket = socketClient.connect()
    socket.emit('join:project', { projectId: project.id })
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
            프로젝트 참여
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            새 프로젝트
          </Button>
        </div>
      </div>

      {/* Project Selector */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {projects.map((project) => (
                <Button
                  key={project.id}
                  variant={selectedProject?.id === project.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleProjectSelect(project)}
                  className="whitespace-nowrap"
                >
                  {project.name}
                </Button>
              ))}
            </div>
          </div>
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
      </div>

      {/* Main Content */}
      {selectedProject ? (
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="m-4">
              <TabsTrigger value="tasks">업무 보드</TabsTrigger>
              <TabsTrigger value="todos">개인 Todo</TabsTrigger>
              <TabsTrigger value="team">팀 현황</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="flex-1 overflow-hidden px-4">
              <TaskBoard
                projectId={selectedProject.id}
                searchQuery={searchQuery}
              />
            </TabsContent>

            <TabsContent value="todos" className="flex-1 overflow-hidden px-4">
              <TodoList
                projectId={selectedProject.id}
                userId={user?.id}
                searchQuery={searchQuery}
              />
            </TabsContent>

            <TabsContent value="team" className="flex-1 overflow-hidden px-4">
              <TeamOverview
                projectId={selectedProject.id}
                searchQuery={searchQuery}
              />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>프로젝트가 없습니다</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                새 프로젝트를 생성하거나 기존 프로젝트에 참여해주세요.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setShowCreateModal(true)} className="flex-1">
                  새 프로젝트 생성
                </Button>
                <Button onClick={() => setShowJoinModal(true)} variant="outline" className="flex-1">
                  프로젝트 참여
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modals */}
      <CreateWorkProjectModal
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open)
          if (!open) {
            loadProjects() // Reload projects when modal closes
          }
        }}
      />
      <JoinProjectModal
        open={showJoinModal}
        onClose={() => {
          setShowJoinModal(false)
          loadProjects() // Reload projects when modal closes
        }}
      />
    </div>
  )
}