'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Copy, Check, Loader2 } from 'lucide-react'
import { useProjectStore } from '@/store/useProjectStore'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// Validation schema
const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name is too long'),
  type: z.enum(['illustration', 'storyboard'], {
    required_error: 'Please select a project type',
  }),
  description: z.string().max(500, 'Description is too long').optional(),
  deadline: z.string().optional(),
})

type ProjectFormData = z.infer<typeof projectSchema>

interface CreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateProjectModal({ open, onOpenChange }: CreateProjectModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  
  // Removed unused store methods

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  // Removed unused projectType
  // Generate invite code
  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  // Copy invite code to clipboard
  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
    }
  }

  // Handle form submission
  const onSubmit = async (data: ProjectFormData) => {
    try {
      setIsLoading(true)
      
      // Create project through API
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${backendUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          tag: data.type as 'illustration' | 'storyboard',
          deadline: selectedDate ? selectedDate.toISOString() : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create project' }))
        toast({
          title: '프로젝트 생성 실패',
          description: errorData.message || '프로젝트를 생성하는 중 오류가 발생했습니다.',
          variant: 'destructive'
        })
        return
      }

      const responseData = await response.json()
      // Backend returns { success: true, data: project }
      const newProject = responseData.data || responseData
      setCreatedProjectId(newProject.id)
      
      // Generate invite code for the created project
      if (newProject.inviteCode) {
        setInviteCode(newProject.inviteCode)
      } else {
        const code = generateInviteCode()
        setInviteCode(code)
      }
      
      // Show success state
      setShowSuccess(true)
      
      // Refresh projects list
      const fetchProjects = useProjectStore.getState().fetchProjects;
      await fetchProjects();
    } catch {
      toast({
        title: '프로젝트 생성 실패',
        description: '프로젝트를 생성하는 중 예기치 않은 오류가 발생했습니다.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Reset modal when closed
  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false)
      setTimeout(() => {
        reset()
        setShowSuccess(false)
        setInviteCode('')
        setCopied(false)
        setSelectedDate(undefined)
      }, 200)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {!showSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new project and invite collaborators to work together.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid gap-4 py-4">
                {/* Project Name */}
                <div className="grid gap-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter project name"
                    {...register('name')}
                    disabled={isLoading}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>

                {/* Project Type */}
                <div className="grid gap-2">
                  <Label htmlFor="type">Project Type</Label>                  <Select
                    disabled={isLoading}
                    onValueChange={(value) => setValue('type', value as 'illustration' | 'storyboard')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="illustration">Illustration</SelectItem>
                      <SelectItem value="storyboard">Storyboard</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type && (
                    <p className="text-sm text-red-500">{errors.type.message}</p>
                  )}
                </div>

                {/* Description */}
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter project description"
                    {...register('description')}
                    disabled={isLoading}
                    rows={3}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500">{errors.description.message}</p>
                  )}
                </div>
                {/* Deadline */}
                <div className="grid gap-2">
                  <Label htmlFor="deadline">Deadline (Optional)</Label>
                  <div className="relative">
                    <Input
                      id="deadline"
                      type="date"
                      disabled={isLoading}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : undefined
                        setSelectedDate(date)
                        setValue('deadline', e.target.value)
                      }}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading ? 'Creating...' : 'Create Project'}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          /* Success State */
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">🎉 프로젝트가 성공적으로 생성되었습니다!</DialogTitle>
              <DialogDescription>
                이제 팀원들과 함께 작업할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="space-y-6">
                {/* Project Info */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <Label className="text-sm text-muted-foreground">프로젝트 이름</Label>
                  <p className="font-medium text-lg">{watch('name')}</p>
                </div>

                {/* Invite Code Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-1 bg-primary rounded-full" />
                    <Label className="text-base font-semibold">초대 코드</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/20 rounded-lg font-mono text-2xl font-bold text-center tracking-wider">
                      {inviteCode}
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={copyInviteCode}
                      className="shrink-0 h-12 w-12"
                    >
                      {copied ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                  {copied && (
                    <p className="text-sm text-green-600 font-medium">
                      ✓ 초대 코드가 복사되었습니다!
                    </p>
                  )}
                </div>

                {/* How to Guide */}
                <div className="space-y-3 border-t pt-4">
                  <Label className="text-sm font-semibold">팀원 초대 방법</Label>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex gap-2">
                      <span className="font-semibold text-primary">1.</span>
                      <span>위 초대 코드를 복사하세요</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-primary">2.</span>
                      <span>팀원에게 초대 코드를 전달하세요</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-primary">3.</span>
                      <span>팀원은 스튜디오 홈에서 &quot;프로젝트 참가&quot; 버튼을 클릭합니다</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-primary">4.</span>
                      <span>초대 코드를 입력하면 프로젝트에 참여됩니다</span>
                    </div>
                  </div>
                </div>

                {/* Tip */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <span className="font-semibold">팁:</span> 프로젝트 설정 페이지에서 언제든지 초대 코드를 확인할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => {
                if (createdProjectId) {
                  router.push(`/studio/projects/${createdProjectId}`)
                }
                handleClose()
              }} className="w-full">
                Go to Project
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}