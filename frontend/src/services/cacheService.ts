/**
 * Caching service for improving performance and reducing API calls.
 * Provides in-memory caching with expiration times.
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class CacheService {
  private cache: Map<string, CacheItem<any>> = new Map()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Set a value in cache
   */
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Remove a specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }

  /**
   * Clean up expired items
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Cache with automatic cleanup
   */
  setWithCleanup<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cleanup() // Clean up expired items first
    this.set(key, data, ttl)
  }
}

// Create a singleton instance
export const cacheService = new CacheService()

// Auto-cleanup every 10 minutes
setInterval(() => {
  cacheService.cleanup()
}, 10 * 60 * 1000) 