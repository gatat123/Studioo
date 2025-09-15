import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  gpuDetector,
  PerformanceTier,
  type GPUInfo,
  getRecommendedSettings
} from '@/lib/performance/gpu-detector';
import {
  performanceMonitor,
  type PerformanceMetrics
} from '@/lib/performance/performance-monitor';

export interface RenderingSettings {
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
}

export interface PerformanceState {
  // GPU Information
  gpuInfo: GPUInfo | null;
  performanceTier: PerformanceTier;

  // Real-time metrics
  currentFPS: number;
  averageFPS: number;
  frameTime: number;
  memoryUsage: number;
  performanceScore: number;

  // Rendering settings
  renderingSettings: RenderingSettings;
  autoAdjustQuality: boolean;

  // Quality adjustment
  lastQualityChange: number;
  qualityChangeDebounce: number; // ms
  consecutiveLowFrames: number;
  consecutiveHighFrames: number;

  // Monitoring state
  isMonitoring: boolean;

  // Actions
  initializePerformance: () => Promise<void>;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  updateMetrics: (metrics: PerformanceMetrics) => void;
  setRenderingSettings: (settings: Partial<RenderingSettings>) => void;
  setAutoAdjustQuality: (enabled: boolean) => void;
  adjustQualityUp: () => void;
  adjustQualityDown: () => void;
  resetToRecommended: () => void;
  forcePerformanceTier: (tier: PerformanceTier) => void;
}

const DEFAULT_RENDERING_SETTINGS: RenderingSettings = {
  shadows: true,
  antialiasing: true,
  postProcessing: true,
  particleCount: 500,
  textureQuality: 'medium',
  renderScale: 1.0,
  animationSpeed: 1.0,
  blurEffects: true,
  reflections: true,
  ambientOcclusion: true
};

const QUALITY_CHANGE_DEBOUNCE = 5000; // 5 seconds between quality changes
const LOW_FPS_THRESHOLD = 30;
const HIGH_FPS_THRESHOLD = 55;
const CONSECUTIVE_FRAMES_THRESHOLD = 30;

export const usePerformanceStore = create<PerformanceState>()(
  persist(
    (set, get) => ({
      // Initial state
      gpuInfo: null,
      performanceTier: PerformanceTier.MEDIUM,
      currentFPS: 60,
      averageFPS: 60,
      frameTime: 16.67,
      memoryUsage: 0,
      performanceScore: 100,
      renderingSettings: DEFAULT_RENDERING_SETTINGS,
      autoAdjustQuality: true,
      lastQualityChange: 0,
      qualityChangeDebounce: QUALITY_CHANGE_DEBOUNCE,
      consecutiveLowFrames: 0,
      consecutiveHighFrames: 0,
      isMonitoring: false,

      // Initialize performance detection
      initializePerformance: async () => {
        try {
          // Detect GPU
          const gpuInfo = await gpuDetector.detectGPU();

          // Get recommended settings based on GPU tier
          const recommendedSettings = getRecommendedSettings(gpuInfo.tier);

          // Convert recommended settings to full rendering settings
          const renderingSettings: RenderingSettings = {
            ...recommendedSettings,
            animationSpeed: gpuInfo.tier === PerformanceTier.HIGH ? 1.0 :
                           gpuInfo.tier === PerformanceTier.MEDIUM ? 0.8 : 0.6,
            blurEffects: gpuInfo.tier !== PerformanceTier.LOW &&
                        gpuInfo.tier !== PerformanceTier.FALLBACK,
            reflections: gpuInfo.tier === PerformanceTier.HIGH ||
                        gpuInfo.tier === PerformanceTier.MEDIUM,
            ambientOcclusion: gpuInfo.tier === PerformanceTier.HIGH
          };

          set({
            gpuInfo,
            performanceTier: gpuInfo.tier,
            renderingSettings
          });

          
          
          
        } catch {
          

          // Set fallback settings
          set({
            performanceTier: PerformanceTier.FALLBACK,
            renderingSettings: {
              ...DEFAULT_RENDERING_SETTINGS,
              shadows: false,
              antialiasing: false,
              postProcessing: false,
              particleCount: 100,
              textureQuality: 'low',
              renderScale: 0.75,
              animationSpeed: 0.5,
              blurEffects: false,
              reflections: false,
              ambientOcclusion: false
            }
          });
        }
      },

      // Start performance monitoring
      startMonitoring: () => {
        const state = get();
        if (state.isMonitoring) {
          return;
        }

        // Add metrics callback
        performanceMonitor.addCallback((metrics) => {
          get().updateMetrics(metrics);
        });

        // Start monitoring
        performanceMonitor.start();

        set({ isMonitoring: true });
        
      },

      // Stop performance monitoring
      stopMonitoring: () => {
        performanceMonitor.stop();
        set({
          isMonitoring: false,
          consecutiveLowFrames: 0,
          consecutiveHighFrames: 0
        });
        
      },

      // Update performance metrics
      updateMetrics: (metrics: PerformanceMetrics) => {
        const state = get();
        const avgFPS = performanceMonitor.getAverageFPS();
        const score = performanceMonitor.getPerformanceScore();

        // Track consecutive frame performance
        let { consecutiveLowFrames, consecutiveHighFrames } = state;

        if (metrics.fps < LOW_FPS_THRESHOLD) {
          consecutiveLowFrames++;
          consecutiveHighFrames = 0;
        } else if (metrics.fps > HIGH_FPS_THRESHOLD) {
          consecutiveHighFrames++;
          consecutiveLowFrames = 0;
        } else {
          // Reset both if in normal range
          consecutiveLowFrames = Math.max(0, consecutiveLowFrames - 1);
          consecutiveHighFrames = Math.max(0, consecutiveHighFrames - 1);
        }

        set({
          currentFPS: metrics.fps,
          averageFPS: avgFPS,
          frameTime: metrics.frameTime,
          memoryUsage: metrics.memory?.percentage || 0,
          performanceScore: score,
          consecutiveLowFrames,
          consecutiveHighFrames
        });

        // Auto-adjust quality if enabled
        if (state.autoAdjustQuality) {
          const now = Date.now();
          const timeSinceLastChange = now - state.lastQualityChange;

          if (timeSinceLastChange > state.qualityChangeDebounce) {
            // Check if we need to adjust quality
            if (consecutiveLowFrames > CONSECUTIVE_FRAMES_THRESHOLD) {
              get().adjustQualityDown();
            } else if (consecutiveHighFrames > CONSECUTIVE_FRAMES_THRESHOLD * 2) {
              // Require more consistent high frames before increasing quality
              get().adjustQualityUp();
            }
          }
        }
      },

      // Set rendering settings
      setRenderingSettings: (settings: Partial<RenderingSettings>) => {
        set((state) => ({
          renderingSettings: { ...state.renderingSettings, ...settings }
        }));
      },

      // Toggle auto quality adjustment
      setAutoAdjustQuality: (enabled: boolean) => {
        set({ autoAdjustQuality: enabled });
      },

      // Adjust quality up
      adjustQualityUp: () => {
        const state = get();
        const currentTier = state.performanceTier;

        // Don't exceed GPU's recommended tier
        if (state.gpuInfo && currentTier >= state.gpuInfo.tier) {
          
          return;
        }

        let newTier: PerformanceTier;
        switch (currentTier) {
          case PerformanceTier.FALLBACK:
            newTier = PerformanceTier.LOW;
            break;
          case PerformanceTier.LOW:
            newTier = PerformanceTier.MEDIUM;
            break;
          case PerformanceTier.MEDIUM:
            newTier = PerformanceTier.HIGH;
            break;
          default:
            return; // Already at highest
        }

        const newSettings = getRecommendedSettings(newTier);
        set({
          performanceTier: newTier,
          renderingSettings: {
            ...newSettings,
            animationSpeed: newTier === PerformanceTier.HIGH ? 1.0 :
                           newTier === PerformanceTier.MEDIUM ? 0.8 : 0.6,
            blurEffects: newTier !== PerformanceTier.LOW &&
                        (newTier as PerformanceTier) !== PerformanceTier.FALLBACK,
            reflections: (newTier as PerformanceTier) === PerformanceTier.HIGH ||
                        (newTier as PerformanceTier) === PerformanceTier.MEDIUM,
            ambientOcclusion: (newTier as PerformanceTier) === PerformanceTier.HIGH
          },
          lastQualityChange: Date.now(),
          consecutiveLowFrames: 0,
          consecutiveHighFrames: 0
        });

        
      },

      // Adjust quality down
      adjustQualityDown: () => {
        const state = get();
        const currentTier = state.performanceTier;

        let newTier: PerformanceTier;
        switch (currentTier) {
          case PerformanceTier.HIGH:
            newTier = PerformanceTier.MEDIUM;
            break;
          case PerformanceTier.MEDIUM:
            newTier = PerformanceTier.LOW;
            break;
          case PerformanceTier.LOW:
            newTier = PerformanceTier.FALLBACK;
            break;
          default:
            return; // Already at lowest
        }

        const newSettings = getRecommendedSettings(newTier);
        set({
          performanceTier: newTier,
          renderingSettings: {
            ...newSettings,
            animationSpeed: (newTier as PerformanceTier) === PerformanceTier.HIGH ? 1.0 :
                           (newTier as PerformanceTier) === PerformanceTier.MEDIUM ? 0.8 :
                           (newTier as PerformanceTier) === PerformanceTier.LOW ? 0.6 : 0.5,
            blurEffects: newTier !== PerformanceTier.LOW &&
                        (newTier as PerformanceTier) !== PerformanceTier.FALLBACK,
            reflections: (newTier as PerformanceTier) === PerformanceTier.HIGH ||
                        (newTier as PerformanceTier) === PerformanceTier.MEDIUM,
            ambientOcclusion: (newTier as PerformanceTier) === PerformanceTier.HIGH
          },
          lastQualityChange: Date.now(),
          consecutiveLowFrames: 0,
          consecutiveHighFrames: 0
        });

        
      },

      // Reset to GPU recommended settings
      resetToRecommended: () => {
        const state = get();
        if (!state.gpuInfo) {
          
          return;
        }

        const recommendedSettings = getRecommendedSettings(state.gpuInfo.tier);
        set({
          performanceTier: state.gpuInfo.tier,
          renderingSettings: {
            ...recommendedSettings,
            animationSpeed: state.gpuInfo.tier === PerformanceTier.HIGH ? 1.0 :
                           state.gpuInfo.tier === PerformanceTier.MEDIUM ? 0.8 : 0.6,
            blurEffects: state.gpuInfo.tier !== PerformanceTier.LOW &&
                        state.gpuInfo.tier !== PerformanceTier.FALLBACK,
            reflections: state.gpuInfo.tier === PerformanceTier.HIGH ||
                        state.gpuInfo.tier === PerformanceTier.MEDIUM,
            ambientOcclusion: state.gpuInfo.tier === PerformanceTier.HIGH
          },
          consecutiveLowFrames: 0,
          consecutiveHighFrames: 0
        });

        
      },

      // Force a specific performance tier
      forcePerformanceTier: (tier: PerformanceTier) => {
        const settings = getRecommendedSettings(tier);
        set({
          performanceTier: tier,
          renderingSettings: {
            ...settings,
            animationSpeed: tier === PerformanceTier.HIGH ? 1.0 :
                           tier === PerformanceTier.MEDIUM ? 0.8 :
                           tier === PerformanceTier.LOW ? 0.6 : 0.5,
            blurEffects: tier !== PerformanceTier.LOW &&
                        tier !== PerformanceTier.FALLBACK,
            reflections: tier === PerformanceTier.HIGH ||
                        tier === PerformanceTier.MEDIUM,
            ambientOcclusion: tier === PerformanceTier.HIGH
          },
          autoAdjustQuality: false, // Disable auto-adjust when manually forcing
          lastQualityChange: Date.now()
        });

        
      }
    }),
    {
      name: 'performance-storage',
      partialize: (state) => ({
        performanceTier: state.performanceTier,
        renderingSettings: state.renderingSettings,
        autoAdjustQuality: state.autoAdjustQuality
      })
    }
  )
);