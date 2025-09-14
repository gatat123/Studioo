'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Scene, Image } from '@/types'
import api from '@/lib/api/client'

interface ScenePlayModalProps {
  scenes: Scene[]
  imageType: 'lineart' | 'art'
  onClose: () => void
}

interface ScriptData {
  location: 'indoor' | 'outdoor'
  place: string
  time: string
  content: string
  highlights?: Array<{ start: number; end: number; color: string }>
}

export default function ScenePlayModal({ scenes, imageType, onClose }: ScenePlayModalProps) {
  const [sceneImages, setSceneImages] = useState<{ scene: Scene; image: Image | null; script?: ScriptData }[]>([])
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load scenes with images and scripts
  useEffect(() => {
    const loadScenesData = async () => {
      setIsLoading(true)
      try {
        const imagesWithScenes = await Promise.all(
          scenes.map(async (scene) => {
            const currentImage = scene.images?.find(
              (img: Image) => img.type === imageType && img.isCurrent
            )

            // Load script data for each scene
            let scriptData: ScriptData | undefined = undefined
            try {
              const response = await api.get(`/api/scenes/${scene.id}/script`)
              if (response.script) {
                scriptData = response.script
              }
            } catch (error) {
              console.error(`Failed to load script for scene ${scene.id}:`, error)
            }

            return {
              scene,
              image: currentImage || null,
              script: scriptData
            }
          })
        )
        setSceneImages(imagesWithScenes)
      } catch (error) {
        console.error('Failed to load scenes data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadScenesData()
  }, [scenes, imageType])

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight - container.clientHeight

    // Calculate scene transition progress
    const sceneHeight = scrollHeight / Math.max(sceneImages.length - 1, 1)
    const newSceneIndex = Math.min(
      Math.floor(scrollTop / sceneHeight),
      sceneImages.length - 1
    )

    // Calculate progress within current scene transition (0 to 1)
    const sceneProgress = (scrollTop % sceneHeight) / sceneHeight

    setCurrentSceneIndex(newSceneIndex)
    setScrollProgress(sceneProgress)
  }, [sceneImages.length])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Calculate opacity for fade transitions
  const calculateOpacity = (index: number) => {
    if (index === currentSceneIndex) {
      // Current scene fading out
      return 1 - scrollProgress * 0.5
    } else if (index === currentSceneIndex + 1) {
      // Next scene fading in
      return scrollProgress
    }
    return 0
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
        <div className="text-white">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h2 className="text-white text-xl font-semibold">
              씬 플레이 모드
            </h2>
            <p className="text-white/60 text-sm mt-1">
              {imageType === 'lineart' ? '선화' : '아트'} • {scenes.length}개 씬
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
        {sceneImages.map((_, index) => (
          <div
            key={index}
            className={`h-1 w-8 rounded-full transition-all duration-300 ${
              index <= currentSceneIndex
                ? 'bg-white'
                : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* Scrollable Container with Extended Height */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-auto overflow-x-hidden scrollbar-hide"
        style={{
          scrollBehavior: 'smooth',
          // Add extra scroll height for smooth transitions
          paddingBottom: '200vh'
        }}
      >
        {/* Extended scroll area */}
        <div style={{ height: `${sceneImages.length * 100}vh` }}>
          {/* Fixed position scenes container */}
          <div className="fixed inset-0 flex items-center justify-center">
            {sceneImages.map(({ scene, image, script }, index) => {
              const opacity = calculateOpacity(index)
              const isVisible = opacity > 0

              return (
                <div
                  key={scene.id}
                  className="absolute inset-0 flex items-center justify-center transition-opacity duration-1000"
                  style={{
                    opacity,
                    pointerEvents: isVisible ? 'auto' : 'none',
                    zIndex: index === currentSceneIndex ? 10 : index === currentSceneIndex + 1 ? 5 : 1
                  }}
                >
                  <div className="w-full max-w-6xl mx-auto px-8">
                    {/* Scene Number Badge */}
                    <div className="absolute top-24 left-8 z-10">
                      <div className="bg-white/10 backdrop-blur text-white px-3 py-1 rounded-full text-sm font-medium">
                        씬 {scene.sceneNumber || index + 1}
                      </div>
                    </div>

                    {/* Image Container */}
                    <div className="relative w-full flex items-center justify-center" style={{ height: '60vh' }}>
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={(image as {url?: string; fileUrl?: string}).url || (image as {url?: string; fileUrl?: string}).fileUrl}
                          alt={`Scene ${scene.sceneNumber}`}
                          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                      ) : (
                        <div className="flex items-center justify-center bg-gray-900 rounded-lg w-full h-full">
                          <div className="text-center text-gray-500">
                            <p className="text-lg font-medium mb-1">이미지 없음</p>
                            <p className="text-sm">씬 {scene.sceneNumber || index + 1}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Script Section */}
                    <div className="mt-8 text-center text-white max-w-3xl mx-auto">
                      {script ? (
                        <div className="space-y-3">
                          {/* Location and Time */}
                          <div className="flex items-center justify-center gap-4 text-sm text-white/70">
                            {script.location && (
                              <span>{script.location === 'indoor' ? '실내' : '실외'}</span>
                            )}
                            {script.place && (
                              <>
                                <span>•</span>
                                <span>{script.place}</span>
                              </>
                            )}
                            {script.time && (
                              <>
                                <span>•</span>
                                <span>{script.time}</span>
                              </>
                            )}
                          </div>

                          {/* Script Content */}
                          {script.content && (
                            <div className="bg-black/30 backdrop-blur rounded-lg p-6">
                              <p className="text-white/90 whitespace-pre-wrap leading-relaxed">
                                {script.content}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Scene Description as fallback */}
                          {(scene.description || scene.notes) && (
                            <div className="bg-black/30 backdrop-blur rounded-lg p-6">
                              {scene.description && (
                                <p className="text-white/90 mb-2">
                                  {scene.description}
                                </p>
                              )}
                              {scene.notes && (
                                <p className="text-white/70 text-sm">
                                  노트: {scene.notes}
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Scroll Hint */}
      {currentSceneIndex === 0 && scrollProgress === 0 && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 animate-bounce">
          <div className="text-white/60 text-sm">스크롤하여 다음 씬 보기</div>
        </div>
      )}
    </div>
  )
}