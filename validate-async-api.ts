#!/usr/bin/env node
/**
 * Async API Validation Script
 *
 * 验证 quickstart.md 中的 5 个场景
 * 运行方式: JIMENG_API_TOKEN=your_token npx tsx validate-async-api.ts
 */

import { generateImageAsync, getImageResult } from './src/api.js';

// 颜色输出
const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
};

// 验证结果追踪
const results = {
  passed: 0,
  failed: 0,
  scenarios: [] as Array<{name: string, success: boolean, details: string}>
};

function log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const prefix = {
    info: colors.blue('ℹ'),
    success: colors.green('✓'),
    error: colors.red('✗'),
    warning: colors.yellow('⚠')
  }[type];
  console.log(`${prefix} ${message}`);
}

function recordResult(scenario: string, success: boolean, details: string) {
  results.scenarios.push({ name: scenario, success, details });
  if (success) {
    results.passed++;
    log(`${scenario}: PASSED - ${details}`, 'success');
  } else {
    results.failed++;
    log(`${scenario}: FAILED - ${details}`, 'error');
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== Scenario 1: Basic Image Query Workflow ==========
async function scenario1() {
  log('Running Scenario 1: Basic Image Query Workflow', 'info');

  try {
    // Step 1: Submit async generation
    const historyId = await generateImageAsync({
      prompt: '美丽的山水风景画',
      refresh_token: process.env.JIMENG_API_TOKEN!,
      model: 'jimeng-4.0'
    });

    log(`Generation submitted: ${historyId}`, 'info');

    // Verify historyId format (JiMeng returns numeric strings like "4721606420748")
    if (!/^[0-9]+$/.test(historyId) && !/^h[a-zA-Z0-9]+$/.test(historyId)) {
      recordResult('Scenario 1', false, `Invalid historyId format: ${historyId}`);
      return;
    }

    // Step 2: Poll for status
    let result;
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      result = await getImageResult(historyId);
      log(`Status: ${result.status}, Progress: ${result.progress}%`, 'info');

      if (result.status === 'completed') {
        log('Generation completed!', 'success');
        break;
      }

      if (result.status === 'failed') {
        recordResult('Scenario 1', false, `Generation failed: ${result.error}`);
        return;
      }

      await sleep(5000);
      attempts++;
    }

    // Step 3: Verify results
    if (result!.status === 'completed') {
      const validations = [
        { check: result!.imageUrls && result!.imageUrls.length > 0, msg: 'Has image URLs' },
        { check: result!.progress === 100, msg: 'Progress is 100%' },
        { check: result!.imageUrls!.every(url => url.startsWith('https://')), msg: 'All URLs are HTTPS' }
      ];

      const allPassed = validations.every(v => v.check);
      const details = validations.map(v => v.msg).join(', ');
      recordResult('Scenario 1', allPassed, details);
    } else {
      recordResult('Scenario 1', false, 'Generation timed out');
    }

  } catch (error: any) {
    recordResult('Scenario 1', false, `Exception: ${error.message}`);
  }
}

// ========== Scenario 2: Error Handling - Invalid historyId ==========
async function scenario2() {
  log('Running Scenario 2: Error Handling - Invalid historyId', 'info');

  try {
    // Test invalid format
    try {
      await getImageResult('invalid_format');
      recordResult('Scenario 2', false, 'Should have rejected invalid format');
      return;
    } catch (error: any) {
      if (!error.message.includes('无效的historyId格式')) {
        recordResult('Scenario 2', false, `Wrong error message: ${error.message}`);
        return;
      }
      log('Invalid format correctly rejected', 'success');
    }

    recordResult('Scenario 2', true, 'Invalid historyId format correctly rejected');

  } catch (error: any) {
    recordResult('Scenario 2', false, `Unexpected exception: ${error.message}`);
  }
}

// ========== Scenario 3: Missing Token ==========
async function scenario3() {
  log('Running Scenario 3: Missing Token Error', 'info');

  try {
    const originalToken = process.env.JIMENG_API_TOKEN;
    delete process.env.JIMENG_API_TOKEN;

    try {
      await getImageResult('h123');
      recordResult('Scenario 3', false, 'Should have thrown missing token error');
      return;
    } catch (error: any) {
      if (!error.message.includes('JIMENG_API_TOKEN')) {
        recordResult('Scenario 3', false, `Wrong error message: ${error.message}`);
        return;
      }
      log('Missing token correctly detected', 'success');
    } finally {
      process.env.JIMENG_API_TOKEN = originalToken;
    }

    recordResult('Scenario 3', true, 'Missing token error correctly thrown');

  } catch (error: any) {
    recordResult('Scenario 3', false, `Unexpected exception: ${error.message}`);
  }
}

// ========== Scenario 4: Concurrent Queries (simplified) ==========
async function scenario4() {
  log('Running Scenario 4: Concurrent Queries', 'info');

  try {
    // Submit 2 generations concurrently
    const historyIds = await Promise.all([
      generateImageAsync({
        prompt: '风景画 1',
        refresh_token: process.env.JIMENG_API_TOKEN!
      }),
      generateImageAsync({
        prompt: '风景画 2',
        refresh_token: process.env.JIMENG_API_TOKEN!
      })
    ]);

    log(`2 generations submitted: ${historyIds.join(', ')}`, 'info');

    // Verify all historyIds are unique and valid (numeric or h-prefixed format)
    const allValid = historyIds.every(id => /^[0-9]+$/.test(id) || /^h[a-zA-Z0-9]+$/.test(id));
    const allUnique = new Set(historyIds).size === historyIds.length;

    if (!allValid || !allUnique) {
      recordResult('Scenario 4', false, 'Invalid or duplicate historyIds');
      return;
    }

    // Query all concurrently
    const results = await Promise.all(
      historyIds.map(id => getImageResult(id))
    );

    // Verify independent results
    const allIndependent = results.every((r, i) => {
      return r.status !== undefined && r.progress !== undefined;
    });

    recordResult('Scenario 4', allIndependent,
      `Concurrent submission and query successful`);

  } catch (error: any) {
    recordResult('Scenario 4', false, `Exception: ${error.message}`);
  }
}

// ========== Scenario 5: Type Safety Verification ==========
async function scenario5() {
  log('Running Scenario 5: Type Safety & API Contract', 'info');

  try {
    // Verify generateImageAsync returns string
    const historyId = await generateImageAsync({
      prompt: '类型测试',
      refresh_token: process.env.JIMENG_API_TOKEN!
    });

    const typeCheck1 = typeof historyId === 'string';
    const typeCheck2 = historyId.length > 0;

    if (!typeCheck1 || !typeCheck2) {
      recordResult('Scenario 5', false, 'generateImageAsync type mismatch');
      return;
    }

    // Verify getImageResult returns correct structure
    const result = await getImageResult(historyId);

    const hasStatus = ['pending', 'processing', 'completed', 'failed'].includes(result.status);
    const hasProgress = typeof result.progress === 'number' && result.progress >= 0 && result.progress <= 100;

    recordResult('Scenario 5', hasStatus && hasProgress,
      'Type safety verified: correct return types and structure');

  } catch (error: any) {
    recordResult('Scenario 5', false, `Exception: ${error.message}`);
  }
}

// ========== Main Execution ==========
async function main() {
  console.log(colors.blue('\n========================================'));
  console.log(colors.blue('  Async API Validation Test Suite'));
  console.log(colors.blue('========================================\n'));

  // Check for API token
  if (!process.env.JIMENG_API_TOKEN) {
    log('ERROR: JIMENG_API_TOKEN environment variable not set', 'error');
    log('Usage: JIMENG_API_TOKEN=your_token npx tsx validate-async-api.ts', 'warning');
    process.exit(1);
  }

  log('Starting validation scenarios...', 'info');
  console.log('');

  // Run scenarios
  await scenario2();  // Quick validation first (no API calls)
  await scenario3();  // Quick validation
  await scenario5();  // Type safety (one quick API call)
  await scenario4();  // Concurrent queries (2 API calls)
  await scenario1();  // Full workflow (longest, runs last)

  // Print summary
  console.log('\n' + colors.blue('========================================'));
  console.log(colors.blue('  Validation Summary'));
  console.log(colors.blue('========================================\n'));

  results.scenarios.forEach(s => {
    const status = s.success ? colors.green('PASS') : colors.red('FAIL');
    console.log(`${status} ${s.name}`);
    console.log(`     ${s.details}\n`);
  });

  const total = results.passed + results.failed;
  const passRate = ((results.passed / total) * 100).toFixed(1);

  console.log(colors.blue('========================================'));
  console.log(`Total: ${total} scenarios`);
  console.log(`${colors.green(`Passed: ${results.passed}`)} | ${colors.red(`Failed: ${results.failed}`)}`);
  console.log(`Pass Rate: ${passRate}%`);
  console.log(colors.blue('========================================\n'));

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run
main().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});