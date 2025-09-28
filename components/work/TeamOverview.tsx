'use client'

import { useState, useEffect } from 'react'
import { Activity, TrendingUp, CheckCircle, Clock, Target, MessageSquare, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { workTasksAPI, WorkTask, SubTask } from '@/lib/api/work-tasks'
import { safeToLocaleDateString } from '@/lib/utils/date-helpers'
import { formatDistanceToNow, formatKoreanDate } from '@/lib/utils/time-format'

interface TeamMember {
  id: string
  nickname: string
  username: string
  profileImageUrl?: string
  role: 'creator' | 'assignee' | 'member' | 'viewer'
  taskCount: number
  completedTaskCount: number
  commentCount: number
}

interface WorkStats {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  reviewTasks: number
  pendingTasks: number
  totalComments: number
  activeMembers: number
  completionRate: number
}

interface TeamOverviewProps {
  searchQuery?: string
}

export default function TeamOverview({ searchQuery }: TeamOverviewProps) {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<WorkTask[]>([])
  const [subTasks, setSubTasks] = useState<SubTask[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [workStats, setWorkStats] = useState<WorkStats>({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    reviewTasks: 0,
    pendingTasks: 0,
    totalComments: 0,
    activeMembers: 0,
    completionRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadTeamData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadTeamData = async () => {
    try {
      setLoading(true)

      // Load work tasks for compatibility
      const tasks = await workTasksAPI.getWorkTasks()
      setTasks(tasks)

      // Load all subtasks using new API endpoint
      const allSubTasks = await workTasksAPI.getAllSubTasks()
      setSubTasks(allSubTasks)

      // Calculate statistics including subtasks
      const totalSubTasks = allSubTasks.length
      const completedSubTasks = allSubTasks.filter(st => st.status === 'done').length
      const inProgressSubTasks = allSubTasks.filter(st => st.status === 'in_progress').length
      const reviewSubTasks = allSubTasks.filter(st => st.status === 'review').length
      const pendingSubTasks = allSubTasks.filter(st => st.status === 'todo').length

      // Count total comments
      const allSubTaskComments = allSubTasks.flatMap(subtask => subtask.comments || [])
      const workTaskComments = tasks.flatMap(task => task.comments || [])

      const stats: WorkStats = {
        totalTasks: totalSubTasks,
        completedTasks: completedSubTasks,
        inProgressTasks: inProgressSubTasks,
        reviewTasks: reviewSubTasks,
        pendingTasks: pendingSubTasks,
        totalComments: workTaskComments.length + allSubTaskComments.length,
        activeMembers: 0,
        completionRate: totalSubTasks > 0 ? Math.round((completedSubTasks / totalSubTasks) * 100) : 0
      }

      // Extract unique team members from work task participants AND subtask participants
      const workTaskParticipants = tasks.flatMap(task => task.participants || [])
      const subtaskParticipants = allSubTasks.flatMap(subtask =>
        subtask.participants?.map(p => ({
          userId: p.userId,
          user: p.user,
          role: p.role || 'member'
        })) || []
      )

      // Also include assignees from subtasks
      const subtaskAssignees = allSubTasks
        .filter(subtask => subtask.assignee)
        .map(subtask => ({
          userId: subtask.assigneeId!,
          user: subtask.assignee!,
          role: 'assignee' as const
        }))

      const allParticipants = [...workTaskParticipants, ...subtaskParticipants, ...subtaskAssignees]
      const uniqueMembers = Array.from(
        new Map(allParticipants.map(p => [p.userId, p])).values()
      ).map(participant => {
        // Count subtasks where user is assignee or participant
        const userSubTasks = allSubTasks.filter(subtask =>
          subtask.assigneeId === participant.userId ||
          subtask.participants?.some(p => p.userId === participant.userId)
        )
        const userCompletedSubTasks = userSubTasks.filter(subtask => subtask.status === 'done')

        // Count comments from both work tasks and subtasks
        const workTaskCommentCount = workTaskComments.filter(comment => comment.userId === participant.userId).length
        const subTaskCommentCount = allSubTaskComments.filter(comment => comment.userId === participant.userId).length

        return {
          id: participant.userId,
          nickname: participant.user.nickname,
          username: participant.user.nickname, // Use nickname as username fallback
          profileImageUrl: participant.user.profileImageUrl,
          role: participant.role,
          taskCount: userSubTasks.length,
          completedTaskCount: userCompletedSubTasks.length,
          commentCount: workTaskCommentCount + subTaskCommentCount
        }
      })

      stats.activeMembers = uniqueMembers.length
      setTeamMembers(uniqueMembers)
      setWorkStats(stats)

    } catch (error) {
      console.error('Failed to load team data:', error)
      toast({
        title: '팀 데이터 로드 실패',
        description: '팀 현황을 불러올 수 없습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true
    return task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const filteredSubTasks = subTasks.filter(subTask => {
    if (!searchQuery) return true
    return subTask.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           subTask.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           subTask.workTask?.title.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const filteredMembers = teamMembers.filter(member => {
    if (!searchQuery) return true
    return member.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
           member.username.toLowerCase().includes(searchQuery.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="members">팀원</TabsTrigger>
          <TabsTrigger value="tasks">세부 작업</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 업무</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workStats.totalTasks}</div>
                <p className="text-xs text-muted-foreground">
                  완료율: {workStats.completionRate}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">완료된 업무</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workStats.completedTasks}</div>
                <Progress
                  value={workStats.completionRate}
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">진행중</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workStats.inProgressTasks}</div>
                <p className="text-xs text-muted-foreground">
                  검토: {workStats.reviewTasks}개
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">팀원</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workStats.activeMembers}</div>
                <p className="text-xs text-muted-foreground">
                  댓글: {workStats.totalComments}개
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>업무 진행 현황</CardTitle>
              <CardDescription>전체 업무의 상태별 분포</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>대기중</span>
                    <span>{workStats.pendingTasks}개 ({workStats.totalTasks > 0 ? Math.round((workStats.pendingTasks / workStats.totalTasks) * 100) : 0}%)</span>
                  </div>
                  <Progress value={workStats.totalTasks > 0 ? (workStats.pendingTasks / workStats.totalTasks) * 100 : 0} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>진행중</span>
                    <span>{workStats.inProgressTasks}개 ({workStats.totalTasks > 0 ? Math.round((workStats.inProgressTasks / workStats.totalTasks) * 100) : 0}%)</span>
                  </div>
                  <Progress value={workStats.totalTasks > 0 ? (workStats.inProgressTasks / workStats.totalTasks) * 100 : 0} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>검토중</span>
                    <span>{workStats.reviewTasks}개 ({workStats.totalTasks > 0 ? Math.round((workStats.reviewTasks / workStats.totalTasks) * 100) : 0}%)</span>
                  </div>
                  <Progress value={workStats.totalTasks > 0 ? (workStats.reviewTasks / workStats.totalTasks) * 100 : 0} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>완료</span>
                    <span>{workStats.completedTasks}개 ({workStats.completionRate}%)</span>
                  </div>
                  <Progress value={workStats.completionRate} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="flex-1 overflow-hidden">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>팀원 현황</CardTitle>
              <CardDescription>각 팀원의 업무 참여 현황</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {filteredMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={member.profileImageUrl} />
                          <AvatarFallback>
                            {member.nickname.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="text-sm font-medium">{member.nickname}</h4>
                          <p className="text-xs text-gray-700">@{member.username}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {member.role === 'creator' ? '생성자' :
                             member.role === 'assignee' ? '담당자' :
                             member.role === 'member' ? '멤버' : '뷰어'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          업무: {member.taskCount}개
                        </div>
                        <div className="text-xs text-gray-700">
                          완료: {member.completedTaskCount}개
                        </div>
                        <div className="text-xs text-gray-700 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {member.commentCount}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredMembers.length === 0 && (
                    <div className="text-center py-8 text-gray-700">
                      팀원이 없습니다.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="flex-1 overflow-hidden">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>세부 작업 목록</CardTitle>
              <CardDescription>모든 세부 작업의 상세 현황</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {filteredSubTasks.map((subTask) => (
                    <div key={subTask.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium">{subTask.title}</h4>
                            {subTask.workTask && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {subTask.workTask.title}
                              </span>
                            )}
                          </div>
                          {subTask.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {subTask.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant="outline"
                              className={`text-xs border ${
                                subTask.status === 'todo' ? 'bg-gray-50 text-gray-600 border-gray-300' :
                                subTask.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                subTask.status === 'review' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-green-50 text-green-700 border-green-200'
                              }`}
                            >
                              {subTask.status === 'todo' ? 'TODO' :
                               subTask.status === 'in_progress' ? '진행중' :
                               subTask.status === 'review' ? '검토' : '완료'}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                subTask.priority === 'urgent' ? 'bg-red-100 text-red-700 border-red-200' :
                                subTask.priority === 'high' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                subTask.priority === 'medium' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                'bg-gray-100 text-gray-600 border-gray-200'
                              }`}
                            >
                              {subTask.priority === 'urgent' ? '긴급' :
                               subTask.priority === 'high' ? '높음' :
                               subTask.priority === 'medium' ? '보통' : '낮음'}
                            </Badge>
                            {subTask.comments && subTask.comments.length > 0 && (
                              <span className="text-xs text-gray-700 flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {subTask.comments.length}
                              </span>
                            )}
                          </div>

                          {/* 담당자 정보 */}
                          {subTask.assignee && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-gray-500">담당자:</span>
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={subTask.assignee.profileImageUrl} />
                                <AvatarFallback className="text-xs">
                                  {subTask.assignee.nickname.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-gray-700">{subTask.assignee.nickname}</span>
                            </div>
                          )}
                        </div>

                        {/* 날짜 정보 */}
                        <div className="text-xs text-gray-700 text-right">
                          <div>생성: {formatKoreanDate(subTask.createdAt)}</div>
                          {subTask.lastModifiedAt && (
                            <div className="mt-1">
                              <span className="text-gray-500">수정:</span>{' '}
                              {formatDistanceToNow(subTask.lastModifiedAt)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 참여자 표시 */}
                      {subTask.participants && subTask.participants.length > 0 && (
                        <div className="flex items-center gap-1 mt-3">
                          <span className="text-xs text-gray-700 mr-2">참여자:</span>
                          <div className="flex -space-x-1">
                            {subTask.participants.slice(0, 3).map((participant) => (
                              <Avatar key={participant.userId} className="h-6 w-6 border-2 border-white">
                                <AvatarImage src={participant.user.profileImageUrl} />
                                <AvatarFallback className="text-xs">
                                  {participant.user.nickname.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {subTask.participants.length > 3 && (
                              <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs border-2 border-white">
                                +{subTask.participants.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredSubTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-700">
                      세부 작업이 없습니다.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}