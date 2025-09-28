'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileIcon, FileText, ImageIcon, Film, Music, Archive, Code } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageAttachmentProps {
  file: {
    id: string
    fileName: string
    fileUrl: string
    fileSize: number
    mimeType: string
  }
  className?: string
}

export function MessageAttachment({ file, className }: MessageAttachmentProps) {
  const [imageError, setImageError] = useState(false)

  const getFileIcon = () => {
    const type = file.mimeType?.toLowerCase() || ''

    if (type.startsWith('image/')) return <ImageIcon className="h-5 w-5" />
    if (type.startsWith('video/')) return <Film className="h-5 w-5" />
    if (type.startsWith('audio/')) return <Music className="h-5 w-5" />
    if (type === 'application/pdf') return <FileText className="h-5 w-5" />
    if (type.includes('zip') || type.includes('rar') || type.includes('tar'))
      return <Archive className="h-5 w-5" />
    if (type.includes('javascript') || type.includes('typescript') || type.includes('python') || type.includes('java'))
      return <Code className="h-5 w-5" />

    return <FileIcon className="h-5 w-5" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(file.fileUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const isImage = file.mimeType?.startsWith('image/') && !imageError

  return (
    <div className={cn("mt-2", className)}>
      {isImage ? (
        <div className="relative group max-w-sm">
          <img
            src={file.fileUrl}
            alt={file.fileName}
            className="rounded-lg max-h-64 w-auto cursor-pointer"
            onClick={() => window.open(file.fileUrl, '_blank')}
            onError={() => setImageError(true)}
          />
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg max-w-sm">
          <div className="flex-shrink-0 text-muted-foreground">
            {getFileIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.fileSize)}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}