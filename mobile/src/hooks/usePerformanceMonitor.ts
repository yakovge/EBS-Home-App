/**
 * Performance monitoring hooks for React components
 * Provides easy-to-use performance tracking for components and operations
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { performanceService } from '../services/performanceService';

/**
 * Hook to monitor component render performance
 */
export function useRenderPerformance(componentName: string, props?: any) {
  const renderStartRef = useRef<number>();
  const mountTimeRef = useRef<number>();
  
  // Track component mount time
  useEffect(() => {
    mountTimeRef.current = performance.now();
    
    return () => {
      if (mountTimeRef.current) {
        const mountDuration = performance.now() - mountTimeRef.current;
        performanceService.recordMetric({
          name: `${componentName}_mount`,
          value: mountDuration,
          timestamp: Date.now(),
          metadata: { type: 'component_lifecycle' },
        });
      }
    };
  }, [componentName]);
  
  // Track render performance
  useEffect(() => {
    if (renderStartRef.current) {
      const renderTime = performance.now() - renderStartRef.current;
      performanceService.trackComponentRender(componentName, renderTime, props);
    }
  });
  
  // Start tracking render time
  renderStartRef.current = performance.now();
}

/**
 * Hook to measure async operations
 */
export function useAsyncPerformance() {
  const measure = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    return performanceService.measure(operationName, operation, metadata);
  }, []);
  
  const measureSync = useCallback(<T>(
    operationName: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): T => {
    const startTime = performance.now();
    
    try {
      const result = operation();
      const duration = performance.now() - startTime;
      
      performanceService.recordMetric({
        name: operationName,
        value: duration,
        timestamp: Date.now(),
        metadata,
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      performanceService.recordMetric({
        name: `${operationName}_error`,
        value: duration,
        timestamp: Date.now(),
        metadata: { ...metadata, error: error.message },
      });
      
      throw error;
    }
  }, []);
  
  return { measure, measureSync };
}

/**
 * Hook to track network requests
 */
export function useNetworkPerformance() {
  const trackRequest = useCallback((
    url: string,
    method: string,
    duration: number,
    size: number,
    status: number,
    cacheHit?: boolean
  ) => {
    performanceService.trackNetworkRequest({
      url,
      method,
      duration,
      size,
      status,
      cacheHit,
    });
  }, []);
  
  return { trackRequest };
}

/**
 * Hook to get performance insights
 */
export function usePerformanceInsights() {
  const [insights, setInsights] = useState(() => ({
    summary: performanceService.getPerformanceSummary(),
    components: performanceService.getComponentInsights(),
    network: performanceService.getNetworkInsights(),
  }));
  
  const refreshInsights = useCallback(() => {
    setInsights({
      summary: performanceService.getPerformanceSummary(),
      components: performanceService.getComponentInsights(),
      network: performanceService.getNetworkInsights(),
    });
  }, []);
  
  const exportData = useCallback(() => {
    return performanceService.exportData();
  }, []);
  
  const clearMetrics = useCallback(() => {
    performanceService.clearMetrics();
    refreshInsights();
  }, [refreshInsights]);
  
  return {
    insights,
    refreshInsights,
    exportData,
    clearMetrics,
  };
}

/**
 * Hook to track user interactions
 */
export function useInteractionTracking(componentName: string) {
  const trackInteraction = useCallback((
    interactionType: string,
    metadata?: Record<string, any>
  ) => {
    performanceService.recordMetric({
      name: `${componentName}_${interactionType}`,
      value: performance.now(),
      timestamp: Date.now(),
      metadata: {
        type: 'user_interaction',
        component: componentName,
        ...metadata,
      },
    });
  }, [componentName]);
  
  const trackPress = useCallback((elementName: string) => {
    trackInteraction('press', { element: elementName });
  }, [trackInteraction]);
  
  const trackScroll = useCallback((scrollPosition: number) => {
    trackInteraction('scroll', { position: scrollPosition });
  }, [trackInteraction]);
  
  const trackNavigation = useCallback((destination: string) => {
    trackInteraction('navigation', { destination });
  }, [trackInteraction]);
  
  return {
    trackInteraction,
    trackPress,
    trackScroll,
    trackNavigation,
  };
}

/**
 * Hook for performance-aware lazy loading
 */
export function useLazyLoading<T>(
  loadFunction: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const load = useCallback(async () => {
    if (loading || data) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await performanceService.measure(
        'lazy_load',
        loadFunction,
        { dependencies: dependencies.length }
      );
      
      setData(result);
    } catch (err) {
      setError(err as Error);
      console.error('Lazy loading failed:', err);
    } finally {
      setLoading(false);
    }
  }, [loadFunction, loading, data, ...dependencies]);
  
  return { data, loading, error, load };
}

/**
 * Higher-order hook to add performance monitoring to any component
 */
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Unknown';
    
    useRenderPerformance(name, props);
    
    return React.createElement(WrappedComponent, props);
  };
}