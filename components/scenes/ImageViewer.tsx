'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  RotateCw,
  Download,
  Maximize2,
  Upload,
  Image as ImageIcon,
  Mouse
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { socketClient } from '@/lib/socket/client'
import { useToast } from '@/hooks/use-toast'

interface ImageViewerProps {
  sceneId: string
  lineartImage?: string | null
  artImage?: string | null
}

export default function ImageViewer({ sceneId, lineartImage, artImage }: ImageViewerProps) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [activeTab, setActiveTab] = useState<'lineart' | 'art'>('lineart')
  const [isDragging, setIsDragging] = useState(false)
  const [isImageSelected, setIsImageSelected] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 })
  const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [currentLineartImage, setCurrentLineartImage] = useState(lineartImage)
  const [currentArtImage, setCurrentArtImage] = useState(artImage)
  const { toast } = useToast()

  // Props로 받은 이미지가 변경되면 상태 업데이트
  useEffect(() => {
    setCurrentLineartImage(lineartImage)
    setCurrentArtImage(artImage)
  }, [lineartImage, artImage])

  // Socket.io 실시간 이미지 업데이트
  useEffect(() => {
    if (!sceneId) return

    const socket = socketClient.connect()

    // 이미지 업로드 이벤트 핸들러
    const handleImageUploaded = (data: { image: any, sceneId: string }) => {
      console.log(`[ImageViewer] Image uploaded event received:`, data)

      if (data.sceneId === sceneId) {
        if (data.image.type === 'lineart') {
          setCurrentLineartImage(data.image.fileUrl)
        } else if (data.image.type === 'art') {
          setCurrentArtImage(data.image.fileUrl)
        }

        toast({
          title: '이미지 업로드 완료',
          description: `새로운 ${data.image.type === 'lineart' ? '선화' : '아트'} 이미지가 업로드되었습니다.`,
        })
      }
    }

    // 이미지 업데이트 이벤트 핸들러
    const handleImageUpdated = (data: { image: any, sceneId: string }) => {
      console.log(`[ImageViewer] Image updated event received:`, data)

      if (data.sceneId === sceneId) {
        if (data.image.type === 'lineart') {
          setCurrentLineartImage(data.image.fileUrl)
        } else if (data.image.type === 'art') {
          setCurrentArtImage(data.image.fileUrl)
        }

        toast({
          title: '이미지 업데이트 완료',
          description: `${data.image.type === 'lineart' ? '선화' : '아트'} 이미지가 업데이트되었습니다.`,
        })
      }
    }

    // 이미지 삭제 이벤트 핸들러
    const handleImageDeleted = (data: { imageId: string, sceneId: string }) => {
      console.log(`[ImageViewer] Image deleted event received:`, data)

      if (data.sceneId === sceneId) {
        // 어떤 타입의 이미지가 삭제되었는지 정확히 파악하기 어려우므로
        // 전체 씬 데이터를 다시 로드하거나 추가 정보가 필요할 수 있습니다.
        toast({
          title: '이미지 삭제됨',
          description: '이미지가 삭제되었습니다.',
        })
      }
    }

    // 이벤트 리스너 등록
    socket.on('scene:image-uploaded', handleImageUploaded)
    socket.on('scene:image-updated', handleImageUpdated)
    socket.on('scene:image-deleted', handleImageDeleted)

    return () => {
      // 이벤트 리스너 제거
      socket.off('scene:image-uploaded', handleImageUploaded)
      socket.off('scene:image-updated', handleImageUpdated)
      socket.off('scene:image-deleted', handleImageDeleted)
    }
  }, [sceneId, toast])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isImageSelected) return
    
    e.preventDefault()
    const delta = e.deltaY > 0 ? -10 : 10
    setZoom(prev => {
      const newZoom = prev + delta
      return Math.min(Math.max(newZoom, 25), 500)
    })
  }, [isImageSelected])

  const handleImageClick = () => {
    setIsImageSelected(!isImageSelected)
  }

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsImageSelected(false)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 100 && isImageSelected) {
      setIsPanning(true)
      setStartPanPosition({
        x: e.clientX - panPosition.x,
        y: e.clientY - panPosition.y
      })
    }
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
      setPanPosition({
        x: e.clientX - startPanPosition.x,
        y: e.clientY - startPanPosition.y
      })
    }
  }, [isPanning, startPanPosition])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isPanning, handleMouseMove, handleMouseUp])

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handleReset = () => {
    setZoom(100)
    setRotation(0)
    setPanPosition({ x: 0, y: 0 })
    setIsImageSelected(false)
  }

  const handleFileUpload = async (_type: 'lineart' | 'art', _file: File) => {
    // TODO: 파일 업로드 API 호출
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find(file => file.type.startsWith('image/'))
    
    if (imageFile) {
      handleFileUpload(activeTab, imageFile)
    }
  }

  const currentImage = activeTab === 'lineart' ? currentLineartImage : currentArtImage

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b bg-background/95 backdrop-blur p-2">
        <div className="flex items-center justify-between">
          {/* Image Type Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'lineart' | 'art')}>
            <TabsList>
              <TabsTrigger value="lineart">
                <ImageIcon className="h-4 w-4 mr-2" />
                선화
              </TabsTrigger>
              <TabsTrigger value="art">
                <ImageIcon className="h-4 w-4 mr-2" />
                아트
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded">
              <Mouse className="h-3 w-3" />
              <span className="text-xs text-muted-foreground">
                클릭 후 스크롤로 확대
              </span>
            </div>
            <span className={cn(
              "text-sm font-medium px-2",
              isImageSelected && "text-primary"
            )}>
              {zoom}%
            </span>
            <Button variant="outline" size="icon" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleReset}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            {currentImage && (
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Image Display Area */}
      <div 
        ref={containerRef}
        className={cn(
          "flex-1 relative overflow-hidden bg-muted/20",
          isDragging && "bg-primary/10 border-2 border-dashed border-primary"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onWheel={handleWheel}
        onClick={handleContainerClick}
      >
        <div className="min-h-full flex items-center justify-center p-8">
          {currentImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={currentImage}
                alt={`${activeTab} image`}
                className={cn(
                  "max-w-full h-auto transition-all duration-200",
                  isImageSelected && "ring-2 ring-primary ring-offset-2",
                  isPanning && "cursor-grabbing",
                  zoom > 100 && isImageSelected && !isPanning && "cursor-grab"
                )}
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg) translate(${panPosition.x}px, ${panPosition.y}px)`,
                  transition: isPanning ? 'none' : 'transform 0.2s ease-in-out'
                }}
                onClick={handleImageClick}
                onMouseDown={handleMouseDown}
              />
            </>
          ) : (
            <Card className="p-12 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">
                {activeTab === 'lineart' ? '선화' : '아트'} 이미지 업로드
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                이미지를 드래그하거나 클릭하여 업로드하세요
              </p>
              <Button variant="outline" asChild>
                <label>
                  파일 선택
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(activeTab, file)
                    }}
                  />
                </label>
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                지원 형식: JPEG, PNG, WebP
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
