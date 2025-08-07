/**
 * Offline context providing offline state and data synchronization
 * Manages network connectivity, cached data, and pending operations
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { offlineStorageService, SyncStatus } from '../services/offlineStorageService';

interface OfflineContextType {
  isOnline: boolean;
  syncStatus: SyncStatus | null;
  pendingOperationsCount: number;
  isFirstLoad: boolean;
  
  // Actions
  forceSync: () => Promise<void>;
  clearCache: () => Promise<void>;
  clearPendingOperations: () => Promise<void>;
  
  // Offline-aware API methods
  getData: <T>(endpoint: string, cacheKey: string, options?: {
    cacheTTL?: number;
    skipCache?: boolean;
  }) => Promise<T>;
  
  postData: <T>(endpoint: string, data: any, options?: {
    priority?: 'high' | 'medium' | 'low';
  }) => Promise<T>;
  
  putData: <T>(endpoint: string, data: any, options?: {
    priority?: 'high' | 'medium' | 'low';
  }) => Promise<T>;
  
  deleteData: <T>(endpoint: string, options?: {
    priority?: 'high' | 'medium' | 'low';
  }) => Promise<T>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [pendingOperationsCount, setPendingOperationsCount] = useState(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    // Initialize offline service and get initial status
    initializeOfflineService();

    // Set up app state handling for background/foreground sync
    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      appStateSubscription?.remove();
      offlineStorageService.dispose();
    };
  }, []);

  const initializeOfflineService = async () => {
    try {
      // Get initial sync status
      const status = await offlineStorageService.getSyncStatus();
      setSyncStatus(status);
      setIsOnline(status.isOnline);
      setPendingOperationsCount(status.pendingOperations);

      // Set up periodic status updates
      const statusInterval = setInterval(updateSyncStatus, 10000); // Every 10 seconds

      // Mark first load as complete
      setTimeout(() => setIsFirstLoad(false), 1000);

      return () => clearInterval(statusInterval);
    } catch (error) {
      console.error('Failed to initialize offline service:', error);
    }
  };

  const updateSyncStatus = async () => {
    try {
      const status = await offlineStorageService.getSyncStatus();
      setSyncStatus(status);
      setIsOnline(status.isOnline);
      setPendingOperationsCount(status.pendingOperations);
    } catch (error) {
      console.error('Failed to update sync status:', error);
    }
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground - update status and try sync
      await updateSyncStatus();
      
      if (offlineStorageService.getNetworkStatus()) {
        try {
          await offlineStorageService.forcSync();
        } catch (error) {
          console.log('Background sync failed:', error);
        }
      }
    } else if (nextAppState === 'background') {
      // App going to background - cleanup if needed
      await offlineStorageService.cleanup();
    }
  };

  const forceSync = async (): Promise<void> => {
    try {
      await offlineStorageService.forcSync();
      await updateSyncStatus();
    } catch (error) {
      console.error('Force sync failed:', error);
      throw error;
    }
  };

  const clearCache = async (): Promise<void> => {
    try {
      await offlineStorageService.clearAllCache();
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  };

  const clearPendingOperations = async (): Promise<void> => {
    try {
      await offlineStorageService.clearPendingOperations();
      await updateSyncStatus();
      console.log('Pending operations cleared');
    } catch (error) {
      console.error('Failed to clear pending operations:', error);
      throw error;
    }
  };

  const getData = async <T,>(
    endpoint: string,
    cacheKey: string,
    options: {
      cacheTTL?: number;
      skipCache?: boolean;
    } = {}
  ): Promise<T> => {
    try {
      const result = await offlineStorageService.request<T>(
        'GET',
        endpoint,
        undefined,
        {
          cacheKey,
          ...options,
        }
      );
      return result;
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
      throw error;
    }
  };

  const postData = async <T,>(
    endpoint: string,
    data: any,
    options: {
      priority?: 'high' | 'medium' | 'low';
    } = {}
  ): Promise<T> => {
    try {
      const result = await offlineStorageService.request<T>(
        'POST',
        endpoint,
        data,
        options
      );
      
      // Update status after successful operation
      setTimeout(updateSyncStatus, 100);
      
      return result;
    } catch (error) {
      // Update status to show queued operations
      setTimeout(updateSyncStatus, 100);
      throw error;
    }
  };

  const putData = async <T,>(
    endpoint: string,
    data: any,
    options: {
      priority?: 'high' | 'medium' | 'low';
    } = {}
  ): Promise<T> => {
    try {
      const result = await offlineStorageService.request<T>(
        'PUT',
        endpoint,
        data,
        options
      );
      
      setTimeout(updateSyncStatus, 100);
      return result;
    } catch (error) {
      setTimeout(updateSyncStatus, 100);
      throw error;
    }
  };

  const deleteData = async <T,>(
    endpoint: string,
    options: {
      priority?: 'high' | 'medium' | 'low';
    } = {}
  ): Promise<T> => {
    try {
      const result = await offlineStorageService.request<T>(
        'DELETE',
        endpoint,
        undefined,
        options
      );
      
      setTimeout(updateSyncStatus, 100);
      return result;
    } catch (error) {
      setTimeout(updateSyncStatus, 100);
      throw error;
    }
  };

  const value: OfflineContextType = {
    isOnline,
    syncStatus,
    pendingOperationsCount,
    isFirstLoad,
    forceSync,
    clearCache,
    clearPendingOperations,
    getData,
    postData,
    putData,
    deleteData,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOfflineContext(): OfflineContextType {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOfflineContext must be used within an OfflineProvider');
  }
  return context;
}

export type { SyncStatus };