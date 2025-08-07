/**
 * Offline storage service for caching data when network is unavailable
 * Provides intelligent caching, synchronization, and conflict resolution
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { apiClient } from './api';
import { Config } from '../config';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: number;
  etag?: string;
}

interface QueuedOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  data?: any;
  timestamp: number;
  retryCount: number;
  priority: 'high' | 'medium' | 'low';
}

interface SyncStatus {
  isOnline: boolean;
  lastSync: number;
  pendingOperations: number;
  failedOperations: number;
  nextSyncAttempt?: number;
}

class OfflineStorageService {
  private readonly CACHE_PREFIX = 'cache_';
  private readonly QUEUE_PREFIX = 'queue_';
  private readonly SYNC_STATUS_KEY = 'sync_status';
  private readonly MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly SYNC_INTERVAL = 30 * 1000; // 30 seconds

  private isOnline: boolean = true;
  private syncTimer?: NodeJS.Timeout;
  private operationQueue: QueuedOperation[] = [];

  constructor() {
    this.initializeNetworkMonitoring();
    this.loadOperationQueue();
  }

  /**
   * Initialize network state monitoring
   */
  private async initializeNetworkMonitoring(): Promise<void> {
    // Get initial network state
    const netInfo = await NetInfo.fetch();
    this.isOnline = netInfo.isConnected ?? false;

    // Listen for network state changes
    NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (!wasOnline && this.isOnline) {
        // Just came online - start sync
        console.log('📶 Network available - starting sync');
        this.startSync();
      } else if (wasOnline && !this.isOnline) {
        // Just went offline
        console.log('📵 Network unavailable - entering offline mode');
        this.stopSync();
      }

      this.updateSyncStatus();
    });

    // Start sync timer if online
    if (this.isOnline) {
      this.startSync();
    }
  }

  /**
   * Load queued operations from storage
   */
  private async loadOperationQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(this.QUEUE_PREFIX + 'operations');
      if (queueData) {
        this.operationQueue = JSON.parse(queueData);
        console.log(`📦 Loaded ${this.operationQueue.length} queued operations`);
      }
    } catch (error) {
      console.error('Error loading operation queue:', error);
      this.operationQueue = [];
    }
  }

  /**
   * Save operation queue to storage
   */
  private async saveOperationQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.QUEUE_PREFIX + 'operations',
        JSON.stringify(this.operationQueue)
      );
    } catch (error) {
      console.error('Error saving operation queue:', error);
    }
  }

  /**
   * Start periodic sync
   */
  private startSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingOperations();
      }
    }, this.SYNC_INTERVAL);

    // Immediate sync attempt
    this.syncPendingOperations();
  }

  /**
   * Stop periodic sync
   */
  private stopSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  /**
   * Cache data with expiration
   */
  async cacheData<T>(key: string, data: T, ttl?: number): Promise<void> {
    const expiration = ttl || this.MAX_CACHE_AGE;
    const cacheEntry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + expiration,
      version: 1,
    };

    try {
      await AsyncStorage.setItem(
        this.CACHE_PREFIX + key,
        JSON.stringify(cacheEntry)
      );
      console.log(`💾 Cached data for key: ${key}`);
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  /**
   * Get cached data
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_PREFIX + key);
      if (!cached) {
        return null;
      }

      const cacheEntry: CacheEntry<T> = JSON.parse(cached);

      // Check if cache is expired
      if (Date.now() > cacheEntry.expiresAt) {
        await this.clearCachedData(key);
        console.log(`🗑️ Expired cache removed for key: ${key}`);
        return null;
      }

      console.log(`📦 Retrieved cached data for key: ${key}`);
      return cacheEntry.data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  /**
   * Clear cached data
   */
  async clearCachedData(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CACHE_PREFIX + key);
    } catch (error) {
      console.error('Error clearing cached data:', error);
    }
  }

  /**
   * Clear all cached data
   */
  async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`🗑️ Cleared ${cacheKeys.length} cache entries`);
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  /**
   * Make API request with offline support
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    options: {
      cacheKey?: string;
      cacheTTL?: number;
      priority?: 'high' | 'medium' | 'low';
      skipCache?: boolean;
    } = {}
  ): Promise<T> {
    const { cacheKey, cacheTTL, priority = 'medium', skipCache = false } = options;

    // For GET requests, try cache first
    if (method === 'GET' && cacheKey && !skipCache) {
      const cached = await this.getCachedData<T>(cacheKey);
      if (cached !== null) {
        // If offline, return cached data
        if (!this.isOnline) {
          console.log(`📱 Offline - using cached data for ${endpoint}`);
          return cached;
        }
      }
    }

    // If online, try to make the request
    if (this.isOnline) {
      try {
        let response: T;
        
        switch (method) {
          case 'GET':
            response = await apiClient.get<T>(endpoint);
            break;
          case 'POST':
            response = await apiClient.post<T>(endpoint, data);
            break;
          case 'PUT':
            response = await apiClient.put<T>(endpoint, data);
            break;
          case 'DELETE':
            response = await apiClient.delete<T>(endpoint);
            break;
          default:
            throw new Error(`Unsupported method: ${method}`);
        }

        // Cache successful GET responses
        if (method === 'GET' && cacheKey && response) {
          await this.cacheData(cacheKey, response, cacheTTL);
        }

        return response;
      } catch (error) {
        console.error(`Network error for ${method} ${endpoint}:`, error);
        
        // If GET request failed, try to return cached data
        if (method === 'GET' && cacheKey) {
          const cached = await this.getCachedData<T>(cacheKey);
          if (cached !== null) {
            console.log(`🔄 Network failed - using cached data for ${endpoint}`);
            return cached;
          }
        }

        // For non-GET requests, queue the operation
        if (method !== 'GET') {
          await this.queueOperation(method, endpoint, data, priority);
          throw new Error(`Request queued for later sync: ${method} ${endpoint}`);
        }

        throw error;
      }
    }

    // Offline handling
    if (method === 'GET' && cacheKey) {
      const cached = await this.getCachedData<T>(cacheKey);
      if (cached !== null) {
        console.log(`📱 Offline - using cached data for ${endpoint}`);
        return cached;
      }
    }

    // For non-GET requests while offline, queue the operation
    if (method !== 'GET') {
      await this.queueOperation(method, endpoint, data, priority);
      throw new Error(`Offline - request queued: ${method} ${endpoint}`);
    }

    throw new Error(`No cached data available for ${endpoint}`);
  }

  /**
   * Queue an operation for later sync
   */
  private async queueOperation(
    method: 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    const operation: QueuedOperation = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: method as 'CREATE' | 'UPDATE' | 'DELETE',
      endpoint,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      priority,
    };

    this.operationQueue.push(operation);
    
    // Sort by priority and timestamp
    this.operationQueue.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });

    await this.saveOperationQueue();
    await this.updateSyncStatus();

    console.log(`📝 Queued ${method} operation for ${endpoint} (priority: ${priority})`);
  }

  /**
   * Sync pending operations
   */
  private async syncPendingOperations(): Promise<void> {
    if (!this.isOnline || this.operationQueue.length === 0) {
      return;
    }

    console.log(`🔄 Syncing ${this.operationQueue.length} pending operations`);

    const operations = [...this.operationQueue];
    let syncedCount = 0;
    let failedCount = 0;

    for (const operation of operations) {
      try {
        await this.executeOperation(operation);
        
        // Remove successful operation from queue
        this.operationQueue = this.operationQueue.filter(op => op.id !== operation.id);
        syncedCount++;
        
        console.log(`✅ Synced ${operation.type} ${operation.endpoint}`);
      } catch (error) {
        console.error(`❌ Failed to sync ${operation.type} ${operation.endpoint}:`, error);
        
        // Increment retry count
        const queuedOp = this.operationQueue.find(op => op.id === operation.id);
        if (queuedOp) {
          queuedOp.retryCount++;
          
          // Remove if max retries exceeded
          if (queuedOp.retryCount >= this.MAX_RETRY_ATTEMPTS) {
            this.operationQueue = this.operationQueue.filter(op => op.id !== operation.id);
            console.log(`🚫 Removed failed operation after ${this.MAX_RETRY_ATTEMPTS} attempts: ${operation.endpoint}`);
          }
        }
        
        failedCount++;
      }
    }

    await this.saveOperationQueue();
    await this.updateSyncStatus();

    if (syncedCount > 0) {
      console.log(`🎉 Successfully synced ${syncedCount} operations`);
    }

    if (failedCount > 0) {
      console.log(`⚠️ ${failedCount} operations failed to sync`);
    }
  }

  /**
   * Execute a queued operation
   */
  private async executeOperation(operation: QueuedOperation): Promise<any> {
    switch (operation.type) {
      case 'CREATE':
        return await apiClient.post(operation.endpoint, operation.data);
      case 'UPDATE':
        return await apiClient.put(operation.endpoint, operation.data);
      case 'DELETE':
        return await apiClient.delete(operation.endpoint);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Update sync status
   */
  private async updateSyncStatus(): Promise<void> {
    const status: SyncStatus = {
      isOnline: this.isOnline,
      lastSync: Date.now(),
      pendingOperations: this.operationQueue.length,
      failedOperations: this.operationQueue.filter(op => op.retryCount > 0).length,
    };

    try {
      await AsyncStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify(status));
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const statusData = await AsyncStorage.getItem(this.SYNC_STATUS_KEY);
      if (statusData) {
        return JSON.parse(statusData);
      }
    } catch (error) {
      console.error('Error getting sync status:', error);
    }

    return {
      isOnline: this.isOnline,
      lastSync: 0,
      pendingOperations: this.operationQueue.length,
      failedOperations: 0,
    };
  }

  /**
   * Force sync all pending operations
   */
  async forcSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot force sync while offline');
    }

    console.log('🔄 Force syncing all pending operations');
    await this.syncPendingOperations();
  }

  /**
   * Get network status
   */
  getNetworkStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Get pending operations count
   */
  getPendingOperationsCount(): number {
    return this.operationQueue.length;
  }

  /**
   * Clear all pending operations (use with caution)
   */
  async clearPendingOperations(): Promise<void> {
    this.operationQueue = [];
    await this.saveOperationQueue();
    await this.updateSyncStatus();
    console.log('🗑️ Cleared all pending operations');
  }

  /**
   * Cleanup expired cache and old operations
   */
  async cleanup(): Promise<void> {
    // Remove expired cache entries
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let removedCount = 0;
      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const cacheEntry: CacheEntry = JSON.parse(cached);
          if (Date.now() > cacheEntry.expiresAt) {
            await AsyncStorage.removeItem(key);
            removedCount++;
          }
        }
      }

      console.log(`🧹 Cleaned up ${removedCount} expired cache entries`);
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }

    // Remove old operations (older than 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const originalLength = this.operationQueue.length;
    
    this.operationQueue = this.operationQueue.filter(
      op => op.timestamp > sevenDaysAgo
    );

    if (this.operationQueue.length < originalLength) {
      await this.saveOperationQueue();
      console.log(`🧹 Removed ${originalLength - this.operationQueue.length} old operations`);
    }
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    this.stopSync();
  }
}

export const offlineStorageService = new OfflineStorageService();
export type { SyncStatus, QueuedOperation };