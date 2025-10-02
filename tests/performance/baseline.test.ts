/**
 * Performance Baseline Test
 *
 * Purpose: Establish performance baseline before Phase 2 refactoring
 * Run this before and after refactoring to ensure no regression
 *
 * Metrics:
 * - Image generation latency
 * - Video generation latency
 * - Memory usage
 * - Module load time
 */

import { performance } from 'perf_hooks';
import { describe, test, expect } from '@jest/globals';

describe('Performance Baseline - Pre-Refactoring', () => {
  const results: Record<string, number> = {};

  test('Module load time', () => {
    const start = performance.now();

    // Measure time to import main modules
    require('../../src/api.js');

    const loadTime = performance.now() - start;
    results.moduleLoadTime = loadTime;

    console.log(`📊 Module load time: ${loadTime.toFixed(2)}ms`);

    // Baseline expectation: should load in < 500ms
    expect(loadTime).toBeLessThan(500);
  });

  test('Memory usage baseline', () => {
    const memBefore = process.memoryUsage();

    // Load all modules
    require('../../src/api.js');
    require('../../src/server.js');

    const memAfter = process.memoryUsage();
    const heapUsed = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

    results.memoryUsageMB = heapUsed;

    console.log(`📊 Memory used: ${heapUsed.toFixed(2)}MB`);

    // Baseline expectation: should use < 50MB
    expect(heapUsed).toBeLessThan(50);
  });

  test('File count and LOC baseline', () => {
    const { execSync } = require('child_process');

    // Count TypeScript files
    const fileCount = execSync('find src -name "*.ts" | wc -l').toString().trim();

    // Count total lines of code
    const loc = execSync('wc -l src/**/*.ts | tail -1').toString().trim().split(/\s+/)[0];

    results.fileCount = parseInt(fileCount);
    results.totalLOC = parseInt(loc);

    console.log(`📊 File count: ${fileCount}`);
    console.log(`📊 Total LOC: ${loc}`);

    // Baseline: expect ~45 files, ~7800 lines
    expect(results.fileCount).toBeGreaterThan(40);
    expect(results.totalLOC).toBeGreaterThan(7000);
  });

  afterAll(() => {
    // Save baseline results to file for comparison
    const fs = require('fs');
    const baselinePath = 'tests/performance/baseline-results.json';

    fs.writeFileSync(baselinePath, JSON.stringify({
      timestamp: new Date().toISOString(),
      phase: 'pre-refactoring',
      results
    }, null, 2));

    console.log(`\n✅ Baseline results saved to ${baselinePath}`);
    console.log(JSON.stringify(results, null, 2));
  });
});
