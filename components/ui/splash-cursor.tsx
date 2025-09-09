'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface SplashCursorProps {
  className?: string
  cursorSize?: number
  splashSize?: number
  splashDuration?: number
}

export default function SplashCursor({
  className,
  cursorSize = 20,
  splashSize = 100,
  splashDuration = 400
}: SplashCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mousePosition = useRef({ x: 0, y: 0 })
  const animationFrame = useRef<number>()
  const splashes = useRef<Array<{
    x: number
    y: number
    radius: number
    alpha: number
    color: string
  }>>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)

    // Colors for splash effect
    const colors = [
      '#3b82f6', // blue-500
      '#8b5cf6', // violet-500
      '#ec4899', // pink-500
      '#f59e0b', // amber-500
      '#10b981', // emerald-500
      '#ef4444', // red-500
    ]

    // Track mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      mousePosition.current = { x: e.clientX, y: e.clientY }
    }

    // Create splash on click
    const handleClick = (e: MouseEvent) => {
      const randomColor = colors[Math.floor(Math.random() * colors.length)]
      splashes.current.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        alpha: 0.6,
        color: randomColor
      })
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw custom cursor
      ctx.save()
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(mousePosition.current.x, mousePosition.current.y, cursorSize / 2, 0, Math.PI * 2)
      ctx.stroke()
      
      // Inner circle
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(mousePosition.current.x, mousePosition.current.y, cursorSize / 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Animate splashes
      splashes.current = splashes.current.filter(splash => {
        splash.radius += (splashSize - splash.radius) * 0.1
        splash.alpha -= 0.02

        if (splash.alpha <= 0) return false

        // Draw splash circles
        ctx.save()
        ctx.globalAlpha = splash.alpha
        ctx.strokeStyle = splash.color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(splash.x, splash.y, splash.radius, 0, Math.PI * 2)
        ctx.stroke()

        // Draw inner circles for ripple effect
        if (splash.radius > 20) {
          ctx.globalAlpha = splash.alpha * 0.5
          ctx.beginPath()
          ctx.arc(splash.x, splash.y, splash.radius * 0.7, 0, Math.PI * 2)
          ctx.stroke()
        }

        if (splash.radius > 40) {
          ctx.globalAlpha = splash.alpha * 0.3
          ctx.beginPath()
          ctx.arc(splash.x, splash.y, splash.radius * 0.4, 0, Math.PI * 2)
          ctx.stroke()
        }

        ctx.restore()
        return true
      })

      animationFrame.current = requestAnimationFrame(animate)
    }

    // Start animation
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick)
    animate()

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('resize', updateCanvasSize)
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current)
      }
    }
  }, [cursorSize, splashSize])

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'fixed inset-0 pointer-events-none z-50',
        className
      )}
      style={{ cursor: 'none' }}
    />
  )
}