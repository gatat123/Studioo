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
import { Plus, Trash2, Edit3, X, Check, User } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import api from '@/lib/api/client'

interface Character {
  id: string
  name: string
  age: string
  description: string
}

interface CharacterListModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  initialCharacterList?: Character[]
  isReadOnly?: boolean
}

export function CharacterListModal({
  open,
  onOpenChange,
  projectId,
  initialCharacterList = [],
  isReadOnly = false,
}: CharacterListModalProps) {
  const [characterList, setCharacterList] = useState<Character[]>(initialCharacterList)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadCharacterList()
    }
  }, [open, projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadCharacterList = async () => {
    try {
      const response = await api.get(`/api/projects/${projectId}/story`)
      if (response.story?.characterList) {
        setCharacterList(response.story.characterList)
      }
    } catch (error) {
      console.error('Failed to load character list:', error)
    }
  }

  const handleAddCharacter = () => {
    const newCharacter: Character = {
      id: Date.now().toString(),
      name: '',
      age: '',
      description: '',
    }
    setCharacterList([...characterList, newCharacter])
    setEditingId(newCharacter.id)
  }

  const handleUpdateCharacter = (id: string, field: keyof Character, value: string) => {
    setCharacterList(characterList.map(char => 
      char.id === id 
        ? { ...char, [field]: value }
        : char
    ))
  }

  const handleDeleteCharacter = (id: string) => {
    setCharacterList(characterList.filter(char => char.id !== id))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await api.put(`/api/projects/${projectId}/story`, {
        characterList: characterList,
      })
      
      toast({
        title: '저장 완료',
        description: '캐릭터 리스트가 저장되었습니다.',
      })
      
      setIsEditing(false)
      setEditingId(null)
    } catch (error) {
      console.error('Failed to save character list:', error)
      toast({
        title: '저장 실패',
        description: '캐릭터 리스트 저장에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>캐릭터</DialogTitle>
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
                        loadCharacterList()
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
          {characterList.map((character) => (
            <Card key={character.id} className="p-4">
              {editingId === character.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`name-${character.id}`}>이름</Label>
                      <Input
                        id={`name-${character.id}`}
                        value={character.name}
                        onChange={(e) => handleUpdateCharacter(character.id, 'name', e.target.value)}
                        placeholder="예: 미아"
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label htmlFor={`age-${character.id}`}>나이</Label>
                      <Input
                        id={`age-${character.id}`}
                        value={character.age}
                        onChange={(e) => handleUpdateCharacter(character.id, 'age', e.target.value)}
                        placeholder="예: 40대"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`desc-${character.id}`}>설명</Label>
                    <Textarea
                      id={`desc-${character.id}`}
                      value={character.description}
                      onChange={(e) => handleUpdateCharacter(character.id, 'description', e.target.value)}
                      placeholder="예: 임신한 상태, 신발커버 신고있음, 예정일을 상상하며 기뻐하는 즐거움 & 소리를 내면 안되고 아이들을 관리해야하는 긴장감이 공존하는 마음상태"
                      className="min-h-[100px]"
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
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900">
                          <User className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div>
                          <h4 className="font-medium">
                            {character.name || '이름 미정'}
                            {character.age && (
                              <span className="text-sm text-muted-foreground ml-2">
                                ({character.age})
                              </span>
                            )}
                          </h4>
                        </div>
                      </div>
                      {character.description && (
                        <p className="text-sm text-muted-foreground ml-[52px]">
                          {character.description}
                        </p>
                      )}
                    </div>
                    {isEditing && (
                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(character.id)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCharacter(character.id)}
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
              onClick={handleAddCharacter}
            >
              <Plus className="h-4 w-4 mr-2" />
              캐릭터 추가
            </Button>
          )}

          {characterList.length === 0 && !isEditing && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                아직 등록된 캐릭터가 없습니다.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}