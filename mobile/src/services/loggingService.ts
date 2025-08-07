/**
 * Comprehensive logging and monitoring service
 * Provides centralized logging, error tracking, and system monitoring
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Dimensions } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  stackTrace?: string;
  sessionId: string;
  userId?: string;
  deviceInfo?: DeviceInfo;
  location?: string;
  buildInfo?: BuildInfo;
}

interface DeviceInfo {
  platform: string;
  platformVersion: string;
  deviceModel: string;
  deviceName: string;
  deviceType: number;
  isDevice: boolean;
  screenDimensions: {
    width: number;
    height: number;
    scale: number;
  };
  totalMemory?: number;
}

interface BuildInfo {
  version: string;
  buildNumber: string;
  bundleId: string;
  environment: 'development' | 'staging' | 'production';
}

interface SystemMetrics {
  timestamp: number;
  memoryUsage: {
    used?: number;
    total?: number;
    jsHeapSizeLimit?: number;
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
  };
  performance: {
    navigationStart?: number;
    loadEventEnd?: number;
    domContentLoaded?: number;
  };
  network: {
    type?: string;
    effectiveType?: string;
  };
  battery?: {
    level: number;
    charging: boolean;
  };
}

interface CrashReport {
  id: string;
  timestamp: number;
  error: Error;
  componentStack?: string;
  errorInfo?: any;
  sessionId: string;
  userId?: string;
  deviceInfo: DeviceInfo;
  lastActions: LogEntry[];
  systemMetrics: SystemMetrics;
}

class LoggingService {
  private logs: LogEntry[] = [];
  private crashes: CrashReport[] = [];
  private systemMetrics: SystemMetrics[] = [];
  
  private sessionId: string;
  private userId?: string;
  private deviceInfo: DeviceInfo;
  private buildInfo: BuildInfo;
  
  private readonly MAX_LOGS = 10000;
  private readonly MAX_CRASHES = 100;
  private readonly MAX_METRICS = 1000;
  private readonly STORAGE_KEY_LOGS = 'app_logs';
  private readonly STORAGE_KEY_CRASHES = 'app_crashes';
  private readonly STORAGE_KEY_METRICS = 'app_metrics';
  
  private metricsInterval?: NodeJS.Timeout;
  private uploadInterval?: NodeJS.Timeout;
  
  private logLevel: LogLevel = __DEV__ ? 'debug' : 'info';
  private enableRemoteLogging = false;
  private enableCrashReporting = true;
  private enableMetricsCollection = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.deviceInfo = this.getDeviceInfo();
    this.buildInfo = this.getBuildInfo();
    
    this.initializeLogging();
  }

  /**
   * Public initialize method for external initialization
   */
  async initialize(): Promise<void> {
    // Constructor already calls initializeLogging(), but this provides
    // a public interface for re-initialization if needed
    return this.initializeLogging();
  }

  /**
   * Initialize logging service
   */
  private async initializeLogging(): Promise<void> {
    try {
      // Load existing logs
      await this.loadStoredData();
      
      // Setup global error handlers
      this.setupErrorHandlers();
      
      // Start system monitoring
      if (this.enableMetricsCollection) {
        this.startMetricsCollection();
      }
      
      // Setup periodic uploads (if remote logging enabled)
      if (this.enableRemoteLogging) {
        this.startPeriodicUpload();
      }
      
      this.info('logging', 'Logging service initialized', {
        sessionId: this.sessionId,
        logLevel: this.logLevel,
        platform: Platform.OS,
      });
      
    } catch (error) {
      console.error('Failed to initialize logging service:', error);
    }
  }

  /**
   * Setup global error handlers
   */
  private setupErrorHandlers(): void {
    // Global error handler for unhandled promise rejections
    const originalHandler = global.Promise.prototype.catch;
    global.Promise.prototype.catch = function(onRejected) {
      return originalHandler.call(this, (error) => {
        loggingService.error('unhandled_promise', 'Unhandled promise rejection', error);
        if (onRejected) {
          return onRejected(error);
        }
        throw error;
      });
    };

    // React Native error handler
    if (global.ErrorUtils) {
      const originalGlobalHandler = global.ErrorUtils.getGlobalHandler();
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        loggingService.fatal('global_error', 'Global error caught', {
          error: error.message,
          stack: error.stack,
          isFatal,
        });
        
        if (originalGlobalHandler) {
          originalGlobalHandler(error, isFatal);
        }
      });
    }
  }

  /**
   * Start collecting system metrics
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 60000); // Every minute
    
    console.log('📊 System metrics collection started');
  }

  /**
   * Start periodic upload of logs
   */
  private startPeriodicUpload(): void {
    this.uploadInterval = setInterval(() => {
      this.uploadLogs();
    }, 300000); // Every 5 minutes
    
    console.log('📡 Periodic log upload started');
  }

  /**
   * Collect current system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      const metrics: SystemMetrics = {
        timestamp: Date.now(),
        memoryUsage: this.getMemoryUsage(),
        performance: this.getPerformanceMetrics(),
        network: this.getNetworkInfo(),
      };

      this.systemMetrics.push(metrics);
      
      // Keep only recent metrics
      if (this.systemMetrics.length > this.MAX_METRICS) {
        this.systemMetrics = this.systemMetrics.slice(-this.MAX_METRICS);
      }
      
    } catch (error) {
      this.error('metrics', 'Failed to collect system metrics', error);
    }
  }

  /**
   * Log debug message
   */
  debug(category: string, message: string, data?: any): void {
    this.log('debug', category, message, data);
  }

  /**
   * Log info message
   */
  info(category: string, message: string, data?: any): void {
    this.log('info', category, message, data);
  }

  /**
   * Log warning message
   */
  warn(category: string, message: string, data?: any): void {
    this.log('warn', category, message, data);
  }

  /**
   * Log error message
   */
  error(category: string, message: string, error?: any): void {
    const stackTrace = error instanceof Error ? error.stack : undefined;
    this.log('error', category, message, error, stackTrace);
  }

  /**
   * Log fatal error
   */
  fatal(category: string, message: string, error?: any): void {
    const stackTrace = error instanceof Error ? error.stack : undefined;
    this.log('fatal', category, message, error, stackTrace);
  }

  /**
   * Core logging function
   */
  private log(
    level: LogLevel,
    category: string,
    message: string,
    data?: any,
    stackTrace?: string
  ): void {
    // Skip if log level is below current setting
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      category,
      message,
      data: this.sanitizeData(data),
      stackTrace,
      sessionId: this.sessionId,
      userId: this.userId,
      deviceInfo: this.deviceInfo,
      buildInfo: this.buildInfo,
    };

    // Add to logs array
    this.logs.push(logEntry);
    
    // Keep only recent logs
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // Console logging for development
    if (__DEV__) {
      this.consoleLog(logEntry);
    }

    // Store logs periodically
    this.debouncedSave();
  }

  /**
   * Log user action
   */
  logUserAction(
    action: string,
    screen: string,
    data?: any
  ): void {
    this.info('user_action', `User ${action} on ${screen}`, {
      action,
      screen,
      ...data,
    });
  }

  /**
   * Log API request
   */
  logApiRequest(
    method: string,
    url: string,
    status: number,
    duration: number,
    data?: any
  ): void {
    const level = status >= 400 ? 'error' : 'info';
    this.log(level, 'api_request', `${method} ${url} - ${status}`, {
      method,
      url,
      status,
      duration,
      ...data,
    });
  }

  /**
   * Log navigation event
   */
  logNavigation(from: string, to: string, data?: any): void {
    this.info('navigation', `Navigation: ${from} -> ${to}`, {
      from,
      to,
      ...data,
    });
  }

  /**
   * Log performance metric
   */
  logPerformance(
    operation: string,
    duration: number,
    metadata?: any
  ): void {
    const level = duration > 1000 ? 'warn' : 'info';
    this.log(level, 'performance', `${operation} took ${duration}ms`, {
      operation,
      duration,
      ...metadata,
    });
  }

  /**
   * Report crash
   */
  reportCrash(
    error: Error,
    componentStack?: string,
    errorInfo?: any
  ): void {
    const crashReport: CrashReport = {
      id: this.generateId(),
      timestamp: Date.now(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } as Error,
      componentStack,
      errorInfo,
      sessionId: this.sessionId,
      userId: this.userId,
      deviceInfo: this.deviceInfo,
      lastActions: this.logs.slice(-50), // Last 50 log entries
      systemMetrics: this.systemMetrics.slice(-5), // Last 5 metric readings
    };

    this.crashes.push(crashReport);
    
    // Keep only recent crashes
    if (this.crashes.length > this.MAX_CRASHES) {
      this.crashes = this.crashes.slice(-this.MAX_CRASHES);
    }

    this.fatal('crash', 'Application crash reported', {
      error: error.message,
      stack: error.stack,
      crashId: crashReport.id,
    });

    // Save crash report immediately
    this.saveCrashes();
  }

  /**
   * Get logs filtered by criteria
   */
  getLogs(filters?: {
    level?: LogLevel;
    category?: string;
    since?: number;
    limit?: number;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filters) {
      if (filters.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filters.level);
      }
      
      if (filters.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filters.category);
      }
      
      if (filters.since) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.since!);
      }
      
      if (filters.limit) {
        filteredLogs = filteredLogs.slice(-filters.limit);
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get crash reports
   */
  getCrashes(): CrashReport[] {
    return [...this.crashes].sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics[] {
    return [...this.systemMetrics].sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Export all data for debugging
   */
  exportData(): {
    sessionId: string;
    deviceInfo: DeviceInfo;
    buildInfo: BuildInfo;
    logs: LogEntry[];
    crashes: CrashReport[];
    systemMetrics: SystemMetrics[];
  } {
    return {
      sessionId: this.sessionId,
      deviceInfo: this.deviceInfo,
      buildInfo: this.buildInfo,
      logs: this.logs,
      crashes: this.crashes,
      systemMetrics: this.systemMetrics,
    };
  }

  /**
   * Set current user ID
   */
  setUserId(userId: string): void {
    this.userId = userId;
    this.info('logging', 'User ID set', { userId });
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info('logging', 'Log level changed', { level });
  }

  /**
   * Clear all logs
   */
  async clearLogs(): Promise<void> {
    this.logs = [];
    this.crashes = [];
    this.systemMetrics = [];
    
    await this.clearStoredData();
    this.info('logging', 'All logs cleared');
  }

  // Helper methods

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    
    return messageIndex >= currentIndex;
  }

  private consoleLog(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] ${entry.level.toUpperCase()} [${entry.category}]`;
    
    switch (entry.level) {
      case 'debug':
        console.debug(prefix, entry.message, entry.data);
        break;
      case 'info':
        console.info(prefix, entry.message, entry.data);
        break;
      case 'warn':
        console.warn(prefix, entry.message, entry.data);
        break;
      case 'error':
      case 'fatal':
        console.error(prefix, entry.message, entry.data);
        if (entry.stackTrace) {
          console.error('Stack trace:', entry.stackTrace);
        }
        break;
    }
  }

  private sanitizeData(data: any): any {
    if (!data) return data;
    
    try {
      // Remove potential sensitive information
      const sanitized = JSON.parse(JSON.stringify(data));
      
      // Recursively remove sensitive keys
      const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];
      
      const removeSensitive = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) return obj;
        
        if (Array.isArray(obj)) {
          return obj.map(removeSensitive);
        }
        
        const result = { ...obj };
        for (const key of Object.keys(result)) {
          if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
            result[key] = '[REDACTED]';
          } else if (typeof result[key] === 'object') {
            result[key] = removeSensitive(result[key]);
          }
        }
        
        return result;
      };
      
      return removeSensitive(sanitized);
    } catch (error) {
      return '[SERIALIZATION_ERROR]';
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getDeviceInfo(): DeviceInfo {
    const { width, height, scale } = Dimensions.get('screen');
    
    return {
      platform: Platform.OS,
      platformVersion: Platform.Version.toString(),
      deviceModel: Device.modelName || 'Unknown',
      deviceName: Device.deviceName || 'Unknown',
      deviceType: Device.deviceType || 0,
      isDevice: Device.isDevice,
      screenDimensions: { width, height, scale },
    };
  }

  private getBuildInfo(): BuildInfo {
    return {
      version: Application.nativeApplicationVersion || '0.0.0',
      buildNumber: Application.nativeBuildVersion || '0',
      bundleId: Application.applicationId || 'unknown',
      environment: __DEV__ ? 'development' : 'production',
    };
  }

  private getMemoryUsage(): SystemMetrics['memoryUsage'] {
    const memory: any = {};
    
    if (global.performance && global.performance.memory) {
      memory.jsHeapSizeLimit = global.performance.memory.jsHeapSizeLimit;
      memory.usedJSHeapSize = global.performance.memory.usedJSHeapSize;
      memory.totalJSHeapSize = global.performance.memory.totalJSHeapSize;
    }
    
    return memory;
  }

  private getPerformanceMetrics(): SystemMetrics['performance'] {
    const performance: any = {};
    
    if (global.performance) {
      performance.navigationStart = global.performance.timeOrigin;
    }
    
    return performance;
  }

  private getNetworkInfo(): SystemMetrics['network'] {
    // In React Native, network info would come from @react-native-community/netinfo
    return {};
  }

  // Storage methods
  private debouncedSave = this.debounce(() => {
    this.saveLogs();
  }, 5000);

  private debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  private async loadStoredData(): Promise<void> {
    try {
      const [logsData, crashesData, metricsData] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEY_LOGS),
        AsyncStorage.getItem(this.STORAGE_KEY_CRASHES),
        AsyncStorage.getItem(this.STORAGE_KEY_METRICS),
      ]);

      if (logsData) {
        this.logs = JSON.parse(logsData);
      }
      
      if (crashesData) {
        this.crashes = JSON.parse(crashesData);
      }
      
      if (metricsData) {
        this.systemMetrics = JSON.parse(metricsData);
      }
      
    } catch (error) {
      console.error('Failed to load stored logging data:', error);
    }
  }

  private async saveLogs(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY_LOGS, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save logs:', error);
    }
  }

  private async saveCrashes(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY_CRASHES, JSON.stringify(this.crashes));
    } catch (error) {
      console.error('Failed to save crashes:', error);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY_METRICS, JSON.stringify(this.systemMetrics));
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }

  private async clearStoredData(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(this.STORAGE_KEY_LOGS),
      AsyncStorage.removeItem(this.STORAGE_KEY_CRASHES),
      AsyncStorage.removeItem(this.STORAGE_KEY_METRICS),
    ]);
  }

  private async uploadLogs(): Promise<void> {
    // In a real implementation, this would upload logs to a remote service
    if (!this.enableRemoteLogging) return;
    
    try {
      // TODO: Implement actual log upload
      console.log('📡 Uploading logs to remote service...');
    } catch (error) {
      this.error('upload', 'Failed to upload logs', error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
    }
    
    this.saveLogs();
    this.saveCrashes();
    this.saveMetrics();
    
    console.log('🧹 Logging service destroyed');
  }
}

export const loggingService = new LoggingService();
export type { LogLevel, LogEntry, DeviceInfo, BuildInfo, SystemMetrics, CrashReport };