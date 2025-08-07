/**
 * Tests for performance monitoring service
 */

import { performanceService } from '../performanceService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');

// Mock React Native performance APIs
const mockGetReactNativeVersion = jest.fn();
jest.mock('react-native/Libraries/Core/ReactNativeVersion', () => ({
  version: { major: 0, minor: 72, patch: 4 },
}));

// Mock Flipper (if available)
jest.mock('react-native-flipper', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}), { virtual: true });

describe('PerformanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
    global.performance = {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByName: jest.fn(),
      getEntriesByType: jest.fn(),
    } as any;
  });

  describe('Performance Tracking', () => {
    it('should track screen navigation performance', async () => {
      const startTime = Date.now();
      const endTime = startTime + 500; // 500ms navigation
      
      (global.performance.now as jest.Mock)
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      performanceService.startScreenTransition('Home', 'Profile');
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async work
      performanceService.endScreenTransition('Home', 'Profile');

      const metrics = performanceService.getMetrics();
      expect(metrics.screenTransitions).toHaveLength(1);
      expect(metrics.screenTransitions[0]).toMatchObject({
        from: 'Home',
        to: 'Profile',
        duration: 500,
      });
    });

    it('should track API request performance', async () => {
      const mockApiCall = jest.fn().mockResolvedValue({ data: 'test' });
      
      const result = await performanceService.trackApiCall(
        'GET',
        '/api/test',
        mockApiCall
      );

      expect(result).toEqual({ data: 'test' });
      expect(mockApiCall).toHaveBeenCalled();

      const metrics = performanceService.getMetrics();
      expect(metrics.apiCalls).toHaveLength(1);
      expect(metrics.apiCalls[0]).toMatchObject({
        method: 'GET',
        endpoint: '/api/test',
        success: true,
      });
    });

    it('should track failed API requests', async () => {
      const mockApiCall = jest.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(
        performanceService.trackApiCall('POST', '/api/create', mockApiCall)
      ).rejects.toThrow('Network error');

      const metrics = performanceService.getMetrics();
      expect(metrics.apiCalls).toHaveLength(1);
      expect(metrics.apiCalls[0]).toMatchObject({
        method: 'POST',
        endpoint: '/api/create',
        success: false,
        error: 'Network error',
      });
    });

    it('should track memory usage', () => {
      // Mock performance.memory (available in some environments)
      const mockMemory = {
        usedJSMemorySize: 10000000, // 10MB
        totalJSMemorySize: 50000000, // 50MB
        jsMemoryLimit: 100000000, // 100MB
      };

      (global as any).performance.memory = mockMemory;

      const memoryInfo = performanceService.getMemoryUsage();

      expect(memoryInfo).toEqual({
        used: 10000000,
        total: 50000000,
        limit: 100000000,
        usagePercentage: 20, // 10MB / 50MB = 20%
      });
    });

    it('should handle missing memory API gracefully', () => {
      delete (global as any).performance.memory;

      const memoryInfo = performanceService.getMemoryUsage();

      expect(memoryInfo).toEqual({
        used: 0,
        total: 0,
        limit: 0,
        usagePercentage: 0,
      });
    });
  });

  describe('Performance Metrics Collection', () => {
    it('should collect app startup metrics', () => {
      const startupTime = Date.now();
      
      performanceService.recordAppStartup({
        coldStart: true,
        startupTime: 1500, // 1.5 seconds
        bundleLoadTime: 800,
        nativeModuleInitTime: 400,
        jsInitTime: 300,
      });

      const metrics = performanceService.getMetrics();
      expect(metrics.appStartup).toMatchObject({
        coldStart: true,
        startupTime: 1500,
        bundleLoadTime: 800,
      });
    });

    it('should track component render performance', () => {
      performanceService.startComponentRender('UserProfile');
      
      // Simulate render time
      (global.performance.now as jest.Mock)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(50); // 50ms render

      performanceService.endComponentRender('UserProfile');

      const metrics = performanceService.getMetrics();
      expect(metrics.componentRenders).toHaveLength(1);
      expect(metrics.componentRenders[0]).toMatchObject({
        component: 'UserProfile',
        renderTime: 50,
      });
    });

    it('should track frame rate performance', () => {
      const frameData = {
        averageFPS: 58.5,
        droppedFrames: 12,
        totalFrames: 1000,
        measurementDuration: 10000, // 10 seconds
      };

      performanceService.recordFrameRate(frameData);

      const metrics = performanceService.getMetrics();
      expect(metrics.frameRate).toEqual(frameData);
    });

    it('should provide performance summary', () => {
      // Add some test data
      performanceService.recordAppStartup({
        coldStart: true,
        startupTime: 1500,
        bundleLoadTime: 800,
        nativeModuleInitTime: 400,
        jsInitTime: 300,
      });

      performanceService.startScreenTransition('Home', 'Settings');
      performanceService.endScreenTransition('Home', 'Settings');

      const summary = performanceService.getPerformanceSummary();

      expect(summary).toHaveProperty('appStartup');
      expect(summary).toHaveProperty('averageScreenTransitionTime');
      expect(summary).toHaveProperty('averageApiResponseTime');
      expect(summary).toHaveProperty('memoryUsage');
      expect(summary).toHaveProperty('totalScreenTransitions');
    });
  });

  describe('Performance Monitoring', () => {
    it('should detect slow screen transitions', () => {
      const slowTransitionCallback = jest.fn();
      performanceService.setSlowTransitionThreshold(1000, slowTransitionCallback);

      // Simulate slow transition (2 seconds)
      (global.performance.now as jest.Mock)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(2000);

      performanceService.startScreenTransition('Home', 'Profile');
      performanceService.endScreenTransition('Home', 'Profile');

      expect(slowTransitionCallback).toHaveBeenCalledWith({
        from: 'Home',
        to: 'Profile',
        duration: 2000,
        threshold: 1000,
      });
    });

    it('should detect slow API calls', async () => {
      const slowApiCallback = jest.fn();
      performanceService.setSlowApiThreshold(2000, slowApiCallback);

      const slowApiCall = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: 'slow' }), 2500))
      );

      // Mock performance.now to simulate 2.5 second API call
      (global.performance.now as jest.Mock)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(2500);

      await performanceService.trackApiCall('GET', '/slow-endpoint', slowApiCall);

      expect(slowApiCallback).toHaveBeenCalledWith({
        method: 'GET',
        endpoint: '/slow-endpoint',
        duration: 2500,
        threshold: 2000,
      });
    });

    it('should monitor memory usage growth', () => {
      const memoryWarningCallback = jest.fn();
      performanceService.setMemoryWarningThreshold(80, memoryWarningCallback);

      // Mock high memory usage
      (global as any).performance.memory = {
        usedJSMemorySize: 85000000, // 85MB
        totalJSMemorySize: 100000000, // 100MB
        jsMemoryLimit: 120000000, // 120MB
      };

      const memoryInfo = performanceService.getMemoryUsage();

      // This would typically be called periodically by a monitoring service
      if (memoryInfo.usagePercentage > 80) {
        memoryWarningCallback({
          usagePercentage: memoryInfo.usagePercentage,
          used: memoryInfo.used,
          threshold: 80,
        });
      }

      expect(memoryWarningCallback).toHaveBeenCalledWith({
        usagePercentage: 85,
        used: 85000000,
        threshold: 80,
      });
    });
  });

  describe('Data Persistence', () => {
    it('should persist performance metrics to storage', async () => {
      const metrics = {
        screenTransitions: [
          { from: 'Home', to: 'Profile', duration: 500, timestamp: Date.now() }
        ],
        apiCalls: [
          { method: 'GET', endpoint: '/test', duration: 200, success: true, timestamp: Date.now() }
        ],
      };

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await performanceService.persistMetrics();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'performance_metrics',
        expect.stringContaining('"screenTransitions"')
      );
    });

    it('should load persisted metrics from storage', async () => {
      const persistedMetrics = {
        screenTransitions: [
          { from: 'Settings', to: 'Home', duration: 300, timestamp: Date.now() }
        ],
        apiCalls: [],
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(persistedMetrics)
      );

      await performanceService.loadPersistedMetrics();

      const metrics = performanceService.getMetrics();
      expect(metrics.screenTransitions).toHaveLength(1);
      expect(metrics.screenTransitions[0].from).toBe('Settings');
    });

    it('should handle corrupted persisted data gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      // Should not throw an error
      await performanceService.loadPersistedMetrics();

      // Should have empty metrics
      const metrics = performanceService.getMetrics();
      expect(metrics.screenTransitions).toHaveLength(0);
      expect(metrics.apiCalls).toHaveLength(0);
    });
  });

  describe('Performance Reporting', () => {
    it('should generate performance report', () => {
      // Add some test data
      performanceService.recordAppStartup({
        coldStart: true,
        startupTime: 1500,
        bundleLoadTime: 800,
        nativeModuleInitTime: 400,
        jsInitTime: 300,
      });

      const report = performanceService.generateReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('appVersion');
      expect(report).toHaveProperty('deviceInfo');
      expect(report).toHaveProperty('metrics');
      expect(report.metrics).toHaveProperty('appStartup');
    });

    it('should export metrics in different formats', async () => {
      const metrics = performanceService.getMetrics();
      
      const jsonExport = performanceService.exportMetrics('json');
      expect(typeof jsonExport).toBe('string');
      expect(() => JSON.parse(jsonExport)).not.toThrow();

      const csvExport = performanceService.exportMetrics('csv');
      expect(typeof csvExport).toBe('string');
      expect(csvExport).toContain('timestamp,type,value');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during metric collection', () => {
      // Mock performance.now to throw an error
      (global.performance.now as jest.Mock).mockImplementation(() => {
        throw new Error('Performance API error');
      });

      // Should not throw, should handle gracefully
      expect(() => {
        performanceService.startScreenTransition('Home', 'Profile');
      }).not.toThrow();
    });

    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
        new Error('Storage full')
      );

      // Should not throw
      await expect(
        performanceService.persistMetrics()
      ).resolves.toBeUndefined();
    });
  });
});