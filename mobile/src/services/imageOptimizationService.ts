/**
 * Image optimization service for performance enhancement
 * Handles image caching, compression, resizing, and lazy loading
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat, ImageResult } from 'expo-image-manipulator';

interface ImageCacheEntry {
  uri: string;
  localPath: string;
  timestamp: number;
  size: number;
  width: number;
  height: number;
  format: string;
}

interface ImageOptimizationOptions {
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: SaveFormat;
  compress?: boolean;
}

interface ImagePreloadOptions {
  priority?: 'low' | 'normal' | 'high';
  prefetch?: boolean;
  cache?: boolean;
}

class ImageOptimizationService {
  private readonly CACHE_KEY = 'image_cache';
  private readonly CACHE_DIRECTORY = `${FileSystem.cacheDirectory}images/`;
  private readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  private imageCache: Map<string, ImageCacheEntry> = new Map();
  private preloadQueue: Set<string> = new Set();
  private isInitialized = false;

  constructor() {
    this.initializeCache();
  }

  /**
   * Initialize image cache
   */
  private async initializeCache(): Promise<void> {
    try {
      // Create cache directory
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIRECTORY);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.CACHE_DIRECTORY, { intermediates: true });
      }

      // Load existing cache data
      const cacheData = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cacheData) {
        const entries: [string, ImageCacheEntry][] = JSON.parse(cacheData);
        this.imageCache = new Map(entries);
      }

      // Clean expired entries
      await this.cleanExpiredEntries();
      
      this.isInitialized = true;
      console.log('🖼️ Image optimization service initialized');
    } catch (error) {
      console.error('Failed to initialize image cache:', error);
    }
  }

  /**
   * Optimize image with compression and resizing
   */
  async optimizeImage(
    uri: string,
    options: ImageOptimizationOptions
  ): Promise<ImageResult> {
    try {
      const actions = [];
      
      // Add resize action if dimensions specified
      if (options.maxWidth || options.maxHeight) {
        actions.push({
          resize: {
            width: options.maxWidth,
            height: options.maxHeight,
          },
        });
      }

      const result = await manipulateAsync(
        uri,
        actions,
        {
          compress: options.quality,
          format: options.format || SaveFormat.JPEG,
          base64: false,
        }
      );

      console.log(`🖼️ Image optimized: ${uri} -> ${result.uri}`);
      return result;
    } catch (error) {
      console.error('Image optimization failed:', error);
      throw error;
    }
  }

  /**
   * Get cached image or download and cache if not exists
   */
  async getCachedImage(
    uri: string,
    options?: ImageOptimizationOptions
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initializeCache();
    }

    const cacheKey = this.generateCacheKey(uri, options);
    const cachedEntry = this.imageCache.get(cacheKey);

    // Return cached image if valid
    if (cachedEntry && await this.isCacheEntryValid(cachedEntry)) {
      console.log(`🎯 Cache hit: ${uri}`);
      return cachedEntry.localPath;
    }

    // Download and cache image
    return await this.downloadAndCacheImage(uri, options);
  }

  /**
   * Download image and store in cache
   */
  private async downloadAndCacheImage(
    uri: string,
    options?: ImageOptimizationOptions
  ): Promise<string> {
    try {
      const cacheKey = this.generateCacheKey(uri, options);
      const filename = `${cacheKey}.jpg`;
      const localPath = `${this.CACHE_DIRECTORY}${filename}`;

      // Download image
      console.log(`📥 Downloading image: ${uri}`);
      const downloadResult = await FileSystem.downloadAsync(uri, localPath);
      
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      let finalPath = localPath;

      // Optimize image if options provided
      if (options) {
        const optimized = await this.optimizeImage(localPath, options);
        finalPath = optimized.uri;
        
        // Remove original if different
        if (finalPath !== localPath) {
          await FileSystem.deleteAsync(localPath, { idempotent: true });
        }
      }

      // Get image dimensions and file info
      const fileInfo = await FileSystem.getInfoAsync(finalPath);
      const imageSize = await this.getImageDimensions(finalPath);

      // Store in cache
      const cacheEntry: ImageCacheEntry = {
        uri,
        localPath: finalPath,
        timestamp: Date.now(),
        size: fileInfo.size || 0,
        width: imageSize.width,
        height: imageSize.height,
        format: options?.format || SaveFormat.JPEG,
      };

      this.imageCache.set(cacheKey, cacheEntry);
      await this.saveCacheToStorage();
      
      console.log(`✅ Image cached: ${uri} -> ${finalPath}`);
      return finalPath;

    } catch (error) {
      console.error(`Failed to download and cache image: ${uri}`, error);
      // Return original URI as fallback
      return uri;
    }
  }

  /**
   * Preload images for better performance
   */
  async preloadImages(
    uris: string[],
    options?: ImageOptimizationOptions & ImagePreloadOptions
  ): Promise<void> {
    const { priority = 'normal', ...optimizationOptions } = options || {};
    
    // Filter out already cached/queued images
    const uncachedUris = uris.filter(uri => {
      const cacheKey = this.generateCacheKey(uri, optimizationOptions);
      return !this.imageCache.has(cacheKey) && !this.preloadQueue.has(uri);
    });

    if (uncachedUris.length === 0) {
      console.log('🎯 All images already cached');
      return;
    }

    console.log(`🚀 Preloading ${uncachedUris.length} images`);

    // Add to preload queue
    uncachedUris.forEach(uri => this.preloadQueue.add(uri));

    // Process preloads with priority
    const delay = priority === 'high' ? 0 : priority === 'normal' ? 100 : 500;
    
    for (const uri of uncachedUris) {
      try {
        await new Promise(resolve => setTimeout(resolve, delay));
        await this.getCachedImage(uri, optimizationOptions);
        this.preloadQueue.delete(uri);
      } catch (error) {
        console.error(`Failed to preload image: ${uri}`, error);
        this.preloadQueue.delete(uri);
      }
    }
  }

  /**
   * Get image dimensions
   */
  private async getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        () => resolve({ width: 0, height: 0 })
      );
    });
  }

  /**
   * Generate cache key for image
   */
  private generateCacheKey(uri: string, options?: ImageOptimizationOptions): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    const content = uri + optionsStr;
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if cache entry is valid
   */
  private async isCacheEntryValid(entry: ImageCacheEntry): Promise<boolean> {
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(entry.localPath);
    if (!fileInfo.exists) {
      return false;
    }

    // Check if entry is not expired
    const age = Date.now() - entry.timestamp;
    if (age > this.MAX_CACHE_AGE) {
      return false;
    }

    return true;
  }

  /**
   * Clean expired cache entries
   */
  private async cleanExpiredEntries(): Promise<void> {
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.imageCache.entries()) {
      const isValid = await this.isCacheEntryValid(entry);
      
      if (!isValid) {
        expiredKeys.push(key);
        
        // Delete file
        try {
          await FileSystem.deleteAsync(entry.localPath, { idempotent: true });
        } catch (error) {
          console.error(`Failed to delete cached file: ${entry.localPath}`, error);
        }
      }
    }

    // Remove from cache
    expiredKeys.forEach(key => this.imageCache.delete(key));
    
    if (expiredKeys.length > 0) {
      await this.saveCacheToStorage();
      console.log(`🗑️ Cleaned ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
    cacheHitRatio: number;
  } {
    const entries = Array.from(this.imageCache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const timestamps = entries.map(entry => entry.timestamp);
    
    return {
      totalEntries: entries.length,
      totalSize,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
      cacheHitRatio: 0, // Would need to track hits/misses to calculate
    };
  }

  /**
   * Clear entire cache
   */
  async clearCache(): Promise<void> {
    try {
      // Delete cache directory
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIRECTORY);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.CACHE_DIRECTORY, { idempotent: true });
        await FileSystem.makeDirectoryAsync(this.CACHE_DIRECTORY, { intermediates: true });
      }

      // Clear in-memory cache
      this.imageCache.clear();
      
      // Clear storage
      await AsyncStorage.removeItem(this.CACHE_KEY);
      
      console.log('🗑️ Image cache cleared');
    } catch (error) {
      console.error('Failed to clear image cache:', error);
    }
  }

  /**
   * Save cache data to storage
   */
  private async saveCacheToStorage(): Promise<void> {
    try {
      const cacheData = JSON.stringify(Array.from(this.imageCache.entries()));
      await AsyncStorage.setItem(this.CACHE_KEY, cacheData);
    } catch (error) {
      console.error('Failed to save cache to storage:', error);
    }
  }

  /**
   * Optimize cache size by removing oldest entries
   */
  private async optimizeCacheSize(): Promise<void> {
    const stats = this.getCacheStats();
    
    if (stats.totalSize > this.MAX_CACHE_SIZE) {
      console.log('🗑️ Cache size exceeded, cleaning up...');
      
      const entries = Array.from(this.imageCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      let currentSize = stats.totalSize;
      const targetSize = this.MAX_CACHE_SIZE * 0.8; // Target 80% of max size
      
      for (const [key, entry] of entries) {
        if (currentSize <= targetSize) break;
        
        try {
          await FileSystem.deleteAsync(entry.localPath, { idempotent: true });
          this.imageCache.delete(key);
          currentSize -= entry.size;
        } catch (error) {
          console.error(`Failed to delete cached file: ${entry.localPath}`, error);
        }
      }
      
      await this.saveCacheToStorage();
      console.log(`🗑️ Cache optimized: ${stats.totalSize} -> ${currentSize} bytes`);
    }
  }
}

export const imageOptimizationService = new ImageOptimizationService();
export type { ImageCacheEntry, ImageOptimizationOptions, ImagePreloadOptions };