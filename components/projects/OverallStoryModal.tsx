'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Edit3, X, Check } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import api from '@/lib/api/client'

interface OverallStoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  initialStory?: string
  isReadOnly?: boolean
}

export function OverallStoryModal({
  open,
  onOpenChange,
  projectId,
  initialStory = '',
  isReadOnly = false,
}: OverallStoryModalProps) {
  const [story, setStory] = useState(initialStory)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setStory(initialStory)
      setIsEditing(false)
    }
  }, [open, initialStory])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await api.put(`/api/projects/${projectId}/story`, {
        overallStory: story,
      })
      
      toast({
        title: '저장 완료',
        description: '전체 스토리가 저장되었습니다.',
      })
      
      setIsEditing(false)
    } catch {
      toast({
        title: '저장 실패',
        description: '스토리 저장에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setStory(initialStory)
    setIsEditing(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>전체 스토리</DialogTitle>
            {!isReadOnly && (
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4 mr-1" />
                      취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      저장
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    편집
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="mt-4 h-[70vh] overflow-y-auto">
          {isEditing ? (
            <Textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="프로젝트의 전체 스토리를 작성하세요..."
              className="min-h-[60vh] resize-none"
              autoFocus
            />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {story ? (
                <div className="whitespace-pre-wrap">{story}</div>
              ) : (
                <p className="text-muted-foreground">
                  아직 작성된 스토리가 없습니다.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}