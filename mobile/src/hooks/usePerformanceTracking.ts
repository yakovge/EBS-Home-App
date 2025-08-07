/**
 * Performance tracking hook for monitoring component render times
 */

import { useEffect, useRef } from 'react';
import { performanceService } from '../services/performanceService';

export function usePerformanceTracking(componentName: string, props?: any) {
  const renderStartTime = useRef<number>(performance.now());
  const renderCount = useRef<number>(0);

  useEffect(() => {
    // Calculate render time
    const renderTime = performance.now() - renderStartTime.current;
    renderCount.current++;

    // Track component render
    performanceService.trackComponentRender(componentName, renderTime, props);

    // Update start time for next render
    renderStartTime.current = performance.now();
  });

  // Track unmount
  useEffect(() => {
    return () => {
      // Log final stats when component unmounts
      if (__DEV__) {
        console.log(`📊 ${componentName} unmounted after ${renderCount.current} renders`);
      }
    };
  }, [componentName]);
}

/**
 * Hook for measuring async operations
 */
export function useAsyncPerformance() {
  const measure = async <T,>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    return performanceService.measure(name, operation, metadata);
  };

  return { measure };
}