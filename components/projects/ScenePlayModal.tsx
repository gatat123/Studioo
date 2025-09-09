'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ScrollStack, { ScrollStackItem } from '@/components/ui/scroll-stack'
import type { Scene, Image } from '@/types'
import '@/styles/scroll-stack.css'

interface ScenePlayModalProps {
  scenes: Scene[]
  imageType: 'lineart' | 'art'
  onClose: () => void
}

export default function ScenePlayModal({ scenes, imageType, onClose }: ScenePlayModalProps) {
  const [sceneImages, setSceneImages] = useState<{ scene: Scene; image: Image | null }[]>([])

  useEffect(() => {
    // Extract current images for each scene
    const imagesWithScenes = scenes.map(scene => {
      const currentImage = scene.images?.find(
        (img: Image) => img.type === imageType && img.isCurrent
      )
      return {
        scene,
        image: currentImage || null
      }
    })
    setSceneImages(imagesWithScenes)
  }, [scenes, imageType])

  return (
    <div className="fixed inset-0 z-50 bg-black/95">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
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

      {/* Scene Stack */}
      <div className="h-screen w-full pt-20">
        <ScrollStack
          className="h-full"
          itemDistance={200}
          itemScale={0.02}
          itemStackDistance={40}
          stackPosition="30%"
          scaleEndPosition="15%"
          baseScale={0.9}
          rotationAmount={0}
          blurAmount={2}
        >
          {sceneImages.map(({ scene, image }, index) => (
            <ScrollStackItem key={scene.id} itemClassName="bg-transparent">
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                {/* Scene Number Badge */}
                <div className="absolute top-4 left-4 z-10">
                  <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur">
                    씬 {scene.sceneNumber}
                  </div>
                </div>

                {/* Image Container */}
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
                  {image ? (
                    <img
                      src={(image as any).url || (image as any).fileUrl}
                      alt={`Scene ${scene.sceneNumber}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-500">
                        <p className="text-lg font-medium mb-2">이미지 없음</p>
                        <p className="text-sm">씬 {scene.sceneNumber}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scene Info */}
                {(scene.description || scene.notes) && (
                  <div className="p-6 bg-gradient-to-t from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                    {scene.description && (
                      <p className="text-gray-700 dark:text-gray-300 mb-2">
                        {scene.description}
                      </p>
                    )}
                    {scene.notes && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        노트: {scene.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </ScrollStackItem>
          ))}
        </ScrollStack>
      </div>
    </div>
  )
}