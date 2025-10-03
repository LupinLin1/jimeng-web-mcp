/**
 * Cache Type Definitions
 *
 * Defines types for the unified cache system that replaces
 * the three static Maps (asyncTaskCache, continuationSent, requestBodyCache).
 */

import type { ImageGenerationParams } from './api.types.js';

/**
 * Cache entry lifecycle states
 */
export enum CacheEntryState {
  CREATED = 'CREATED',     // Entry created, task submitted
  ACTIVE = 'ACTIVE',       // Task in progress, being queried
  COMPLETED = 'COMPLETED'  // Task finished, ready for cleanup
}

/**
 * Unified cache entry
 *
 * Combines data from all three legacy Maps into a single structure
 * with TTL-based expiration.
 */
export interface CacheEntry {
  /** Task history ID (primary key) */
  historyId: string;

  /** Original image generation parameters */
  params: ImageGenerationParams;

  /** Uploaded image references */
  uploadedImages: any[];

  /** Processed API parameters */
  apiParams: any;

  /** Request body for continuation generation */
  requestBody: {
    submitId: string;
    draftContent: string;
    metricsExtra: string;
    extend: { root_model: string };
  };

  /** Flag to prevent duplicate continuation submissions */
  continuationSent: boolean;

  /** Creation timestamp (milliseconds since epoch) */
  createdAt: number;

  /** Expiration timestamp (createdAt + TTL_MS) */
  expiresAt: number;

  /** Current lifecycle state */
  state: CacheEntryState;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of entries */
  size: number;

  /** Entries by state */
  byState: {
    created: number;
    active: number;
    completed: number;
  };

  /** Number of expired entries */
  expired: number;

  /** Memory usage estimate (KB) */
  memoryEstimateKB: number;
}

/**
 * Cache manager interface
 */
export interface CacheManager {
  /**
   * Store cache entry
   */
  set(historyId: string, entry: CacheEntry): void;

  /**
   * Retrieve cache entry
   */
  get(historyId: string): CacheEntry | undefined;

  /**
   * Check if entry exists
   */
  has(historyId: string): boolean;

  /**
   * Remove specific entry (cleanup)
   */
  delete(historyId: string): boolean;

  /**
   * Remove expired entries (TTL eviction)
   * @returns Number of entries evicted
   */
  evictExpired(): number;

  /**
   * Get cache statistics
   */
  getStats(): CacheStats;

  /**
   * Clear all entries (testing only)
   */
  clear(): void;
}
