// Central export file for all stores
export { useAuthStore } from './useAuthStore';
export { useProjectStore } from './useProjectStore';
export { useUIStore, useNotification } from './useUIStore';
export { usePerformanceStore } from './usePerformanceStore';

// Export performance-related types and enums
export { PerformanceTier } from '@/lib/performance/gpu-detector';
export type { RenderingSettings, PerformanceState } from './usePerformanceStore';

// Export types if needed in other components
// export type { default as AuthState } from './useAuthStore';
// export type { default as ProjectState } from './useProjectStore';
// export type { default as UIState } from './useUIStore';
