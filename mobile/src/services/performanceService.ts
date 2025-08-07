/**
 * Performance monitoring service for tracking app metrics
 * Provides performance tracking, bundle analysis, and optimization insights
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface ComponentMetric {
  componentName: string;
  renderTime: number;
  renderCount: number;
  lastRendered: number;
  props?: any;
}

interface NetworkMetric {
  url: string;
  method: string;
  duration: number;
  size: number;
  status: number;
  timestamp: number;
  cacheHit?: boolean;
}

interface MemoryMetric {
  used: number;
  total: number;
  timestamp: number;
  jsHeapSizeLimit?: number;
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
}

interface BundleMetric {
  totalSize: number;
  jsSize: number;
  assetSize: number;
  chunkCount: number;
  loadTime: number;
  timestamp: number;
}

class PerformanceService {
  private metrics: PerformanceMetric[] = [];
  private componentMetrics: Map<string, ComponentMetric> = new Map();
  private networkMetrics: NetworkMetric[] = [];
  private memoryMetrics: MemoryMetric[] = [];
  private bundleMetrics: BundleMetric[] = [];
  
  private readonly MAX_METRICS = 1000;
  private readonly DEBUG = __DEV__;
  
  private performanceObserver?: PerformanceObserver;
  private memoryMonitorInterval?: NodeJS.Timeout;
  
  constructor() {
    this.initializePerformanceTracking();
    this.startMemoryMonitoring();
  }

  /**
   * Initialize performance tracking
   */
  private initializePerformanceTracking(): void {
    try {
      // Track navigation and resource loading
      if (typeof PerformanceObserver !== 'undefined') {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          entries.forEach((entry) => {
            this.recordMetric({
              name: entry.name,
              value: entry.duration,
              timestamp: Date.now(),
              metadata: {
                entryType: entry.entryType,
                startTime: entry.startTime,
              },
            });
          });
        });
        
        this.performanceObserver.observe({ 
          entryTypes: ['navigation', 'resource', 'measure'] 
        });
      }
      
      // Track app startup time
      this.measureAppStartup();
      
      console.log('📊 Performance tracking initialized');
    } catch (error) {
      console.error('Failed to initialize performance tracking:', error);
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    try {
      this.memoryMonitorInterval = setInterval(() => {
        this.recordMemoryUsage();
      }, 30000); // Every 30 seconds
      
      console.log('🧠 Memory monitoring started');
    } catch (error) {
      console.error('Failed to start memory monitoring:', error);
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
    
    if (this.DEBUG) {
      console.log(`📊 Performance: ${metric.name} = ${metric.value}ms`);
    }
  }

  /**
   * Measure execution time of a function
   */
  async measure<T>(
    name: string, 
    fn: () => Promise<T> | T, 
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      this.recordMetric({
        name,
        value: duration,
        timestamp: Date.now(),
        metadata,
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric({
        name: `${name}_error`,
        value: duration,
        timestamp: Date.now(),
        metadata: { ...metadata, error: error.message },
      });
      
      throw error;
    }
  }

  /**
   * Track component render performance
   */
  trackComponentRender(
    componentName: string, 
    renderTime: number, 
    props?: any
  ): void {
    const existing = this.componentMetrics.get(componentName);
    
    if (existing) {
      existing.renderTime = (existing.renderTime + renderTime) / 2; // Average
      existing.renderCount++;
      existing.lastRendered = Date.now();
      existing.props = props;
    } else {
      this.componentMetrics.set(componentName, {
        componentName,
        renderTime,
        renderCount: 1,
        lastRendered: Date.now(),
        props,
      });
    }
    
    if (this.DEBUG && renderTime > 16) {
      console.warn(`🐌 Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Track network request performance
   */
  trackNetworkRequest(metric: Omit<NetworkMetric, 'timestamp'>): void {
    const networkMetric: NetworkMetric = {
      ...metric,
      timestamp: Date.now(),
    };
    
    this.networkMetrics.push(networkMetric);
    
    // Keep only recent network metrics
    if (this.networkMetrics.length > this.MAX_METRICS) {
      this.networkMetrics = this.networkMetrics.slice(-this.MAX_METRICS);
    }
    
    if (this.DEBUG) {
      const status = metric.status >= 400 ? '❌' : '✅';
      console.log(`${status} Network: ${metric.method} ${metric.url} - ${metric.duration}ms`);
    }
  }

  /**
   * Record memory usage
   */
  private recordMemoryUsage(): void {
    try {
      let memoryInfo: any = {};
      
      // React Native memory info (if available)
      if (global.performance && global.performance.memory) {
        memoryInfo = {
          usedJSHeapSize: global.performance.memory.usedJSHeapSize,
          totalJSHeapSize: global.performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: global.performance.memory.jsHeapSizeLimit,
        };
      }
      
      const memoryMetric: MemoryMetric = {
        used: memoryInfo.usedJSHeapSize || 0,
        total: memoryInfo.totalJSHeapSize || 0,
        timestamp: Date.now(),
        ...memoryInfo,
      };
      
      this.memoryMetrics.push(memoryMetric);
      
      // Keep only recent memory metrics
      if (this.memoryMetrics.length > 100) {
        this.memoryMetrics = this.memoryMetrics.slice(-100);
      }
      
    } catch (error) {
      console.error('Failed to record memory usage:', error);
    }
  }

  /**
   * Measure app startup time
   */
  private measureAppStartup(): void {
    try {
      const startTime = Date.now();
      
      // Measure when the app becomes interactive
      setTimeout(() => {
        const startupTime = Date.now() - startTime;
        
        this.recordMetric({
          name: 'app_startup',
          value: startupTime,
          timestamp: Date.now(),
          metadata: {
            type: 'cold_start',
          },
        });
      }, 0);
      
    } catch (error) {
      console.error('Failed to measure app startup:', error);
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    metrics: PerformanceMetric[];
    components: ComponentMetric[];
    network: NetworkMetric[];
    memory: MemoryMetric[];
    slowComponents: string[];
    averageNetworkTime: number;
    totalMetrics: number;
  } {
    const slowComponents = Array.from(this.componentMetrics.values())
      .filter(metric => metric.renderTime > 16)
      .map(metric => metric.componentName);
    
    const averageNetworkTime = this.networkMetrics.length > 0
      ? this.networkMetrics.reduce((sum, metric) => sum + metric.duration, 0) / this.networkMetrics.length
      : 0;
    
    return {
      metrics: [...this.metrics],
      components: Array.from(this.componentMetrics.values()),
      network: [...this.networkMetrics],
      memory: [...this.memoryMetrics],
      slowComponents,
      averageNetworkTime,
      totalMetrics: this.metrics.length,
    };
  }

  /**
   * Get component performance insights
   */
  getComponentInsights(): {
    slowest: ComponentMetric[];
    mostRendered: ComponentMetric[];
    recentlyRendered: ComponentMetric[];
  } {
    const components = Array.from(this.componentMetrics.values());
    
    return {
      slowest: components
        .sort((a, b) => b.renderTime - a.renderTime)
        .slice(0, 10),
      mostRendered: components
        .sort((a, b) => b.renderCount - a.renderCount)
        .slice(0, 10),
      recentlyRendered: components
        .sort((a, b) => b.lastRendered - a.lastRendered)
        .slice(0, 10),
    };
  }

  /**
   * Get network performance insights
   */
  getNetworkInsights(): {
    slowest: NetworkMetric[];
    failed: NetworkMetric[];
    cached: NetworkMetric[];
    averageDuration: number;
    totalRequests: number;
  } {
    return {
      slowest: this.networkMetrics
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10),
      failed: this.networkMetrics
        .filter(metric => metric.status >= 400),
      cached: this.networkMetrics
        .filter(metric => metric.cacheHit),
      averageDuration: this.networkMetrics.length > 0
        ? this.networkMetrics.reduce((sum, metric) => sum + metric.duration, 0) / this.networkMetrics.length
        : 0,
      totalRequests: this.networkMetrics.length,
    };
  }

  /**
   * Clear all performance data
   */
  clearMetrics(): void {
    this.metrics = [];
    this.componentMetrics.clear();
    this.networkMetrics = [];
    this.memoryMetrics = [];
    this.bundleMetrics = [];
    
    console.log('🗑️ Performance metrics cleared');
  }

  /**
   * Export performance data for analysis
   */
  exportData(): {
    timestamp: number;
    metrics: PerformanceMetric[];
    components: ComponentMetric[];
    network: NetworkMetric[];
    memory: MemoryMetric[];
    bundle: BundleMetric[];
  } {
    return {
      timestamp: Date.now(),
      metrics: [...this.metrics],
      components: Array.from(this.componentMetrics.values()),
      network: [...this.networkMetrics],
      memory: [...this.memoryMetrics],
      bundle: [...this.bundleMetrics],
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    
    this.clearMetrics();
    console.log('🧹 Performance service destroyed');
  }
}

export const performanceService = new PerformanceService();
export type { PerformanceMetric, ComponentMetric, NetworkMetric, MemoryMetric, BundleMetric };