import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { usePerformanceStore } from '@/store/usePerformanceStore';
import { PerformanceTier } from '@/lib/performance/gpu-detector';

export interface AdaptiveRenderingOptions {
  autoStart?: boolean;
  autoAdjust?: boolean;
  targetFPS?: number;
  debounceMs?: number;
}

export interface AdaptiveRenderingReturn {
  // Performance metrics
  performanceTier: PerformanceTier;
  currentFPS: number;
  averageFPS: number;
  performanceScore: number;
  isMonitoring: boolean;

  // Rendering settings
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

  // GPU info
  gpuInfo: {
    vendor: string;
    renderer: string;
    score: number;
  } | null;

  // Controls
  startMonitoring: () => void;
  stopMonitoring: () => void;
  setQuality: (tier: PerformanceTier) => void;
  toggleAutoAdjust: () => void;
  resetToRecommended: () => void;

  // Helpers
  shouldRenderHighQuality: () => boolean;
  shouldReduceMotion: () => boolean;
  getAnimationDuration: (baseMs: number) => number;
  getParticleCount: (baseCount: number) => number;
}

/**
 * Hook for adaptive rendering based on device performance
 */
export function useAdaptiveRendering(
  options: AdaptiveRenderingOptions = {}
): AdaptiveRenderingReturn {
  const {
    autoStart = true,
    autoAdjust = true
  } = options;

  const initRef = useRef(false);

  const {
    gpuInfo,
    performanceTier,
    currentFPS,
    averageFPS,
    performanceScore,
    renderingSettings,
    autoAdjustQuality,
    isMonitoring,
    initializePerformance,
    startMonitoring: startPerformanceMonitoring,
    stopMonitoring: stopPerformanceMonitoring,
    setAutoAdjustQuality,
    forcePerformanceTier,
    resetToRecommended
  } = usePerformanceStore();

  // Initialize performance detection on mount
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      initializePerformance().then(() => {
        if (autoStart) {
          startPerformanceMonitoring();
        }
        if (autoAdjust) {
          setAutoAdjustQuality(true);
        }
      });
    }

    // Cleanup on unmount
    return () => {
      if (isMonitoring) {
        stopPerformanceMonitoring();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update auto-adjust setting when option changes
  useEffect(() => {
    setAutoAdjustQuality(autoAdjust);
  }, [autoAdjust, setAutoAdjustQuality]);

  // Memoized GPU info for return value
  const gpuInfoReturn = useMemo(() => {
    if (!gpuInfo) return null;
    return {
      vendor: gpuInfo.vendor,
      renderer: gpuInfo.renderer,
      score: gpuInfo.score
    };
  }, [gpuInfo]);

  // Control functions
  const startMonitoring = useCallback(() => {
    startPerformanceMonitoring();
  }, [startPerformanceMonitoring]);

  const stopMonitoring = useCallback(() => {
    stopPerformanceMonitoring();
  }, [stopPerformanceMonitoring]);

  const setQuality = useCallback((tier: PerformanceTier) => {
    forcePerformanceTier(tier);
  }, [forcePerformanceTier]);

  const toggleAutoAdjust = useCallback(() => {
    setAutoAdjustQuality(!autoAdjustQuality);
  }, [autoAdjustQuality, setAutoAdjustQuality]);

  // Helper functions
  const shouldRenderHighQuality = useCallback(() => {
    return performanceTier === PerformanceTier.HIGH ||
           performanceTier === PerformanceTier.MEDIUM;
  }, [performanceTier]);

  const shouldReduceMotion = useCallback(() => {
    // Check user preference
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return true;
    }

    // Check performance
    return performanceTier === PerformanceTier.LOW ||
           performanceTier === PerformanceTier.FALLBACK ||
           averageFPS < 30;
  }, [performanceTier, averageFPS]);

  const getAnimationDuration = useCallback((baseMs: number): number => {
    if (shouldReduceMotion()) {
      return 0; // Instant transitions for reduced motion
    }
    return baseMs * renderingSettings.animationSpeed;
  }, [renderingSettings.animationSpeed, shouldReduceMotion]);

  const getParticleCount = useCallback((baseCount: number): number => {
    const ratio = renderingSettings.particleCount / 500; // Assuming 500 is medium
    return Math.round(baseCount * ratio);
  }, [renderingSettings.particleCount]);

  return {
    // Performance metrics
    performanceTier,
    currentFPS,
    averageFPS,
    performanceScore,
    isMonitoring,

    // Rendering settings
    renderingSettings,

    // GPU info
    gpuInfo: gpuInfoReturn,

    // Controls
    startMonitoring,
    stopMonitoring,
    setQuality,
    toggleAutoAdjust,
    resetToRecommended,

    // Helpers
    shouldRenderHighQuality,
    shouldReduceMotion,
    getAnimationDuration,
    getParticleCount
  };
}

/**
 * Hook for conditional rendering based on performance tier
 */
export function useConditionalRender(
  minTier: PerformanceTier = PerformanceTier.MEDIUM
): boolean {
  const { performanceTier } = usePerformanceStore();

  const tierOrder = {
    [PerformanceTier.FALLBACK]: 0,
    [PerformanceTier.LOW]: 1,
    [PerformanceTier.MEDIUM]: 2,
    [PerformanceTier.HIGH]: 3
  };

  return tierOrder[performanceTier] >= tierOrder[minTier];
}

/**
 * Hook for adaptive CSS classes based on performance
 */
export function useAdaptiveClasses(
  baseClasses: string,
  performanceClasses?: {
    high?: string;
    medium?: string;
    low?: string;
    fallback?: string;
  }
): string {
  const { performanceTier } = usePerformanceStore();

  return useMemo(() => {
    if (!performanceClasses) return baseClasses;

    const additionalClasses = performanceClasses[performanceTier.toLowerCase() as keyof typeof performanceClasses] || '';
    return `${baseClasses} ${additionalClasses}`.trim();
  }, [baseClasses, performanceClasses, performanceTier]);
}

/**
 * Hook for performance-aware image loading
 */
export function useAdaptiveImage(
  images: {
    high: string;
    medium: string;
    low: string;
    fallback?: string;
  }
): string {
  const { performanceTier } = usePerformanceStore();

  return useMemo(() => {
    switch (performanceTier) {
      case PerformanceTier.HIGH:
        return images.high;
      case PerformanceTier.MEDIUM:
        return images.medium;
      case PerformanceTier.LOW:
        return images.low;
      case PerformanceTier.FALLBACK:
        return images.fallback || images.low;
      default:
        return images.medium;
    }
  }, [images, performanceTier]);
}

/**
 * Hook for debounced performance-based value
 */
export function useAdaptiveValue<T>(
  values: {
    high: T;
    medium: T;
    low: T;
    fallback?: T;
  },
  debounceMs = 1000
): T {
  const { performanceTier } = usePerformanceStore();
  const [debouncedValue, setDebouncedValue] = useState<T>(values.medium);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      let newValue: T;
      switch (performanceTier) {
        case PerformanceTier.HIGH:
          newValue = values.high;
          break;
        case PerformanceTier.MEDIUM:
          newValue = values.medium;
          break;
        case PerformanceTier.LOW:
          newValue = values.low;
          break;
        case PerformanceTier.FALLBACK:
          newValue = values.fallback !== undefined ? values.fallback : values.low;
          break;
        default:
          newValue = values.medium;
      }
      setDebouncedValue(newValue);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [performanceTier, values, debounceMs]);

  return debouncedValue;
}

