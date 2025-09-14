'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Plus, Trash2, Edit3, X, Check } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import api from '@/lib/api/client'

interface SetItem {
  id: string
  location: string
  items: string[]
}

interface SetListModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  initialSetList?: SetItem[]
  isReadOnly?: boolean
}

export function SetListModal({
  open,
  onOpenChange,
  projectId,
  initialSetList = [],
  isReadOnly = false,
}: SetListModalProps) {
  const [setList, setSetList] = useState<SetItem[]>(initialSetList)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadSetList()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId])

  const loadSetList = async () => {
    try {
      const response = await api.get(`/api/projects/${projectId}/story`)
      if (response.story?.setList) {
        setSetList(response.story.setList)
      }
    } catch (error) {
      console.error('Failed to load set list:', error)
    }
  }

  const handleAddSet = () => {
    const newSet: SetItem = {
      id: Date.now().toString(),
      location: '',
      items: [],
    }
    setSetList([...setList, newSet])
    setEditingId(newSet.id)
  }

  const handleUpdateSet = (id: string, field: 'location' | 'items', value: string | string[]) => {
    setSetList(setList.map(set => 
      set.id === id 
        ? { ...set, [field]: value }
        : set
    ))
  }

  const handleDeleteSet = (id: string) => {
    setSetList(setList.filter(set => set.id !== id))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await api.put(`/api/projects/${projectId}/story`, {
        setList: setList,
      })
      
      toast({
        title: '저장 완료',
        description: '세트 리스트가 저장되었습니다.',
      })
      
      setIsEditing(false)
      setEditingId(null)
    } catch (error) {
      console.error('Failed to save set list:', error)
      toast({
        title: '저장 실패',
        description: '세트 리스트 저장에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const parseItems = (itemsStr: string): string[] => {
    return itemsStr.split(',').map(item => item.trim()).filter(Boolean)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>세트 (에셋 리스트)</DialogTitle>
            {!isReadOnly && (
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsEditing(false)
                        setEditingId(null)
                        loadSetList()
                      }}
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

        <div className="mt-4 h-[70vh] overflow-y-auto space-y-4">
          {setList.map((set) => (
            <Card key={set.id} className="p-4">
              {editingId === set.id ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor={`location-${set.id}`}>장소</Label>
                    <Input
                      id={`location-${set.id}`}
                      value={set.location}
                      onChange={(e) => handleUpdateSet(set.id, 'location', e.target.value)}
                      placeholder="예: 농장집 안방"
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label htmlFor={`items-${set.id}`}>아이템 (쉼표로 구분)</Label>
                    <Textarea
                      id={`items-${set.id}`}
                      value={set.items.join(', ')}
                      onChange={(e) => handleUpdateSet(set.id, 'items', parseItems(e.target.value))}
                      placeholder="예: 침대, 크레용, 캘린더, 겨울장갑"
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      완료
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{set.location || '장소 미정'}</h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {set.items.length > 0 ? (
                          set.items.map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            >
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            아이템이 없습니다
                          </span>
                        )}
                      </div>
                    </div>
                    {isEditing && (
                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(set.id)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSet(set.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}

          {isEditing && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleAddSet}
            >
              <Plus className="h-4 w-4 mr-2" />
              세트 추가
            </Button>
          )}

          {setList.length === 0 && !isEditing && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                아직 등록된 세트가 없습니다.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}