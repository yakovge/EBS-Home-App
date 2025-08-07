/**
 * Tests for offline storage service
 */

import { offlineStorageService } from '../offlineStorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');

// Mock fetch
global.fetch = jest.fn();

describe('OfflineStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
    (fetch as jest.Mock).mockClear();
  });

  describe('Cache Management', () => {
    it('should cache successful API responses', async () => {
      const mockResponse = { data: 'test', id: '123' };
      
      // Mock online state
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
      
      // Mock successful API response
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: { get: () => 'application/json' },
      });

      // Mock cache storage
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await offlineStorageService.request('GET', '/test');

      expect(result).toEqual(mockResponse);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('cache_'),
        expect.stringContaining(JSON.stringify(mockResponse))
      );
    });

    it('should return cached data when offline', async () => {
      const cachedData = { data: 'cached', id: '456' };
      
      // Mock offline state
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });
      
      // Mock cached data exists
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({
          data: cachedData,
          timestamp: Date.now(),
          maxAge: 300000, // 5 minutes
        })
      );

      const result = await offlineStorageService.request('GET', '/test');

      expect(result).toEqual(cachedData);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should clear expired cache entries', async () => {
      const expiredTimestamp = Date.now() - 400000; // 6+ minutes ago
      
      // Mock online state
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
      
      // Mock expired cached data
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({
          data: { old: 'data' },
          timestamp: expiredTimestamp,
          maxAge: 300000, // 5 minutes
        })
      );

      // Mock fresh API response
      const freshData = { fresh: 'data' };
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(freshData),
        headers: { get: () => 'application/json' },
      });

      const result = await offlineStorageService.request('GET', '/test');

      expect(result).toEqual(freshData);
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('Operation Queuing', () => {
    it('should queue operations when offline', async () => {
      const operationData = { name: 'test', value: 123 };
      
      // Mock offline state
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });
      
      // Mock queue storage
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await offlineStorageService.request('POST', '/create', operationData);

      // Should have queued the operation
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('queue_'),
        expect.stringContaining(JSON.stringify(operationData))
      );
      
      // Should not have made network request
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should sync queued operations when back online', async () => {
      const queuedOperations = [
        {
          id: 'op1',
          method: 'POST',
          endpoint: '/create',
          data: { name: 'item1' },
          timestamp: Date.now(),
          retryCount: 0,
        },
        {
          id: 'op2',
          method: 'PUT',
          endpoint: '/update/123',
          data: { name: 'updated' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ];

      // Mock online state
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
      
      // Mock queued operations in storage
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        'queue_op1',
        'queue_op2',
      ]);
      
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
        ['queue_op1', JSON.stringify(queuedOperations[0])],
        ['queue_op2', JSON.stringify(queuedOperations[1])],
      ]);

      // Mock successful API responses for both operations
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, id: 'item1' }),
          headers: { get: () => 'application/json' },
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, id: '123' }),
          headers: { get: () => 'application/json' },
        });

      // Mock removal of processed operations
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

      await offlineStorageService.syncQueuedOperations();

      // Should have made both API calls
      expect(fetch).toHaveBeenCalledTimes(2);
      
      // Should have removed processed operations from queue
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['queue_op1', 'queue_op2']);
    });

    it('should retry failed operations with exponential backoff', async () => {
      const failedOperation = {
        id: 'failed_op',
        method: 'POST',
        endpoint: '/create',
        data: { name: 'retry_test' },
        timestamp: Date.now(),
        retryCount: 1,
      };

      // Mock online state
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
      
      // Mock failed operation in queue
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['queue_failed_op']);
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
        ['queue_failed_op', JSON.stringify(failedOperation)],
      ]);

      // Mock API failure
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      // Mock updating retry count
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await offlineStorageService.syncQueuedOperations();

      // Should have incremented retry count
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'queue_failed_op',
        expect.stringContaining('"retryCount":2')
      );
    });
  });

  describe('Network State Monitoring', () => {
    it('should detect network state changes', async () => {
      const mockNetInfoSubscribe = jest.fn();
      (NetInfo.addEventListener as jest.Mock).mockImplementation(mockNetInfoSubscribe);

      // Initialize service (this would happen in constructor)
      offlineStorageService.initialize();

      expect(NetInfo.addEventListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should trigger sync when going from offline to online', async () => {
      let networkChangeHandler: (state: any) => void;
      
      // Capture the network change handler
      (NetInfo.addEventListener as jest.Mock).mockImplementation((handler) => {
        networkChangeHandler = handler;
        return jest.fn(); // mock unsubscribe function
      });

      // Mock initial offline state
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });

      offlineStorageService.initialize();

      // Mock going online
      const onlineState = { isConnected: true, type: 'wifi' };
      
      // Mock queued operations exist
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['queue_op1']);
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
        ['queue_op1', JSON.stringify({
          id: 'op1',
          method: 'POST',
          endpoint: '/sync-test',
          data: { test: true },
          timestamp: Date.now(),
          retryCount: 0,
        })],
      ]);

      // Mock successful sync
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ synced: true }),
        headers: { get: () => 'application/json' },
      });

      // Trigger network state change
      networkChangeHandler(onlineState);

      // Allow async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have attempted to sync
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('Cache Statistics', () => {
    it('should provide cache statistics', async () => {
      // Mock cache entries
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        'cache_endpoint1',
        'cache_endpoint2',
        'queue_op1',
      ]);

      const stats = await offlineStorageService.getCacheStats();

      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('queueSize');
      expect(stats).toHaveProperty('isOnline');
    });

    it('should clear cache when requested', async () => {
      // Mock cache keys
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        'cache_endpoint1',
        'cache_endpoint2',
      ]);

      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

      await offlineStorageService.clearCache();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'cache_endpoint1',
        'cache_endpoint2',
      ]);
    });
  });
});