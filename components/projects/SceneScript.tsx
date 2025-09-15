'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { 
  Save, 
  Edit3, 
  Home, 
  Trees,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import api from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface ScriptData {
  location: 'indoor' | 'outdoor'
  place: string
  time: string
  content: string
  highlights?: Array<{ start: number; end: number; color: string }>
}

interface SceneScriptProps {
  sceneId: string
  sceneNumber: number
  initialScript?: ScriptData
  isReadOnly?: boolean
}

const HIGHLIGHT_COLORS = {
  red: { label: '장소', bg: 'bg-red-200 dark:bg-red-900/50' },
  yellow: { label: '소품', bg: 'bg-yellow-200 dark:bg-yellow-900/50' },
  blue: { label: '등장인물', bg: 'bg-blue-200 dark:bg-blue-900/50' },
  green: { label: '포인트', bg: 'bg-green-200 dark:bg-green-900/50' },
}

export function SceneScript({
  sceneId,
  sceneNumber,
  initialScript,
  isReadOnly = false,
}: SceneScriptProps) {
  const [script, setScript] = useState<ScriptData>(initialScript || {
    location: 'indoor',
    place: '',
    time: '',
    content: '',
    highlights: [],
  })
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true) // Default to expanded
  const [isSaving, setIsSaving] = useState(false)
  const [selectedText, setSelectedText] = useState<{ start: number; end: number; text: string } | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadScript()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId])

  const loadScript = async () => {
    try {
      const response = await api.get(`/api/scenes/${sceneId}/script`)
      if (response.script) {
        setScript(response.script)
      }
    } catch {
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await api.put(`/api/scenes/${sceneId}/script`, script)
      
      toast({
        title: '저장 완료',
        description: '스크립트가 저장되었습니다.',
      })
      
      setIsEditing(false)
    } catch {
      toast({
        title: '저장 실패',
        description: '스크립트 저장에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      const text = selection.toString()
      const range = selection.getRangeAt(0)
      const preSelectionRange = range.cloneRange()
      const textArea = document.getElementById(`script-content-${sceneId}`)
      
      if (textArea) {
        preSelectionRange.selectNodeContents(textArea)
        preSelectionRange.setEnd(range.startContainer, range.startOffset)
        const start = preSelectionRange.toString().length
        
        setSelectedText({
          start,
          end: start + text.length,
          text,
        })
      }
    }
  }

  const applyHighlight = (color: string) => {
    if (!selectedText) return

    const newHighlight = {
      start: selectedText.start,
      end: selectedText.end,
      color,
    }

    // Remove overlapping highlights and add new one
    const filteredHighlights = (script.highlights || []).filter(
      h => h.end <= newHighlight.start || h.start >= newHighlight.end
    )

    setScript({
      ...script,
      highlights: [...filteredHighlights, newHighlight].sort((a, b) => a.start - b.start),
    })

    setSelectedText(null)
  }

  const renderHighlightedText = (text: string, highlights: Array<{ start: number; end: number; color: string }> = []) => {
    if (!highlights.length) return text

    const elements = []
    let lastIndex = 0

    highlights.forEach((highlight, i) => {
      // Add text before highlight
      if (highlight.start > lastIndex) {
        elements.push(
          <span key={`text-${i}`}>{text.substring(lastIndex, highlight.start)}</span>
        )
      }

      // Add highlighted text
      const colorClass = HIGHLIGHT_COLORS[highlight.color as keyof typeof HIGHLIGHT_COLORS]?.bg || ''
      elements.push(
        <span
          key={`highlight-${i}`}
          className={cn('px-1 rounded', colorClass)}
        >
          {text.substring(highlight.start, highlight.end)}
        </span>
      )

      lastIndex = highlight.end
    })

    // Add remaining text
    if (lastIndex < text.length) {
      elements.push(<span key="text-end">{text.substring(lastIndex)}</span>)
    }

    return elements
  }

  return (
    <Card className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 w-[90%] max-w-3xl shadow-lg">
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">씬 {sceneNumber} 스크립트</span>
            {script.location === 'indoor' ? (
              <Home className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Trees className="h-4 w-4 text-muted-foreground" />
            )}
            {script.place && (
              <span className="text-sm text-muted-foreground">{script.place}</span>
            )}
            {script.time && (
              <span className="text-sm text-muted-foreground">• {script.time}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditing(!isEditing)
                  if (!isExpanded) {
                    setIsExpanded(true) // Expand when edit is clicked
                  }
                }}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="space-y-3">
            {isEditing ? (
              <>
                {/* Location, Place, Time inputs */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">위치</Label>
                    <RadioGroup
                      value={script.location}
                      onValueChange={(value) => setScript({ ...script, location: value as 'indoor' | 'outdoor' })}
                      className="flex items-center gap-4 mt-1"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="indoor" id="indoor" />
                        <Label htmlFor="indoor" className="text-sm">실내</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="outdoor" id="outdoor" />
                        <Label htmlFor="outdoor" className="text-sm">실외</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label htmlFor="place" className="text-xs">장소</Label>
                    <Input
                      id="place"
                      value={script.place}
                      onChange={(e) => setScript({ ...script, place: e.target.value })}
                      placeholder="예: 농장의 침실"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="time" className="text-xs">시간</Label>
                    <Input
                      id="time"
                      value={script.time}
                      onChange={(e) => setScript({ ...script, time: e.target.value })}
                      placeholder="예: 낮"
                      className="h-8"
                    />
                  </div>
                </div>

                {/* Script content with highlight tools */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">스크립트</Label>
                    {selectedText && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground mr-2">
                          &quot;{selectedText.text}&quot; 강조:
                        </span>
                        {Object.entries(HIGHLIGHT_COLORS).map(([color, config]) => (
                          <Button
                            key={color}
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={() => applyHighlight(color)}
                          >
                            <div className={cn('w-3 h-3 rounded', config.bg)} />
                            <span className="ml-1 text-xs">{config.label}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Textarea
                    id={`script-content-${sceneId}`}
                    value={script.content}
                    onChange={(e) => setScript({ ...script, content: e.target.value })}
                    onMouseUp={handleTextSelection}
                    placeholder="씬의 스크립트를 작성하세요..."
                    className="min-h-[150px] resize-none"
                  />
                </div>

                {/* Save button */}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    저장
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Display mode */}
                {script.content ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm">
                      {renderHighlightedText(script.content, script.highlights)}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    스크립트가 작성되지 않았습니다.
                  </p>
                )}

                {/* Highlight legend */}
                {script.highlights && script.highlights.length > 0 && (
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">강조:</span>
                    {Object.entries(HIGHLIGHT_COLORS).map(([color, config]) => (
                      <div key={color} className="flex items-center gap-1">
                        <div className={cn('w-3 h-3 rounded', config.bg)} />
                        <span className="text-xs">{config.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}