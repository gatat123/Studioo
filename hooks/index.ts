// Export all custom hooks
export {
  useAuth,
  useCurrentProject,
  useProjects,
  useUIPreferences,
  useSidebar,
  useModal,
  useGlobalLoading,
} from './useStores';

// Re-export notification hook from store
export { useNotification } from '@/store/useUIStore';

// Export adaptive rendering hooks
export {
  useAdaptiveRendering,
  useConditionalRender,
  useAdaptiveClasses,
  useAdaptiveImage,
  useAdaptiveValue,
} from './useAdaptiveRendering';

// Export debounce hook
export { useDebounce } from './useDebounce';
