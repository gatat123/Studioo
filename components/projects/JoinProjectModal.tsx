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
import { useToast } from '@/hooks/use-toast'
import { projectsAPI } from '@/lib/api/projects'
import { Loader2, UserPlus, Info, ClipboardPaste } from 'lucide-react'

interface JoinProjectModalProps {
  open: boolean
  onClose: () => void
}

export default function JoinProjectModal({ open, onClose }: JoinProjectModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [inviteCode, setInviteCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const cleanCode = text.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (cleanCode) {
        setInviteCode(cleanCode)
      }
    } catch {
    }
  }

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
        title: '🎉 참여 성공!',
        description: `${result.name || '프로젝트'}에 성공적으로 참여했습니다!`
      })

      // Navigate to the joined project
      router.push(`/studio/projects/${result.id}`)
      onClose()
      setInviteCode('')
    } catch (error) {
      toast({
        title: '참여 실패',
        description: (error as Error).message || '초대 코드가 유효하지 않거나 만료되었습니다.',
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">프로젝트 참여하기</DialogTitle>
          <DialogDescription>
            팀원으로부터 받은 초대 코드를 입력하여 프로젝트에 참여하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Guide Section */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4 text-primary" />
              <span>초대 코드 입력 방법</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground pl-6">
              <p>• 프로젝트 관리자로부터 8자리 초대 코드를 받으세요</p>
              <p>• 코드는 대소문자를 구분하지 않습니다</p>
              <p>• 한 번 참여하면 언제든지 프로젝트에 접근할 수 있습니다</p>
            </div>
          </div>

          {/* Input Section */}
          <div className="space-y-2">
            <Label htmlFor="invite-code">초대 코드</Label>
            <div className="flex gap-2">
              <Input
                id="invite-code"
                placeholder="예: ABCD1234"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isJoining) {
                    handleJoin()
                  }
                }}
                disabled={isJoining}
                className="font-mono uppercase text-lg tracking-wider text-center"
                maxLength={16}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handlePasteCode}
                disabled={isJoining}
                title="클립보드에서 붙여넣기"
              >
                <ClipboardPaste className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              초대 코드를 복사했다면 붙여넣기 버튼을 클릭하세요
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