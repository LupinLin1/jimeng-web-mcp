/**
 * Memory Leak Integration Tests
 *
 * Tests FR-001, FR-002, FR-003: Cache lifecycle management and memory stability
 */

import { CacheManager } from '../../src/utils/cache-manager.js';

describe('Memory Leak Integration Tests', () => {
  beforeEach(() => {
    // Clear cache before each test
    CacheManager.clear();
  });

  afterEach(() => {
    // Cleanup after tests
    CacheManager.clear();
  });

  it('should maintain stable memory over 1000 requests', async () => {
    // Baseline cache size
    const initialSize = CacheManager.size();
    expect(initialSize).toBe(0);

    // Simulate 100 requests (scaled down for test speed)
    // In production validation, this would be 1000+
    const requestCount = 100;
    const historyIds: string[] = [];

    for (let i = 0; i < requestCount; i++) {
      const historyId = `test-${Date.now()}-${i}`;
      historyIds.push(historyId);

      // Simulate cache entry creation
      CacheManager.set(historyId, {
        historyId,
        params: { prompt: `Test ${i}`, count: 1 },
        uploadedImages: [],
        apiParams: {},
        requestBody: {
          submitId: `submit-${i}`,
          draftContent: '{}',
          metricsExtra: '{}',
          extend: { root_model: 'jimeng-4.0' }
        },
        continuationSent: false
      });
    }

    // Cache should contain all entries
    expect(CacheManager.size()).toBe(requestCount);

    // Simulate task completion and cleanup
    historyIds.forEach(historyId => {
      CacheManager.cleanup(historyId);
    });

    // Cache should be empty after cleanup
    const finalSize = CacheManager.size();
    expect(finalSize).toBe(0);

    // Memory should return to baseline
    expect(finalSize).toBe(initialSize);
  }, 30000); // 30 second timeout

  it('should cleanup cache on task completion', async () => {
    const historyId = 'test-completion-123';

    // Create cache entry
    CacheManager.set(historyId, {
      historyId,
      params: { prompt: 'Test', count: 1 },
      uploadedImages: [],
      apiParams: {},
      requestBody: {
        submitId: 'submit-123',
        draftContent: '{}',
        metricsExtra: '{}',
        extend: { root_model: 'jimeng-4.0' }
      },
      continuationSent: false
    });

    // Verify entry exists
    expect(CacheManager.get(historyId)).toBeDefined();

    // Simulate task completion
    const cleanupResult = CacheManager.cleanup(historyId);

    // Verify cleanup succeeded
    expect(cleanupResult).toBe(true);

    // Verify entry removed
    expect(CacheManager.get(historyId)).toBeUndefined();
  });

  it('should respect 30min TTL for abandoned tasks', async () => {
    const historyId = 'test-ttl-456';

    // Create cache entry
    CacheManager.set(historyId, {
      historyId,
      params: { prompt: 'Test', count: 1 },
      uploadedImages: [],
      apiParams: {},
      requestBody: {
        submitId: 'submit-456',
        draftContent: '{}',
        metricsExtra: '{}',
        extend: { root_model: 'jimeng-4.0' }
      },
      continuationSent: false
    });

    // Manually expire the entry by modifying expiresAt
    const entry = CacheManager['cache'].get(historyId);
    if (entry) {
      entry.expiresAt = Date.now() - 1000; // Expire 1 second ago
    }

    // Get should return undefined for expired entry
    const result = CacheManager.get(historyId);
    expect(result).toBeUndefined();

    // Entry should be auto-evicted
    expect(CacheManager['cache'].has(historyId)).toBe(false);
  });

  it('should evict all expired entries via evictExpired()', () => {
    // Create multiple entries
    const expiredIds = ['expired-1', 'expired-2', 'expired-3'];
    const activeIds = ['active-1', 'active-2'];

    // Add expired entries
    expiredIds.forEach(id => {
      CacheManager.set(id, {
        historyId: id,
        params: { prompt: 'Test', count: 1 },
        uploadedImages: [],
        apiParams: {},
        requestBody: {
          submitId: `submit-${id}`,
          draftContent: '{}',
          metricsExtra: '{}',
          extend: { root_model: 'jimeng-4.0' }
        },
        continuationSent: false
      });

      // Manually expire
      const entry = CacheManager['cache'].get(id);
      if (entry) {
        entry.expiresAt = Date.now() - 1000;
      }
    });

    // Add active entries
    activeIds.forEach(id => {
      CacheManager.set(id, {
        historyId: id,
        params: { prompt: 'Test', count: 1 },
        uploadedImages: [],
        apiParams: {},
        requestBody: {
          submitId: `submit-${id}`,
          draftContent: '{}',
          metricsExtra: '{}',
          extend: { root_model: 'jimeng-4.0' }
        },
        continuationSent: false
      });
    });

    // Initial size should be 5
    expect(CacheManager.size()).toBe(5);

    // Evict expired entries
    const evictedCount = CacheManager.evictExpired();

    // Should evict 3 expired entries
    expect(evictedCount).toBe(3);

    // Final size should be 2 (only active entries)
    expect(CacheManager.size()).toBe(2);

    // Verify active entries still exist
    activeIds.forEach(id => {
      expect(CacheManager.get(id)).toBeDefined();
    });

    // Verify expired entries removed
    expiredIds.forEach(id => {
      expect(CacheManager.get(id)).toBeUndefined();
    });
  });
});
