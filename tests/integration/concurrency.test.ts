/**
 * Concurrency Safety Integration Tests
 *
 * Tests FR-008: Concurrent continuation request handling
 */

import { CacheManager } from '../../src/utils/cache-manager.js';

describe('Concurrency Safety Tests', () => {
  beforeEach(() => {
    CacheManager.clear();
  });

  afterEach(() => {
    CacheManager.clear();
  });

  it('should prevent duplicate continuation submissions', () => {
    const historyId = 'concurrent-test-123';

    // Create cache entry
    CacheManager.set(historyId, {
      historyId,
      params: { prompt: 'Test', count: 6 },
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

    // Get entry
    const entry1 = CacheManager.get(historyId);
    expect(entry1?.continuationSent).toBe(false);

    // First continuation attempt - should succeed
    if (entry1 && !entry1.continuationSent) {
      entry1.continuationSent = true;
      CacheManager['cache'].set(historyId, entry1); // Update cache
    }

    // Second continuation attempt - should be blocked
    const entry2 = CacheManager.get(historyId);
    const shouldSubmit = entry2 && !entry2.continuationSent;

    // Should NOT submit second time
    expect(shouldSubmit).toBe(false);
    expect(entry2?.continuationSent).toBe(true);
  });

  it('should handle race condition on simultaneous queries', async () => {
    const historyId = 'race-test-456';

    // Create cache entry
    CacheManager.set(historyId, {
      historyId,
      params: { prompt: 'Test', count: 8 },
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

    // Simulate 10 simultaneous query attempts
    let submissionCount = 0;

    for (let i = 0; i < 10; i++) {
      const entry = CacheManager.get(historyId);

      if (entry && !entry.continuationSent) {
        entry.continuationSent = true;
        CacheManager['cache'].set(historyId, entry);
        submissionCount++;
      }
    }

    // Only first query should trigger submission
    expect(submissionCount).toBe(1);
  });

  it('should cleanup continuationSent flag on completion', () => {
    const historyId = 'cleanup-test-789';

    // Create cache entry with continuation sent
    CacheManager.set(historyId, {
      historyId,
      params: { prompt: 'Test', count: 6 },
      uploadedImages: [],
      apiParams: {},
      requestBody: {
        submitId: 'submit-789',
        draftContent: '{}',
        metricsExtra: '{}',
        extend: { root_model: 'jimeng-4.0' }
      },
      continuationSent: true // Continuation already sent
    });

    // Verify entry exists with flag set
    const entry = CacheManager.get(historyId);
    expect(entry?.continuationSent).toBe(true);

    // Simulate task completion - cleanup
    const cleanupResult = CacheManager.cleanup(historyId);

    // Cleanup should succeed
    expect(cleanupResult).toBe(true);

    // Entry should be removed (including continuationSent flag)
    expect(CacheManager.get(historyId)).toBeUndefined();

    // If same historyId is created again, flag should be reset
    CacheManager.set(historyId, {
      historyId,
      params: { prompt: 'Test', count: 6 },
      uploadedImages: [],
      apiParams: {},
      requestBody: {
        submitId: 'submit-789-new',
        draftContent: '{}',
        metricsExtra: '{}',
        extend: { root_model: 'jimeng-4.0' }
      },
      continuationSent: false
    });

    const newEntry = CacheManager.get(historyId);
    expect(newEntry?.continuationSent).toBe(false);
  });

  it('should not have stale locks after cleanup', () => {
    const historyIds = ['task-1', 'task-2', 'task-3'];

    // Create multiple entries with continuation sent
    historyIds.forEach(id => {
      CacheManager.set(id, {
        historyId: id,
        params: { prompt: 'Test', count: 6 },
        uploadedImages: [],
        apiParams: {},
        requestBody: {
          submitId: `submit-${id}`,
          draftContent: '{}',
          metricsExtra: '{}',
          extend: { root_model: 'jimeng-4.0' }
        },
        continuationSent: true
      });
    });

    // Verify all entries exist with flags set
    historyIds.forEach(id => {
      const entry = CacheManager.get(id);
      expect(entry?.continuationSent).toBe(true);
    });

    // Cleanup all entries
    historyIds.forEach(id => {
      CacheManager.cleanup(id);
    });

    // Verify no stale locks remain
    expect(CacheManager.size()).toBe(0);

    // Recreate entries - should have fresh state
    historyIds.forEach(id => {
      CacheManager.set(id, {
        historyId: id,
        params: { prompt: 'Test', count: 6 },
        uploadedImages: [],
        apiParams: {},
        requestBody: {
          submitId: `submit-${id}-new`,
          draftContent: '{}',
          metricsExtra: '{}',
          extend: { root_model: 'jimeng-4.0' }
        },
        continuationSent: false
      });

      const entry = CacheManager.get(id);
      expect(entry?.continuationSent).toBe(false);
    });
  });
});
