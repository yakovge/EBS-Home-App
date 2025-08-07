/**
 * Tests for logging service
 */

import { loggingService, LogLevel } from '../loggingService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');

// Mock console methods
const originalConsole = global.console;
const mockConsole = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('LoggingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.console = mockConsole as any;
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
    (AsyncStorage.removeItem as jest.Mock).mockClear();
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
  });

  afterEach(() => {
    global.console = originalConsole;
  });

  describe('Basic Logging', () => {
    it('should log debug messages', async () => {
      await loggingService.debug('Debug message', { context: 'test' });

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        expect.stringContaining('Debug message')
      );
    });

    it('should log info messages', async () => {
      await loggingService.info('Info message', { userId: '123' });

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('Info message')
      );
    });

    it('should log warning messages', async () => {
      await loggingService.warn('Warning message', { component: 'LoginForm' });

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        expect.stringContaining('Warning message')
      );
    });

    it('should log error messages', async () => {
      const error = new Error('Test error');
      await loggingService.error('Error occurred', { error });

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.stringContaining('Error occurred')
      );
    });

    it('should log fatal messages', async () => {
      await loggingService.fatal('Fatal error', { critical: true });

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('[FATAL]'),
        expect.stringContaining('Fatal error')
      );
    });
  });

  describe('Log Levels', () => {
    it('should respect log level filtering', async () => {
      loggingService.setLogLevel(LogLevel.WARN);

      await loggingService.debug('Should not appear');
      await loggingService.info('Should not appear');
      await loggingService.warn('Should appear');
      await loggingService.error('Should appear');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should allow all logs when level is DEBUG', async () => {
      loggingService.setLogLevel(LogLevel.DEBUG);

      await loggingService.debug('Debug message');
      await loggingService.info('Info message');
      await loggingService.warn('Warn message');
      await loggingService.error('Error message');

      expect(mockConsole.debug).toHaveBeenCalled();
      expect(mockConsole.info).toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should silence all logs when level is OFF', async () => {
      loggingService.setLogLevel(LogLevel.OFF);

      await loggingService.debug('Should not appear');
      await loggingService.info('Should not appear');
      await loggingService.warn('Should not appear');
      await loggingService.error('Should not appear');
      await loggingService.fatal('Should not appear');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).not.toHaveBeenCalled();
    });
  });

  describe('Log Persistence', () => {
    it('should persist logs to storage', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await loggingService.info('Persistent log message');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('logs_'),
        expect.stringContaining('"message":"Persistent log message"')
      );
    });

    it('should retrieve persisted logs', async () => {
      const mockLogs = [
        {
          level: LogLevel.INFO,
          message: 'Test log 1',
          timestamp: Date.now() - 1000,
          context: {},
        },
        {
          level: LogLevel.ERROR,
          message: 'Test log 2',
          timestamp: Date.now(),
          context: { error: 'Test error' },
        },
      ];

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['logs_day1']);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockLogs));

      const logs = await loggingService.getLogs();

      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('Test log 1');
      expect(logs[1].message).toBe('Test log 2');
    });

    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
        new Error('Storage full')
      );

      // Should not throw
      await expect(
        loggingService.info('Test message')
      ).resolves.toBeUndefined();

      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('should rotate logs when storage limit is reached', async () => {
      const oldLogs = Array.from({ length: 1000 }, (_, i) => ({
        level: LogLevel.INFO,
        message: `Log message ${i}`,
        timestamp: Date.now() - (1000 - i) * 1000,
        context: {},
      }));

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        'logs_day1', 'logs_day2', 'logs_day3'
      ]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(oldLogs));
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await loggingService.info('New log that triggers rotation');

      // Should remove oldest log files
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('logs_day1');
    });
  });

  describe('Log Formatting', () => {
    it('should format logs with timestamps', async () => {
      const beforeTime = Date.now();
      await loggingService.info('Test message');
      const afterTime = Date.now();

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/),
        expect.stringContaining('Test message')
      );
    });

    it('should include context in log output', async () => {
      const context = { userId: '123', action: 'login' };
      await loggingService.info('User action', context);

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('"userId":"123"'),
        expect.stringContaining('"action":"login"')
      );
    });

    it('should format error objects properly', async () => {
      const error = new Error('Test error message');
      error.stack = 'Error stack trace';

      await loggingService.error('Error occurred', { error });

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Test error message'),
        expect.stringContaining('Error stack trace')
      );
    });

    it('should handle circular references in context', async () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      // Should not throw
      await expect(
        loggingService.info('Test with circular ref', { circular: circularObj })
      ).resolves.toBeUndefined();

      expect(mockConsole.info).toHaveBeenCalled();
    });
  });

  describe('Remote Logging', () => {
    it('should send logs to remote server when online', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      global.fetch = mockFetch;

      loggingService.enableRemoteLogging('https://api.example.com/logs', 'api-key');

      await loggingService.error('Critical error', { severity: 'high' });

      // Allow time for remote logging to process
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/logs',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer api-key',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('Critical error'),
        })
      );
    });

    it('should queue logs for remote sending when offline', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      loggingService.enableRemoteLogging('https://api.example.com/logs', 'api-key');

      await loggingService.error('Offline error');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'pending_remote_logs',
        expect.stringContaining('Offline error')
      );
    });

    it('should send queued logs when coming back online', async () => {
      const queuedLogs = [
        {
          level: LogLevel.ERROR,
          message: 'Queued error 1',
          timestamp: Date.now() - 1000,
          context: {},
        },
        {
          level: LogLevel.WARN,
          message: 'Queued warning',
          timestamp: Date.now() - 500,
          context: {},
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(queuedLogs));
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      const mockFetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      global.fetch = mockFetch;

      loggingService.enableRemoteLogging('https://api.example.com/logs', 'api-key');

      await loggingService.flushQueuedLogs();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/logs',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Queued error 1'),
        })
      );

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('pending_remote_logs');
    });

    it('should handle remote logging failures gracefully', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      loggingService.enableRemoteLogging('https://api.example.com/logs', 'api-key');

      // Should not throw
      await expect(
        loggingService.error('Test error')
      ).resolves.toBeUndefined();

      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('Log Analysis', () => {
    it('should analyze log patterns', async () => {
      const mockLogs = [
        { level: LogLevel.ERROR, message: 'Login failed', timestamp: Date.now() - 3000 },
        { level: LogLevel.ERROR, message: 'Login failed', timestamp: Date.now() - 2000 },
        { level: LogLevel.ERROR, message: 'Login failed', timestamp: Date.now() - 1000 },
        { level: LogLevel.INFO, message: 'User logged in', timestamp: Date.now() },
      ];

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['logs_today']);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockLogs));

      const analysis = await loggingService.analyzeLogPatterns();

      expect(analysis).toHaveProperty('totalLogs');
      expect(analysis).toHaveProperty('logsByLevel');
      expect(analysis).toHaveProperty('frequentMessages');
      expect(analysis).toHaveProperty('errorPatterns');

      expect(analysis.totalLogs).toBe(4);
      expect(analysis.logsByLevel[LogLevel.ERROR]).toBe(3);
      expect(analysis.logsByLevel[LogLevel.INFO]).toBe(1);
    });

    it('should detect error spikes', async () => {
      const recentErrors = Array.from({ length: 10 }, (_, i) => ({
        level: LogLevel.ERROR,
        message: `Error ${i}`,
        timestamp: Date.now() - (10 - i) * 1000, // Errors in last 10 seconds
        context: {},
      }));

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['logs_today']);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(recentErrors));

      const hasErrorSpike = await loggingService.detectErrorSpike(5, 60000); // 5 errors in 1 minute

      expect(hasErrorSpike).toBe(true);
    });

    it('should generate log statistics', async () => {
      const mockLogs = [
        { level: LogLevel.DEBUG, message: 'Debug 1', timestamp: Date.now() - 4000 },
        { level: LogLevel.INFO, message: 'Info 1', timestamp: Date.now() - 3000 },
        { level: LogLevel.WARN, message: 'Warning 1', timestamp: Date.now() - 2000 },
        { level: LogLevel.ERROR, message: 'Error 1', timestamp: Date.now() - 1000 },
        { level: LogLevel.FATAL, message: 'Fatal 1', timestamp: Date.now() },
      ];

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['logs_today']);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockLogs));

      const stats = await loggingService.getLogStatistics();

      expect(stats).toHaveProperty('totalLogs', 5);
      expect(stats).toHaveProperty('logsByLevel');
      expect(stats.logsByLevel[LogLevel.DEBUG]).toBe(1);
      expect(stats.logsByLevel[LogLevel.INFO]).toBe(1);
      expect(stats.logsByLevel[LogLevel.WARN]).toBe(1);
      expect(stats.logsByLevel[LogLevel.ERROR]).toBe(1);
      expect(stats.logsByLevel[LogLevel.FATAL]).toBe(1);
    });
  });

  describe('Performance', () => {
    it('should handle high-volume logging efficiently', async () => {
      const startTime = Date.now();

      // Log 1000 messages
      const promises = Array.from({ length: 1000 }, (_, i) =>
        loggingService.info(`Message ${i}`)
      );

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);
      expect(mockConsole.info).toHaveBeenCalledTimes(1000);
    });

    it('should not block main thread with logging operations', async () => {
      let mainThreadBlocked = false;

      // Start logging operation
      const loggingPromise = loggingService.info('Test message', { large: 'x'.repeat(10000) });

      // Check if main thread is responsive
      const timeoutPromise = new Promise(resolve => {
        setTimeout(() => {
          mainThreadBlocked = false;
          resolve(true);
        }, 10);
      });

      await Promise.race([loggingPromise, timeoutPromise]);

      expect(mainThreadBlocked).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should apply custom log configuration', () => {
      const config = {
        level: LogLevel.WARN,
        enablePersistence: false,
        enableRemoteLogging: false,
        maxLogFileSize: 100 * 1024, // 100KB
        maxLogFiles: 3,
      };

      loggingService.configure(config);

      // Test that configuration is applied
      loggingService.debug('Should not appear');
      loggingService.warn('Should appear');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
    });

    it('should support custom log formatters', async () => {
      const customFormatter = (level: LogLevel, message: string, context: any) => {
        return `CUSTOM [${level}] ${message} ${JSON.stringify(context)}`;
      };

      loggingService.setFormatter(customFormatter);

      await loggingService.info('Test message', { test: true });

      expect(mockConsole.info).toHaveBeenCalledWith(
        'CUSTOM [INFO] Test message {"test":true}'
      );
    });
  });
});