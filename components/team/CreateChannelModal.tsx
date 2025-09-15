'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { channelsAPI } from '@/lib/api/channels'
import { useToast } from '@/hooks/use-toast'
import { Hash, Lock } from 'lucide-react'

interface CreateChannelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChannelCreated: () => void
  studioId?: string
}

export function CreateChannelModal({ open, onOpenChange, onChannelCreated, studioId }: CreateChannelModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'public' as 'public' | 'private'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast({
        title: '오류',
        description: '채널 이름을 입력해주세요',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      await channelsAPI.createChannel({
        ...formData,
        studioId
      })
      
      toast({
        title: '성공',
        description: '채널이 생성되었습니다'
      })
      
      onChannelCreated()
      onOpenChange(false)
      setFormData({ name: '', description: '', type: 'public' })
    } catch {
      toast({
        title: '오류',
        description: (error as {response?: {data?: {error?: string}}}).response?.data?.error || '채널 생성에 실패했습니다',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>새 채널 만들기</DialogTitle>
            <DialogDescription>
              팀원들과 소통할 새로운 채널을 만들어보세요
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">채널 이름</Label>
              <Input
                id="name"
                placeholder="예: general, design-team"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={loading}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">설명 (선택사항)</Label>
              <Textarea
                id="description"
                placeholder="이 채널의 목적을 설명해주세요"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={loading}
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <Label>채널 유형</Label>
              <RadioGroup 
                value={formData.type} 
                onValueChange={(value) => setFormData({ ...formData, type: value as 'public' | 'private' })}
                disabled={loading}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer">
                    <Hash className="h-4 w-4" />
                    <div>
                      <p className="font-medium">공개 채널</p>
                      <p className="text-xs text-muted-foreground">모든 팀원이 참여할 수 있습니다</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" />
                  <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer">
                    <Lock className="h-4 w-4" />
                    <div>
                      <p className="font-medium">비공개 채널</p>
                      <p className="text-xs text-muted-foreground">초대받은 멤버만 참여할 수 있습니다</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '생성 중...' : '채널 만들기'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}