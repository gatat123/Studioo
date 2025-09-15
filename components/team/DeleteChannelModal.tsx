'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { channelsAPI, type Channel } from '@/lib/api/channels'

interface DeleteChannelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channel: Channel | null
  onChannelDeleted: () => void
}

export function DeleteChannelModal({
  open,
  onOpenChange,
  channel,
  onChannelDeleted
}: DeleteChannelModalProps) {
  const { toast } = useToast()
  const [confirmationText, setConfirmationText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!channel || confirmationText !== channel.name) return

    setIsDeleting(true)

    try {
      await channelsAPI.deleteChannel(channel.id)

      toast({
        title: '채널 삭제됨',
        description: `${channel.name} 채널이 영구적으로 삭제되었습니다.`
      })

      onChannelDeleted()
      onOpenChange(false)
      setConfirmationText('')
    } catch (error) {
      console.error('Failed to delete channel:', error)

      toast({
        title: '삭제 실패',
        description: '채널 삭제 중 오류가 발생했습니다. 다시 시도해주세요.',
        variant: 'destructive'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      onOpenChange(newOpen)
      if (!newOpen) {
        setConfirmationText('')
      }
    }
  }

  const isConfirmationValid = channel && confirmationText === channel.name

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            채널 삭제
          </DialogTitle>
          <DialogDescription>
            이 작업은 되돌릴 수 없습니다. 채널과 모든 메시지, 파일이 영구적으로 삭제됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">경고</p>
              <p className="text-xs text-muted-foreground">
                이 채널의 모든 데이터가 완전히 삭제되며 복구할 수 없습니다.
              </p>
            </div>
          </div>

          {channel && (
            <div className="space-y-2">
              <Label htmlFor="confirmation" className="text-sm font-medium">
                삭제를 확인하려면 채널 이름을 입력하세요:
              </Label>
              <p className="text-sm text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                {channel.name}
              </p>
              <Input
                id="confirmation"
                placeholder="채널 이름 입력"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                disabled={isDeleting}
                className={
                  confirmationText && !isConfirmationValid
                    ? 'border-destructive focus-visible:ring-destructive'
                    : ''
                }
              />
              {confirmationText && !isConfirmationValid && (
                <p className="text-xs text-destructive">
                  채널 이름이 일치하지 않습니다.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmationValid || isDeleting}
          >
            {isDeleting ? '삭제 중...' : '채널 삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}