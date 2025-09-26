'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { workTasksAPI } from '@/lib/api/work-tasks'

interface JoinWorkTaskModalProps {
  open: boolean
  onClose: () => void
}

export default function JoinWorkTaskModal({ open, onClose }: JoinWorkTaskModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [inviteCode, setInviteCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inviteCode.trim()) {
      toast({
        title: '초대 코드를 입력해주세요',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsLoading(true)

      const workTask = await workTasksAPI.joinWorkTask(inviteCode.trim())

      toast({
        title: '업무 참여 완료',
        description: `"${workTask.title}" 업무에 참여했습니다.`
      })

      onClose()
      setInviteCode('')

      // Reload the page to refresh the work tasks list
      router.refresh()
    } catch (error: any) {
      console.error('Failed to join work task:', error)
      toast({
        title: '업무 참여 실패',
        description: error.message || '유효하지 않은 초대 코드입니다.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      setInviteCode('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>업무 참여</DialogTitle>
            <DialogDescription>
              초대 코드를 입력하여 업무에 참여하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="inviteCode">초대 코드</Label>
              <Input
                id="inviteCode"
                placeholder="초대 코드 입력"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                disabled={isLoading}
                maxLength={20}
                className="font-mono text-lg tracking-wider"
              />
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
            <Button type="submit" disabled={isLoading || !inviteCode.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? '참여 중...' : '업무 참여'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}