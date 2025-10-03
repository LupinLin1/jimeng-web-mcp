/**
 * Cache Manager Implementation
 *
 * Unified cache system that replaces three static Maps:
 * - asyncTaskCache
 * - continuationSent
 * - requestBodyCache
 *
 * Implements TTL-based eviction and explicit cleanup.
 */

import { CacheEntry, CacheStats, CacheEntryState } from '../types/cache.types.js';
import { CACHE_CONFIG } from '../types/constants.js';

export class CacheManager {
  private static cache: Map<string, CacheEntry> = new Map();
  private static evictionTimer?: NodeJS.Timeout;
  private static initialized = false;

  /**
   * Initialize periodic eviction (called once)
   */
  private static initialize(): void {
    if (!this.initialized) {
      this.startPeriodicEviction();
      this.initialized = true;
    }
  }

  /**
   * Store cache entry
   */
  static set(historyId: string, entry: Omit<CacheEntry, 'createdAt' | 'expiresAt' | 'state'>): void {
    this.initialize();

    const now = Date.now();
    const fullEntry: CacheEntry = {
      ...entry,
      createdAt: now,
      expiresAt: now + CACHE_CONFIG.TTL_MS,
      state: CacheEntryState.CREATED
    };

    this.cache.set(historyId, fullEntry);
  }

  /**
   * Retrieve cache entry
   */
  static get(historyId: string): CacheEntry | undefined {
    const entry = this.cache.get(historyId);

    // Check if expired
    if (entry && Date.now() > entry.expiresAt) {
      this.cache.delete(historyId);
      return undefined;
    }

    return entry;
  }

  /**
   * Check if entry exists
   */
  static has(historyId: string): boolean {
    return this.get(historyId) !== undefined;
  }

  /**
   * Remove specific entry (cleanup)
   */
  static cleanup(historyId: string): boolean {
    return this.cache.delete(historyId);
  }

  /**
   * Get cache size
   */
  static size(): number {
    return this.cache.size;
  }

  /**
   * Remove expired entries (TTL eviction)
   */
  static evictExpired(): number {
    const now = Date.now();
    let evictedCount = 0;

    for (const [historyId, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(historyId);
        evictedCount++;
      }
    }

    return evictedCount;
  }

  /**
   * Get cache statistics
   */
  static getStats(): CacheStats {
    const stats: CacheStats = {
      size: this.cache.size,
      byState: {
        created: 0,
        active: 0,
        completed: 0
      },
      expired: 0,
      memoryEstimateKB: 0
    };

    const now = Date.now();

    for (const entry of this.cache.values()) {
      // Count by state
      switch (entry.state) {
        case CacheEntryState.CREATED:
          stats.byState.created++;
          break;
        case CacheEntryState.ACTIVE:
          stats.byState.active++;
          break;
        case CacheEntryState.COMPLETED:
          stats.byState.completed++;
          break;
      }

      // Count expired
      if (now > entry.expiresAt) {
        stats.expired++;
      }

      // Estimate memory (rough calculation)
      stats.memoryEstimateKB += this.estimateEntrySize(entry) / 1024;
    }

    return stats;
  }

  /**
   * Clear all entries (testing only)
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Start periodic eviction timer
   */
  private static startPeriodicEviction(): void {
    this.evictionTimer = setInterval(() => {
      this.evictExpired();
    }, CACHE_CONFIG.EVICTION_INTERVAL_MS);

    // Don't block Node.js exit
    if (this.evictionTimer.unref) {
      this.evictionTimer.unref();
    }
  }

  /**
   * Stop periodic eviction (cleanup)
   */
  static stopPeriodicEviction(): void {
    if (this.evictionTimer) {
      clearInterval(this.evictionTimer);
      this.evictionTimer = undefined;
      this.initialized = false;
    }
  }

  /**
   * Estimate entry size in bytes
   */
  private static estimateEntrySize(entry: CacheEntry): number {
    // Rough estimation: JSON stringify size
    try {
      return JSON.stringify(entry).length;
    } catch {
      return 1024; // Default 1KB if serialization fails
    }
  }
}

// Note: CacheManager is now a static class, no instance needed
