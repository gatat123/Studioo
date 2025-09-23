'use client'

import { useState, useEffect } from 'react'
import { Activity, TrendingUp, CheckCircle, Clock, Users, BarChart, Calendar, Target } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { projectsAPI } from '@/lib/api/projects'

interface TeamMember {
  id: string
  nickname: string
  email: string
  profileImageUrl?: string
  role: string
  todoCount: number
  completedTodoCount: number
  taskCount: number
  completedTaskCount: number
  lastActivity?: string
  status?: 'online' | 'offline' | 'busy'
}

interface Activity {
  id: string
  type: 'task_created' | 'task_completed' | 'todo_created' | 'todo_completed' | 'comment_added'
  description: string
  user: {
    id: string
    nickname: string
    profileImageUrl?: string
  }
  createdAt: string
}

interface ProjectStats {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  totalTodos: number
  completedTodos: number
  activeMembers: number
  completionRate: number
}

interface TeamOverviewProps {
  projectId: string
  searchQuery?: string
}

export default function TeamOverview({ projectId, searchQuery }: TeamOverviewProps) {
  const { toast } = useToast()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('members')

  useEffect(() => {
    loadTeamData()
  }, [projectId])

  const loadTeamData = async () => {
    try {
      setLoading(true)

      // Load team members
      const participantsResponse = await projectsAPI.getParticipants(projectId)

      // Load project statistics
      const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      // Load recent activities
      const activitiesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/activities`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (statsResponse.ok && activitiesResponse.ok) {
        // Process team members with mock data for now
        const members = participantsResponse.map((participant: any) => ({
          id: participant.userId,
          nickname: participant.user?.nickname || 'Unknown',
          email: participant.user?.email || '',
          profileImageUrl: participant.user?.profileImageUrl,
          role: participant.role,
          todoCount: Math.floor(Math.random() * 20),
          completedTodoCount: Math.floor(Math.random() * 15),
          taskCount: Math.floor(Math.random() * 10),
          completedTaskCount: Math.floor(Math.random() * 8),
          lastActivity: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          status: Math.random() > 0.5 ? 'online' : 'offline'
        }))
        setTeamMembers(members)

        // Mock statistics
        const stats: ProjectStats = {
          totalTasks: members.reduce((sum: number, m: TeamMember) => sum + m.taskCount, 0),
          completedTasks: members.reduce((sum: number, m: TeamMember) => sum + m.completedTaskCount, 0),
          inProgressTasks: 0,
          totalTodos: members.reduce((sum: number, m: TeamMember) => sum + m.todoCount, 0),
          completedTodos: members.reduce((sum: number, m: TeamMember) => sum + m.completedTodoCount, 0),
          activeMembers: members.filter((m: TeamMember) => m.status === 'online').length,
          completionRate: 0
        }
        stats.inProgressTasks = stats.totalTasks - stats.completedTasks
        stats.completionRate = stats.totalTasks > 0
          ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
          : 0
        setProjectStats(stats)

        // Mock activities
        const mockActivities: Activity[] = [
          {
            id: '1',
            type: 'task_completed',
            description: '프로젝트 디자인 리뷰 완료',
            user: members[0] || { id: '1', nickname: 'User', profileImageUrl: '' },
            createdAt: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: '2',
            type: 'todo_created',
            description: '새 Todo 추가: API 문서 작성',
            user: members[1] || members[0] || { id: '1', nickname: 'User', profileImageUrl: '' },
            createdAt: new Date(Date.now() - 7200000).toISOString()
          },
          {
            id: '3',
            type: 'comment_added',
            description: '디자인 시안에 피드백 추가',
            user: members[2] || members[0] || { id: '1', nickname: 'User', profileImageUrl: '' },
            createdAt: new Date(Date.now() - 10800000).toISOString()
          }
        ]
        setActivities(mockActivities)
      }
    } catch (error) {
      console.error('Failed to load team data:', error)
      toast({
        title: '팀 데이터 불러오기 실패',
        description: '팀 정보를 불러올 수 없습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500">온라인</Badge>
      case 'busy':
        return <Badge className="bg-yellow-500">바쁨</Badge>
      default:
        return <Badge variant="secondary">오프라인</Badge>
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'task_created':
        return <Target className="h-4 w-4 text-blue-600" />
      case 'todo_created':
      case 'todo_completed':
        return <Clock className="h-4 w-4 text-purple-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    return date.toLocaleDateString()
  }

  const filteredMembers = teamMembers.filter(member => {
    if (!searchQuery) return true
    return member.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
           member.email.toLowerCase().includes(searchQuery.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Statistics Cards */}
      {projectStats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>전체 업무</CardDescription>
              <CardTitle className="text-2xl">{projectStats.totalTasks}</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={projectStats.completionRate} className="h-2" />
              <p className="text-xs text-gray-500 mt-2">
                {projectStats.completedTasks}개 완료
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>전체 Todo</CardDescription>
              <CardTitle className="text-2xl">{projectStats.totalTodos}</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress
                value={projectStats.totalTodos > 0
                  ? (projectStats.completedTodos / projectStats.totalTodos) * 100
                  : 0}
                className="h-2"
              />
              <p className="text-xs text-gray-500 mt-2">
                {projectStats.completedTodos}개 완료
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>활성 멤버</CardDescription>
              <CardTitle className="text-2xl">{projectStats.activeMembers}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">
                전체 {teamMembers.length}명 중
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>완료율</CardDescription>
              <CardTitle className="text-2xl">{projectStats.completionRate}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                지난 주 대비 +12%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="mb-4">
            <TabsTrigger value="members">팀 멤버</TabsTrigger>
            <TabsTrigger value="activities">최근 활동</TabsTrigger>
            <TabsTrigger value="performance">성과 분석</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="flex-1 overflow-hidden">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>팀 멤버</CardTitle>
                <CardDescription>프로젝트 참여자 현황</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100%-4rem)]">
                  <div className="space-y-4">
                    {filteredMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.profileImageUrl} />
                            <AvatarFallback>
                              {member.nickname.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{member.nickname}</p>
                              {getStatusBadge(member.status || 'offline')}
                            </div>
                            <p className="text-sm text-gray-500">{member.role}</p>
                          </div>
                        </div>
                        <div className="flex gap-6">
                          <div className="text-center">
                            <p className="text-2xl font-semibold">{member.taskCount}</p>
                            <p className="text-xs text-gray-500">업무</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-semibold">{member.todoCount}</p>
                            <p className="text-xs text-gray-500">Todo</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-semibold text-green-600">
                              {Math.round((member.completedTaskCount / (member.taskCount || 1)) * 100)}%
                            </p>
                            <p className="text-xs text-gray-500">완료율</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities" className="flex-1 overflow-hidden">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>최근 활동</CardTitle>
                <CardDescription>팀 활동 타임라인</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100%-4rem)]">
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3 p-3 rounded-lg hover:bg-gray-50">
                        <div className="mt-1">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm">
                                <span className="font-medium">{activity.user.nickname}</span>
                                {' '}
                                {activity.description}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatTime(activity.createdAt)}
                              </p>
                            </div>
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={activity.user.profileImageUrl} />
                              <AvatarFallback>
                                {activity.user.nickname.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="flex-1 overflow-hidden">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>성과 분석</CardTitle>
                <CardDescription>팀 생산성 및 진행 상황</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-3">주간 업무 완료 추이</h4>
                    <div className="flex items-end gap-2 h-32">
                      {[40, 65, 45, 80, 55, 70, 90].map((height, i) => (
                        <div key={i} className="flex-1 bg-primary rounded-t" style={{ height: `${height}%` }}>
                          <div className="text-xs text-white text-center mt-2">
                            {['월', '화', '수', '목', '금', '토', '일'][i]}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-3">팀원별 기여도</h4>
                    <div className="space-y-3">
                      {teamMembers.slice(0, 3).map((member) => (
                        <div key={member.id} className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.profileImageUrl} />
                            <AvatarFallback>
                              {member.nickname.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span>{member.nickname}</span>
                              <span>{member.completedTaskCount + member.completedTodoCount} 완료</span>
                            </div>
                            <Progress
                              value={((member.completedTaskCount + member.completedTodoCount) /
                                     (projectStats?.completedTasks || 1 + projectStats?.completedTodos || 1)) * 100}
                              className="h-2"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}