/**
 * Cache Manager Test Suite
 *
 * TDD Red Phase: These tests MUST FAIL initially
 * Expected to pass after implementing src/utils/cache-manager.ts (T010)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { CacheManager } from '../../src/utils/cache-manager.js';
import { CacheEntryState } from '../../src/types/cache.types.js';
import { CACHE_CONFIG } from '../../src/types/constants.js';

describe('CacheManager', () => {
  beforeEach(() => {
    CacheManager.clear(); // Ensure clean state
  });

  describe('Basic Operations', () => {
    it('should store and retrieve cache entries', () => {
      const entry = {
        historyId: 'test-123',
        params: { prompt: 'test', count: 6 } as any,
        uploadedImages: [],
        apiParams: {},
        requestBody: {
          submitId: 'submit-123',
          draftContent: 'draft',
          metricsExtra: 'metrics',
          extend: { root_model: 'jimeng-4.0' }
        },
        continuationSent: false
      };

      CacheManager.set('test-123', entry);
      const retrieved = CacheManager.get('test-123');

      expect(retrieved).toBeDefined();
      expect(retrieved?.historyId).toBe('test-123');
      expect(retrieved?.params.count).toBe(6);
    });

    it('should return undefined for non-existent entries', () => {
      const result = CacheManager.get('non-existent');
      expect(result).toBeUndefined();
    });

    it('should check entry existence with has()', () => {
      const entry = {
        historyId: 'test-456',
        params: { prompt: 'test', count: 6 } as any,
        uploadedImages: [],
        apiParams: {},
        requestBody: {
          submitId: 'submit-456',
          draftContent: 'draft',
          metricsExtra: 'metrics',
          extend: { root_model: 'jimeng-4.0' }
        },
        continuationSent: false
      };

      expect(CacheManager.has('test-456')).toBe(false);
      CacheManager.set('test-456', entry);
      expect(CacheManager.has('test-456')).toBe(true);
    });

    it('should delete entries via cleanup()', () => {
      const entry = {
        historyId: 'test-789',
        params: { prompt: 'test', count: 6 } as any,
        uploadedImages: [],
        apiParams: {},
        requestBody: {
          submitId: 'submit-789',
          draftContent: 'draft',
          metricsExtra: 'metrics',
          extend: { root_model: 'jimeng-4.0' }
        },
        continuationSent: false
      };

      CacheManager.set('test-789', entry);
      expect(CacheManager.has('test-789')).toBe(true);

      const deleted = CacheManager.cleanup('test-789');
      expect(deleted).toBe(true);
      expect(CacheManager.has('test-789')).toBe(false);
    });
  });

  describe('TTL Eviction', () => {
    it('should evict expired entries', () => {
      // Create entries directly via internal cache (for testing TTL)
      const expiredEntry = {
        historyId: 'expired-123',
        params: { prompt: 'test', count: 6 } as any,
        uploadedImages: [],
        apiParams: {},
        requestBody: {
          submitId: 'submit-expired',
          draftContent: 'draft',
          metricsExtra: 'metrics',
          extend: { root_model: 'jimeng-4.0' }
        },
        continuationSent: false
      };

      const activeEntry = {
        historyId: 'active-456',
        params: { prompt: 'test', count: 6 } as any,
        uploadedImages: [],
        apiParams: {},
        requestBody: {
          submitId: 'submit-active',
          draftContent: 'draft',
          metricsExtra: 'metrics',
          extend: { root_model: 'jimeng-4.0' }
        },
        continuationSent: false
      };

      CacheManager.set('expired-123', expiredEntry);
      CacheManager.set('active-456', activeEntry);

      // Manually expire the first entry
      const cached = CacheManager['cache'].get('expired-123');
      if (cached) {
        cached.expiresAt = Date.now() - 1000; // Expired 1s ago
      }

      const evictedCount = CacheManager.evictExpired();

      expect(evictedCount).toBe(1);
      expect(CacheManager.has('expired-123')).toBe(false);
      expect(CacheManager.has('active-456')).toBe(true);
    });

    it('should not evict non-expired entries', () => {
      const entry = {
        historyId: 'fresh-123',
        params: { prompt: 'test', count: 6 } as any,
        uploadedImages: [],
        apiParams: {},
        requestBody: {
          submitId: 'submit-fresh',
          draftContent: 'draft',
          metricsExtra: 'metrics',
          extend: { root_model: 'jimeng-4.0' }
        },
        continuationSent: false
      };

      CacheManager.set('fresh-123', entry);
      const evictedCount = CacheManager.evictExpired();

      expect(evictedCount).toBe(0);
      expect(CacheManager.has('fresh-123')).toBe(true);
    });
  });

  describe('Cache Statistics', () => {
    it('should return accurate cache statistics', () => {
      const entry1 = {
        historyId: 'stat-1',
        params: { prompt: 'test', count: 6 } as any,
        uploadedImages: [],
        apiParams: {},
        requestBody: {
          submitId: 'submit-1',
          draftContent: 'draft',
          metricsExtra: 'metrics',
          extend: { root_model: 'jimeng-4.0' }
        },
        continuationSent: false
      };

      const entry2 = {
        historyId: 'stat-2',
        params: { prompt: 'test', count: 6 } as any,
        uploadedImages: [],
        apiParams: {},
        requestBody: {
          submitId: 'submit-2',
          draftContent: 'draft',
          metricsExtra: 'metrics',
          extend: { root_model: 'jimeng-4.0' }
        },
        continuationSent: false
      };

      const entry3 = {
        historyId: 'stat-3',
        params: { prompt: 'test', count: 6 } as any,
        uploadedImages: [],
        apiParams: {},
        requestBody: {
          submitId: 'submit-3',
          draftContent: 'draft',
          metricsExtra: 'metrics',
          extend: { root_model: 'jimeng-4.0' }
        },
        continuationSent: true
      };

      CacheManager.set('stat-1', entry1);
      CacheManager.set('stat-2', entry2);
      CacheManager.set('stat-3', entry3);

      // Update states manually for testing
      const cached1 = CacheManager['cache'].get('stat-1');
      const cached2 = CacheManager['cache'].get('stat-2');
      const cached3 = CacheManager['cache'].get('stat-3');

      if (cached1) cached1.state = CacheEntryState.CREATED;
      if (cached2) cached2.state = CacheEntryState.ACTIVE;
      if (cached3) cached3.state = CacheEntryState.COMPLETED;

      const stats = CacheManager.getStats();

      expect(stats.size).toBe(3);
      expect(stats.byState.created).toBe(1);
      expect(stats.byState.active).toBe(1);
      expect(stats.byState.completed).toBe(1);
      expect(stats.memoryEstimateKB).toBeGreaterThan(0);
    });
  });

  describe('Clear Operation', () => {
    it('should clear all entries', () => {
      const entry = {
        historyId: 'clear-test',
        params: { prompt: 'test', count: 6 } as any,
        uploadedImages: [],
        apiParams: {},
        requestBody: {
          submitId: 'submit-clear',
          draftContent: 'draft',
          metricsExtra: 'metrics',
          extend: { root_model: 'jimeng-4.0' }
        },
        continuationSent: false
      };

      CacheManager.set('clear-test', entry);
      expect(CacheManager.getStats().size).toBe(1);

      CacheManager.clear();
      expect(CacheManager.getStats().size).toBe(0);
    });
  });
});
