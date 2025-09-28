'use client'

import { useState, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X, FileIcon, ImageIcon, FileText, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface FileUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFileSelect: (file: File, caption?: string) => void
  maxSize?: number // in MB
  acceptedTypes?: string[]
}

export function FileUploadModal({
  open,
  onOpenChange,
  onFileSelect,
  maxSize = 10, // 10MB default
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.txt', '.zip']
}: FileUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = useCallback((file: File) => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: '파일 크기 초과',
        description: `파일 크기는 ${maxSize}MB를 초과할 수 없습니다.`,
        variant: 'destructive'
      })
      return
    }

    setSelectedFile(file)

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }, [maxSize, toast])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [handleFileSelect])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }, [handleFileSelect])

  const handleSubmit = () => {
    if (!selectedFile) return
    onFileSelect(selectedFile, caption)

    // Reset state
    setSelectedFile(null)
    setPreview(null)
    setCaption('')
    onOpenChange(false)
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setPreview(null)
    setCaption('')
    onOpenChange(false)
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="h-8 w-8" />
    if (file.type === 'application/pdf') return <FileText className="h-8 w-8" />
    return <FileIcon className="h-8 w-8" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>파일 업로드</DialogTitle>
          <DialogDescription>
            이미지, 문서 또는 파일을 업로드하세요 (최대 {maxSize}MB)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedFile ? (
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                dragActive ? "border-primary bg-primary/5" : "border-border",
                "hover:border-primary hover:bg-primary/5 cursor-pointer"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                클릭하거나 파일을 드래그하여 업로드
              </p>
              <p className="text-xs text-muted-foreground">
                이미지, PDF, 문서 파일 지원
              </p>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={acceptedTypes.join(',')}
                onChange={handleChange}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Preview */}
              <div className="relative border rounded-lg p-4">
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => {
                    setSelectedFile(null)
                    setPreview(null)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>

                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-48 object-contain rounded"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    {getFileIcon(selectedFile)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Caption Input */}
              <div className="space-y-2">
                <Label htmlFor="caption">설명 (선택사항)</Label>
                <Input
                  id="caption"
                  placeholder="파일에 대한 설명을 입력하세요..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={!selectedFile}>
              <Upload className="h-4 w-4 mr-2" />
              업로드
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}