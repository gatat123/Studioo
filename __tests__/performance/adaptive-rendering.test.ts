/**
 * Adaptive Rendering Test Suite
 * Tests adaptive rendering hooks, performance monitoring, and quality adjustments
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useAdaptiveRendering,
  useConditionalRender,
  useAdaptiveClasses,
  useAdaptiveImage,
  useAdaptiveValue
} from '@/hooks/useAdaptiveRendering'
import { usePerformanceStore } from '@/store/usePerformanceStore'
import { PerformanceTier } from '@/lib/performance/gpu-detector'

// Mock the performance store
jest.mock('@/store/usePerformanceStore')

interface MockPerformanceStore {
  gpuInfo: {
    vendor: string;
    renderer: string;
    tier: PerformanceTier;
    score: number;
    webglVersion: number;
    maxTextureSize: number;
    supportsWebGL2: boolean;
  } | null;
  performanceTier: PerformanceTier;
  currentFPS: number;
  averageFPS: number;
  performanceScore: number;
  renderingSettings: {
    shadows: boolean;
    antialiasing: boolean;
    postProcessing: boolean;
    particleCount: number;
    textureQuality: 'high' | 'medium' | 'low';
    renderScale: number;
    animationSpeed: number;
    blurEffects: boolean;
    reflections: boolean;
    ambientOcclusion: boolean;
  };
  autoAdjustQuality: boolean;
  isMonitoring: boolean;
  initializePerformance: jest.Mock;
  startMonitoring: jest.Mock;
  stopMonitoring: jest.Mock;
  setAutoAdjustQuality: jest.Mock;
  forcePerformanceTier: jest.Mock;
  resetToRecommended: jest.Mock;
}

describe('Adaptive Rendering Hooks', () => {
  let mockPerformanceStore: MockPerformanceStore

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Setup default mock store values
    mockPerformanceStore = {
      gpuInfo: {
        vendor: 'NVIDIA',
        renderer: 'RTX 3080',
        tier: PerformanceTier.HIGH,
        score: 90,
        webglVersion: 2,
        maxTextureSize: 16384,
        supportsWebGL2: true
      },
      performanceTier: PerformanceTier.HIGH,
      currentFPS: 60,
      averageFPS: 60,
      performanceScore: 90,
      renderingSettings: {
        shadows: true,
        antialiasing: true,
        postProcessing: true,
        particleCount: 1000,
        textureQuality: 'high' as const,
        renderScale: 1.0,
        animationSpeed: 1.0,
        blurEffects: true,
        reflections: true,
        ambientOcclusion: true
      },
      autoAdjustQuality: true,
      isMonitoring: false,
      initializePerformance: jest.fn().mockResolvedValue(undefined),
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn(),
      setAutoAdjustQuality: jest.fn(),
      forcePerformanceTier: jest.fn(),
      resetToRecommended: jest.fn()
    }

    ;(usePerformanceStore as jest.Mock).mockReturnValue(mockPerformanceStore)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('useAdaptiveRendering', () => {
    it('should initialize performance detection on mount', async () => {
      const { result } = renderHook(() => useAdaptiveRendering())

      await waitFor(() => {
        expect(mockPerformanceStore.initializePerformance).toHaveBeenCalled()
      })

      expect(result.current.performanceTier).toBe(PerformanceTier.HIGH)
      expect(result.current.currentFPS).toBe(60)
    })

    it('should auto-start monitoring when autoStart is true', async () => {
      renderHook(() => useAdaptiveRendering({ autoStart: true }))

      await waitFor(() => {
        expect(mockPerformanceStore.initializePerformance).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(mockPerformanceStore.startMonitoring).toHaveBeenCalled()
      })
    })

    it('should not auto-start monitoring when autoStart is false', async () => {
      renderHook(() => useAdaptiveRendering({ autoStart: false }))

      await waitFor(() => {
        expect(mockPerformanceStore.initializePerformance).toHaveBeenCalled()
      })

      expect(mockPerformanceStore.startMonitoring).not.toHaveBeenCalled()
    })

    it('should enable auto-adjust when autoAdjust is true', async () => {
      renderHook(() => useAdaptiveRendering({ autoAdjust: true }))

      await waitFor(() => {
        expect(mockPerformanceStore.setAutoAdjustQuality).toHaveBeenCalledWith(true)
      })
    })

    it('should provide control functions', async () => {
      const { result } = renderHook(() => useAdaptiveRendering())

      await waitFor(() => {
        expect(result.current.startMonitoring).toBeDefined()
      })

      // Test start monitoring
      act(() => {
        result.current.startMonitoring()
      })
      expect(mockPerformanceStore.startMonitoring).toHaveBeenCalled()

      // Test stop monitoring
      act(() => {
        result.current.stopMonitoring()
      })
      expect(mockPerformanceStore.stopMonitoring).toHaveBeenCalled()

      // Test set quality
      act(() => {
        result.current.setQuality(PerformanceTier.MEDIUM)
      })
      expect(mockPerformanceStore.forcePerformanceTier).toHaveBeenCalledWith(PerformanceTier.MEDIUM)

      // Test toggle auto adjust
      act(() => {
        result.current.toggleAutoAdjust()
      })
      expect(mockPerformanceStore.setAutoAdjustQuality).toHaveBeenCalledWith(false)

      // Test reset to recommended
      act(() => {
        result.current.resetToRecommended()
      })
      expect(mockPerformanceStore.resetToRecommended).toHaveBeenCalled()
    })

    it('should provide correct helper functions', () => {
      const { result } = renderHook(() => useAdaptiveRendering())

      // Test shouldRenderHighQuality
      expect(result.current.shouldRenderHighQuality()).toBe(true)

      // Change to LOW tier
      mockPerformanceStore.performanceTier = PerformanceTier.LOW
      const { result: lowResult } = renderHook(() => useAdaptiveRendering())
      expect(lowResult.current.shouldRenderHighQuality()).toBe(false)
    })

    it('should detect reduced motion preference', () => {
      const { result } = renderHook(() => useAdaptiveRendering())

      // Test default (no reduced motion)
      expect(result.current.shouldReduceMotion()).toBe(false)

      // Mock reduced motion preference
      window.matchMedia = jest.fn().mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)'
      })

      const { result: reducedResult } = renderHook(() => useAdaptiveRendering())
      expect(reducedResult.current.shouldReduceMotion()).toBe(true)
    })

    it('should calculate animation duration based on performance', () => {
      const { result } = renderHook(() => useAdaptiveRendering())

      // Normal performance
      expect(result.current.getAnimationDuration(300)).toBe(300)

      // Reduced motion should return 0
      window.matchMedia = jest.fn().mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)'
      })

      const { result: reducedResult } = renderHook(() => useAdaptiveRendering())
      expect(reducedResult.current.getAnimationDuration(300)).toBe(0)
    })

    it('should calculate particle count based on settings', () => {
      const { result } = renderHook(() => useAdaptiveRendering())

      // High performance (1000 particles, ratio = 2)
      expect(result.current.getParticleCount(100)).toBe(200)

      // Update to medium performance (500 particles, ratio = 1)
      mockPerformanceStore.renderingSettings.particleCount = 500
      const { result: mediumResult } = renderHook(() => useAdaptiveRendering())
      expect(mediumResult.current.getParticleCount(100)).toBe(100)
    })

    it('should cleanup on unmount', () => {
      mockPerformanceStore.isMonitoring = true
      const { unmount } = renderHook(() => useAdaptiveRendering())

      unmount()

      expect(mockPerformanceStore.stopMonitoring).toHaveBeenCalled()
    })

    it('should return GPU info correctly', () => {
      const { result } = renderHook(() => useAdaptiveRendering())

      expect(result.current.gpuInfo).toEqual({
        vendor: 'NVIDIA',
        renderer: 'RTX 3080',
        score: 90
      })
    })

    it('should handle null GPU info', () => {
      mockPerformanceStore.gpuInfo = null
      const { result } = renderHook(() => useAdaptiveRendering())

      expect(result.current.gpuInfo).toBeNull()
    })
  })

  describe('useConditionalRender', () => {
    it('should render for HIGH tier when minimum is MEDIUM', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.HIGH
      const { result } = renderHook(() => useConditionalRender(PerformanceTier.MEDIUM))
      expect(result.current).toBe(true)
    })

    it('should render for MEDIUM tier when minimum is MEDIUM', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.MEDIUM
      const { result } = renderHook(() => useConditionalRender(PerformanceTier.MEDIUM))
      expect(result.current).toBe(true)
    })

    it('should not render for LOW tier when minimum is MEDIUM', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.LOW
      const { result } = renderHook(() => useConditionalRender(PerformanceTier.MEDIUM))
      expect(result.current).toBe(false)
    })

    it('should not render for FALLBACK tier when minimum is LOW', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.FALLBACK
      const { result } = renderHook(() => useConditionalRender(PerformanceTier.LOW))
      expect(result.current).toBe(false)
    })

    it('should render for all tiers when minimum is FALLBACK', () => {
      const tiers = [
        PerformanceTier.HIGH,
        PerformanceTier.MEDIUM,
        PerformanceTier.LOW,
        PerformanceTier.FALLBACK
      ]

      tiers.forEach(tier => {
        mockPerformanceStore.performanceTier = tier
        const { result } = renderHook(() => useConditionalRender(PerformanceTier.FALLBACK))
        expect(result.current).toBe(true)
      })
    })
  })

  describe('useAdaptiveClasses', () => {
    it('should return base classes when no performance classes provided', () => {
      const { result } = renderHook(() => useAdaptiveClasses('base-class'))
      expect(result.current).toBe('base-class')
    })

    it('should append performance-specific classes for HIGH tier', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.HIGH
      const { result } = renderHook(() =>
        useAdaptiveClasses('base-class', {
          high: 'high-perf',
          medium: 'med-perf',
          low: 'low-perf'
        })
      )
      expect(result.current).toBe('base-class high-perf')
    })

    it('should append performance-specific classes for MEDIUM tier', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.MEDIUM
      const { result } = renderHook(() =>
        useAdaptiveClasses('base-class', {
          high: 'high-perf',
          medium: 'med-perf',
          low: 'low-perf'
        })
      )
      expect(result.current).toBe('base-class med-perf')
    })

    it('should append performance-specific classes for LOW tier', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.LOW
      const { result } = renderHook(() =>
        useAdaptiveClasses('base-class', {
          high: 'high-perf',
          medium: 'med-perf',
          low: 'low-perf'
        })
      )
      expect(result.current).toBe('base-class low-perf')
    })

    it('should handle FALLBACK tier with fallback classes', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.FALLBACK
      const { result } = renderHook(() =>
        useAdaptiveClasses('base-class', {
          high: 'high-perf',
          medium: 'med-perf',
          low: 'low-perf',
          fallback: 'fallback-perf'
        })
      )
      expect(result.current).toBe('base-class fallback-perf')
    })

    it('should handle missing performance class gracefully', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.HIGH
      const { result } = renderHook(() =>
        useAdaptiveClasses('base-class', {
          medium: 'med-perf'
        })
      )
      expect(result.current).toBe('base-class')
    })
  })

  describe('useAdaptiveImage', () => {
    const images = {
      high: '/images/high-res.jpg',
      medium: '/images/med-res.jpg',
      low: '/images/low-res.jpg',
      fallback: '/images/fallback.jpg'
    }

    it('should return high-res image for HIGH tier', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.HIGH
      const { result } = renderHook(() => useAdaptiveImage(images))
      expect(result.current).toBe('/images/high-res.jpg')
    })

    it('should return medium-res image for MEDIUM tier', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.MEDIUM
      const { result } = renderHook(() => useAdaptiveImage(images))
      expect(result.current).toBe('/images/med-res.jpg')
    })

    it('should return low-res image for LOW tier', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.LOW
      const { result } = renderHook(() => useAdaptiveImage(images))
      expect(result.current).toBe('/images/low-res.jpg')
    })

    it('should return fallback image for FALLBACK tier', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.FALLBACK
      const { result } = renderHook(() => useAdaptiveImage(images))
      expect(result.current).toBe('/images/fallback.jpg')
    })

    it('should use low-res as fallback when fallback not provided', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.FALLBACK
      const imagesWithoutFallback = {
        high: '/images/high-res.jpg',
        medium: '/images/med-res.jpg',
        low: '/images/low-res.jpg'
      }
      const { result } = renderHook(() => useAdaptiveImage(imagesWithoutFallback))
      expect(result.current).toBe('/images/low-res.jpg')
    })
  })

  describe('useAdaptiveValue', () => {
    const values = {
      high: 100,
      medium: 50,
      low: 25,
      fallback: 10
    }

    it('should return value based on performance tier after debounce', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.HIGH
      const { result } = renderHook(() => useAdaptiveValue(values, 100))

      // Initially returns medium (default)
      expect(result.current).toBe(50)

      // After debounce, returns high value
      act(() => {
        jest.advanceTimersByTime(100)
      })
      expect(result.current).toBe(100)
    })

    it('should debounce value changes', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.HIGH
      const { result, rerender } = renderHook(
        ({ tier }) => {
          mockPerformanceStore.performanceTier = tier
          return useAdaptiveValue(values, 500)
        },
        { initialProps: { tier: PerformanceTier.HIGH } }
      )

      // Change tier multiple times quickly
      rerender({ tier: PerformanceTier.MEDIUM })
      rerender({ tier: PerformanceTier.LOW })
      rerender({ tier: PerformanceTier.HIGH })

      // Value should not change immediately
      expect(result.current).toBe(50)

      // After debounce, should use last tier value
      act(() => {
        jest.advanceTimersByTime(500)
      })
      expect(result.current).toBe(100)
    })

    it('should handle FALLBACK tier with fallback value', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.FALLBACK
      const { result } = renderHook(() => useAdaptiveValue(values, 100))

      act(() => {
        jest.advanceTimersByTime(100)
      })
      expect(result.current).toBe(10)
    })

    it('should use low value when fallback not provided', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.FALLBACK
      const valuesWithoutFallback = {
        high: 100,
        medium: 50,
        low: 25
      }
      const { result } = renderHook(() => useAdaptiveValue(valuesWithoutFallback, 100))

      act(() => {
        jest.advanceTimersByTime(100)
      })
      expect(result.current).toBe(25)
    })

    it('should clean up timeout on unmount', () => {
      const { unmount } = renderHook(() => useAdaptiveValue(values, 1000))

      // Should not throw when unmounting before timeout
      expect(() => unmount()).not.toThrow()
    })

    it('should cancel previous timeout when tier changes', () => {
      mockPerformanceStore.performanceTier = PerformanceTier.HIGH
      const { rerender } = renderHook(
        ({ tier }) => {
          mockPerformanceStore.performanceTier = tier
          return useAdaptiveValue(values, 1000)
        },
        { initialProps: { tier: PerformanceTier.HIGH } }
      )

      act(() => {
        jest.advanceTimersByTime(500)
      })

      // Change tier before first timeout completes
      rerender({ tier: PerformanceTier.LOW })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      // Should not have applied HIGH value
      act(() => {
        jest.advanceTimersByTime(500)
      })

      // Should have LOW value after new timeout
      const { result } = renderHook(() => useAdaptiveValue(values, 1000))
      expect(result.current).toBe(25)
    })
  })

  describe('Performance Monitoring Integration', () => {
    it('should adjust quality based on FPS drops', () => {
      mockPerformanceStore.averageFPS = 25
      const { result } = renderHook(() => useAdaptiveRendering())

      expect(result.current.shouldReduceMotion()).toBe(true)
    })

    it('should provide accurate performance metrics', () => {
      mockPerformanceStore.currentFPS = 45
      mockPerformanceStore.averageFPS = 50
      mockPerformanceStore.performanceScore = 75

      const { result } = renderHook(() => useAdaptiveRendering())

      expect(result.current.currentFPS).toBe(45)
      expect(result.current.averageFPS).toBe(50)
      expect(result.current.performanceScore).toBe(75)
    })

    it('should reflect monitoring state', () => {
      mockPerformanceStore.isMonitoring = true
      const { result } = renderHook(() => useAdaptiveRendering())

      expect(result.current.isMonitoring).toBe(true)
    })
  })
})