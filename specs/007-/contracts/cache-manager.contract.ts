/**
 * Cache Manager Contract
 *
 * Defines the interface for centralized cache lifecycle management.
 * Consolidates the three separate static Maps (asyncTaskCache, continuationSent, requestBodyCache)
 * into a single unified cache with TTL-based eviction.
 *
 * @purpose Fix memory leak from unbounded cache growth
 * @requirement FR-001, FR-002, FR-003 (Memory Management)
 */

import { CacheEntry, CacheStats } from '../../../src/types/cache.types';

export interface CacheManager {
  /**
   * Store cache entry for a task
   *
   * @param historyId - Unique task identifier (numeric or UUID)
   * @param entry - Cache entry data (without TTL fields)
   * @throws Error if entry already exists (prevents accidental overwrites)
   *
   * @example
   * ```typescript
   * cacheManager.set('4753456684812', {
   *   params: { prompt: '...', count: 6 },
   *   uploadedImages: [],
   *   apiParams: { ... },
   *   requestBody: { ... },
   *   continuationSent: false
   * });
   * ```
   */
  set(
    historyId: string,
    entry: Omit<CacheEntry, 'createdAt' | 'expiresAt' | 'state'>
  ): void;

  /**
   * Retrieve cache entry by ID
   *
   * @param historyId - Task identifier
   * @returns CacheEntry if found and not expired, undefined otherwise
   *
   * @behavior
   * - Auto-evicts expired entries (lazy eviction)
   * - Returns undefined for missing or expired entries
   * - Checks expiresAt on every access
   *
   * @example
   * ```typescript
   * const entry = cacheManager.get('4753456684812');
   * if (entry) {
   *   // Entry exists and not expired
   *   console.log(entry.requestBody.submitId);
   * } else {
   *   // Entry missing or expired
   * }
   * ```
   */
  get(historyId: string): CacheEntry | undefined;

  /**
   * Remove cache entry and all related state
   *
   * Atomically removes entry from cache, cleaning up:
   * - Task parameters (params, apiParams)
   * - Uploaded image metadata (uploadedImages)
   * - Request body cache (requestBody)
   * - Continuation sent flag (continuationSent)
   *
   * @param historyId - Task identifier to clean up
   * @returns true if entry was found and cleaned, false if not found
   *
   * @usage Call this when:
   * - Task completes successfully
   * - Task fails
   * - User cancels task (future enhancement)
   *
   * @example
   * ```typescript
   * async waitForCompletion(historyId: string) {
   *   // ... polling logic ...
   *   if (status === 'completed' || status === 'failed') {
   *     cacheManager.cleanup(historyId); // ← Prevents memory leak
   *   }
   * }
   * ```
   */
  cleanup(historyId: string): boolean;

  /**
   * Evict all expired entries based on TTL
   *
   * Scans entire cache and removes entries where:
   * Date.now() > entry.expiresAt
   *
   * @returns Count of evicted entries
   *
   * @usage
   * - Manual invocation for testing
   * - Periodic sweep (e.g., every 5 minutes via setInterval)
   * - On-demand cleanup when cache size exceeds threshold
   *
   * @performance O(n) where n = cache size
   * - With 10K entries: ~5-10ms
   * - Acceptable for periodic background sweep
   *
   * @example
   * ```typescript
   * // Periodic cleanup (long-running MCP server)
   * setInterval(() => {
   *   const evicted = cacheManager.evictExpired();
   *   logger.debug(`Evicted ${evicted} expired entries`);
   * }, 5 * 60 * 1000); // Every 5 minutes
   * ```
   */
  evictExpired(): number;

  /**
   * Get current cache size (for monitoring)
   *
   * @returns Number of entries currently in cache
   *
   * @usage
   * - Health check endpoints
   * - Metrics/monitoring dashboards
   * - Debug logging
   *
   * @example
   * ```typescript
   * app.get('/health', (req, res) => {
   *   res.json({
   *     cacheSize: cacheManager.size(),
   *     uptime: process.uptime()
   *   });
   * });
   * ```
   */
  size(): number;

  /**
   * Get cache statistics for monitoring
   *
   * @returns CacheStats object with size, oldest entry, expired count
   *
   * @usage Advanced monitoring and debugging
   *
   * @example
   * ```typescript
   * const stats = cacheManager.getStats();
   * logger.info('Cache stats', {
   *   size: stats.size,
   *   oldestEntryAge: Date.now() - (stats.oldestEntry || 0),
   *   expiredCount: stats.expiredCount
   * });
   * ```
   */
  getStats(): CacheStats;
}

/**
 * Default TTL Configuration
 */
export const CACHE_CONFIG = {
  /**
   * Time-to-live for cache entries (milliseconds)
   * Default: 30 minutes
   *
   * Rationale:
   * - Typical image generation: <2 minutes
   * - Grace period for slow generations: 10-15 minutes
   * - Cleanup abandoned tasks: 30 minutes max
   */
  TTL_MS: 30 * 60 * 1000, // 30 minutes

  /**
   * Eviction sweep interval (milliseconds)
   * Default: 5 minutes
   *
   * Trade-off:
   * - Shorter interval: More CPU, faster cleanup
   * - Longer interval: Less CPU, slower cleanup
   */
  EVICTION_INTERVAL_MS: 5 * 60 * 1000 // 5 minutes
};

/**
 * Usage Example (Integration with NewJimengClient)
 *
 * Before (memory leak):
 * ```typescript
 * class NewJimengClient {
 *   private static asyncTaskCache = new Map(); // ← Never cleaned
 *   private static continuationSent = new Map(); // ← Never cleaned
 *   private static requestBodyCache = new Map(); // ← Never cleaned
 * }
 * ```
 *
 * After (fixed):
 * ```typescript
 * import { cacheManager } from './utils/cache-manager';
 *
 * class NewJimengClient {
 *   async generateImage(params) {
 *     const historyId = await this.submitImageTask(apiParams);
 *
 *     // Cache for continuation
 *     cacheManager.set(historyId, {
 *       params,
 *       uploadedImages,
 *       apiParams,
 *       requestBody: { ... },
 *       continuationSent: false
 *     });
 *
 *     const images = await this.waitForCompletion(historyId);
 *
 *     // ✅ Cleanup on completion (prevents leak)
 *     cacheManager.cleanup(historyId);
 *
 *     return images;
 *   }
 * }
 * ```
 */
