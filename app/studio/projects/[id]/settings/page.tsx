'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { CalendarIcon, Copy, Trash2, UserPlus, Users, Settings, Bell, Archive } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { projectsAPI } from '@/lib/api/projects'
import ParticipantsList from '@/components/projects/ParticipantsList'
import NotificationSettings from '@/components/projects/NotificationSettings'

const projectFormSchema = z.object({
  name: z.string().min(1, '프로젝트 이름은 필수입니다'),
  description: z.string().optional(),
  tag: z.enum(['illustration', 'storyboard']).optional(),
  deadline: z.date().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
})

type ProjectFormValues = z.infer<typeof projectFormSchema>

export default function ProjectSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const projectId = params.id as string
  
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [inviteCode, setInviteCode] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      tag: 'illustration',
      deadline: undefined,
      status: 'active',
    },
  })

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const data = await projectsAPI.getProject(projectId)
        setProject(data)
        setInviteCode(data.inviteCode || '')
        form.reset({
          name: data.name,
          description: data.description || '',
          tag: data.tag || 'illustration',
          deadline: data.deadline ? new Date(data.deadline) : undefined,
          status: data.status || 'active',
        })
      } catch (error) {
        console.error('프로젝트 로드 실패:', error)
        toast({
          title: '오류',
          description: '프로젝트를 불러올 수 없습니다.',
          variant: 'destructive',
        })
        router.push('/studio')
      } finally {
        setLoading(false)
      }
    }
    
    fetchProject()
  }, [projectId, router, form])

  const onSubmit = async (data: ProjectFormValues) => {
    if (!project) return

    try {
      const updateData = {
        name: data.name,
        description: data.description,
        tag: data.tag,
        deadline: data.deadline?.toISOString(),
        status: data.status,
      }
      
      const updatedProject = await projectsAPI.updateProject(projectId, updateData)
      setProject(updatedProject)
      
      toast({
        title: '설정 업데이트',
        description: '프로젝트 설정이 저장되었습니다.',
      })
    } catch (error) {
      console.error('프로젝트 업데이트 실패:', error)
      toast({
        title: '오류',
        description: '프로젝트 업데이트에 실패했습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleGenerateInviteCode = async () => {
    try {
      const result = await projectsAPI.generateInviteCode(projectId)
      setInviteCode(result.inviteCode)
      toast({
        title: '초대 코드 생성',
        description: '새로운 초대 코드가 생성되었습니다.',
      })
    } catch (error) {
      console.error('초대 코드 생성 실패:', error)
      toast({
        title: '오류',
        description: '초대 코드 생성에 실패했습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode)
    toast({
      title: 'Copied!',
      description: 'Invitation code copied to clipboard.',
    })
  }

  const handleDeleteProject = async () => {
    setIsDeleting(true)
    
    try {
      await projectsAPI.deleteProject(projectId)
      
      toast({
        title: '프로젝트 삭제',
        description: '프로젝트가 영구적으로 삭제되었습니다.',
      })
      
      router.push('/studio')
    } catch (error) {
      console.error('프로젝트 삭제 실패:', error)
      toast({
        title: '오류',
        description: '프로젝트 삭제에 실패했습니다.',
        variant: 'destructive',
      })
      setIsDeleting(false)
    }
  }

  const handleArchiveProject = async () => {
    try {
      await projectsAPI.updateProject(projectId, { status: 'archived' })
      toast({
        title: '프로젝트 보관',
        description: '프로젝트가 보관되었습니다.',
      })
    } catch (error) {
      console.error('프로젝트 보관 실패:', error)
      toast({
        title: '오류',
        description: '프로젝트 보관에 실패했습니다.',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!project) {
    return null
  }

  return (
    <div className="container max-w-6xl mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Project Settings</h1>
        <p className="text-gray-600 mt-2">{project.name}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
              <CardDescription>
                Update your project details and configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter project name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter project description"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Provide a brief description of your project
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select project type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="illustration">Illustration</SelectItem>
                            <SelectItem value="storyboard">Storyboard</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Deadline</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date()
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Set a deadline for your project
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit">Save Changes</Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invitation Code</CardTitle>
              <CardDescription>
                Share this code with others to invite them to your project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input
                  value={inviteCode}
                  readOnly
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyInviteCode}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateInviteCode}
                className="w-full"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Generate New Code
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Members</CardTitle>
              <CardDescription>
                Manage team members and their roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ParticipantsList projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you receive updates about this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationSettings projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Archive Project</CardTitle>
              <CardDescription>
                Archive this project to remove it from your active projects list
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={handleArchiveProject}
                className="w-full sm:w-auto"
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive Project
              </Button>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Permanently delete this project and all its data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={isDeleting}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete Project'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      project and remove all associated data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteProject}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete Project
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
