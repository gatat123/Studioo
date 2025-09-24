'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Copy, Check, Loader2 } from 'lucide-react'
import { useProjectStore } from '@/store/useProjectStore'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// Validation schema for Work tasks
const workTaskSchema = z.object({
  title: z.string().min(1, '업무 제목을 입력해주세요').max(100, '업무 제목이 너무 깁니다'),
  description: z.string().max(500, '설명이 너무 깁니다').optional(),
  dueDate: z.string().optional(),
  priority: z.string().default('medium'),
})

type WorkTaskFormData = z.infer<typeof workTaskSchema>

interface CreateWorkTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateWorkTaskModal({ open, onOpenChange }: CreateWorkTaskModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [_createdProjectId, setCreatedProjectId] = useState<string | null>(null)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<WorkTaskFormData>({
    resolver: zodResolver(workTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
    },
  })

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
      // Silent fail
    }
  }

  // Handle form submission
  const onSubmit = async (data: WorkTaskFormData) => {
    try {
      setIsLoading(true)

      // Create project through API
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const token = localStorage.getItem('token');

      const requestBody = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate: selectedDate ? selectedDate.toISOString() : undefined,
      };

      console.log('Creating Work task with data:', requestBody);

      // Use Work Tasks API endpoint
      const apiUrl = backendUrl ? `${backendUrl}/api/work-tasks` : '/api/work-tasks';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '프로젝트 생성에 실패했습니다' }))
        toast({
          title: '업무 생성 실패',
          description: errorData.message || '업무를 생성하는 중 오류가 발생했습니다.',
          variant: 'destructive'
        })
        return
      }

      const responseData = await response.json()
      console.log('Work task creation response:', responseData);

      // Backend returns { success: true, data: workTask }
      const newTask = responseData.data || responseData
      console.log('Created Work task:', newTask);

      setCreatedProjectId(newTask.id)

      // Generate invite code for the created task
      if (newTask.invite_code) {
        setInviteCode(newTask.invite_code)
      } else {
        const code = generateInviteCode()
        setInviteCode(code)
      }

      // Show success state
      setShowSuccess(true)

      // TODO: Refresh work tasks list when API is ready
      // const fetchWorkTasks = useWorkTaskStore.getState().fetchWorkTasks;
      // await fetchWorkTasks();
    } catch {
      toast({
        title: '업무 생성 실패',
        description: '업무를 생성하는 중 예기치 않은 오류가 발생했습니다.',
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
              <DialogTitle>새 업무 생성</DialogTitle>
              <DialogDescription>
                팀과 함께 관리할 업무를 생성합니다.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid gap-4 py-4">
                {/* Task Title */}
                <div className="grid gap-2">
                  <Label htmlFor="title">업무 제목</Label>
                  <Input
                    id="title"
                    placeholder="예: 웹사이트 리뉴얼 설계"
                    {...register('title')}
                    disabled={isLoading}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500">{errors.title.message}</p>
                  )}
                </div>

                {/* Description */}
                <div className="grid gap-2">
                  <Label htmlFor="description">설명 (선택)</Label>
                  <Textarea
                    id="description"
                    placeholder="업무 설명을 입력해주세요"
                    {...register('description')}
                    disabled={isLoading}
                    rows={3}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500">{errors.description.message}</p>
                  )}
                </div>

                {/* Priority */}
                <div className="grid gap-2">
                  <Label htmlFor="priority">우선순위</Label>
                  <select
                    id="priority"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...register('priority')}
                    disabled={isLoading}
                  >
                    <option value="low">낮음</option>
                    <option value="medium">보통</option>
                    <option value="high">높음</option>
                    <option value="urgent">긴급</option>
                  </select>
                </div>

                {/* Due Date */}
                <div className="grid gap-2">
                  <Label htmlFor="dueDate">마감일 (선택)</Label>
                  <div className="relative">
                    <Input
                      id="dueDate"
                      type="date"
                      disabled={isLoading}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : undefined
                        setSelectedDate(date)
                        setValue('dueDate', e.target.value)
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
                  취소
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading ? '생성 중...' : '업무 생성'}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          /* Success State */
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">🎉 업무가 성공적으로 생성되었습니다!</DialogTitle>
              <DialogDescription>
                이제 팀원들과 함께 업무를 관리할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="space-y-6">
                {/* Task Info */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <Label className="text-sm text-muted-foreground">업무 제목</Label>
                  <p className="font-medium text-lg">{watch('title')}</p>
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
                      <span>팀원은 Work 페이지에서 &quot;업무 참여&quot; 버튼을 클릭합니다</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-primary">4.</span>
                      <span>초대 코드를 입력하면 업무에 참여됩니다</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => {
                // Work tasks don't have a detail page yet, just close
                handleClose()
              }} className="w-full">
                확인
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}