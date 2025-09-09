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
import { useToast } from '@/components/ui/use-toast'
import { projectsAPI } from '@/lib/api/projects'
import { Loader2, UserPlus } from 'lucide-react'

interface JoinProjectModalProps {
  open: boolean
  onClose: () => void
}

export default function JoinProjectModal({ open, onClose }: JoinProjectModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [inviteCode, setInviteCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      toast({
        title: '오류',
        description: '초대 코드를 입력해주세요.',
        variant: 'destructive'
      })
      return
    }

    setIsJoining(true)
    try {
      const result = await projectsAPI.joinByInviteCode(inviteCode.trim())
      
      toast({
        title: '성공',
        description: `${result.project.name} 프로젝트에 참여했습니다!`
      })
      
      // Navigate to the joined project
      router.push(`/studio/projects/${result.project.id}`)
      onClose()
      setInviteCode('')
    } catch (error: any) {
      toast({
        title: '참여 실패',
        description: error.message || '초대 코드가 유효하지 않거나 만료되었습니다.',
        variant: 'destructive'
      })
    } finally {
      setIsJoining(false)
    }
  }

  const handleClose = () => {
    if (!isJoining) {
      setInviteCode('')
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>프로젝트 참여</DialogTitle>
          <DialogDescription>
            초대 코드를 입력하여 프로젝트에 참여하세요.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="invite-code">초대 코드</Label>
            <Input
              id="invite-code"
              placeholder="예: ABCD1234"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isJoining) {
                  handleJoin()
                }
              }}
              disabled={isJoining}
              className="font-mono uppercase"
              maxLength={10}
            />
            <p className="text-sm text-muted-foreground">
              프로젝트 관리자로부터 받은 초대 코드를 입력하세요.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isJoining}
          >
            취소
          </Button>
          <Button
            onClick={handleJoin}
            disabled={isJoining || !inviteCode.trim()}
          >
            {isJoining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                참여 중...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                참여하기
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}