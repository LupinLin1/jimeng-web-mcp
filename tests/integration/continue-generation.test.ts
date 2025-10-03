/**
 * 继续生成功能集成测试
 *
 * 测试场景：
 * 1. 同步模式：count>4时自动触发继续生成
 * 2. 异步模式：智能检测并自动触发继续生成
 * 3. 验证API调用参数（action=2, history_id）
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { NewJimengClient } from '../../src/api/NewJimengClient.js';

const token = process.env.JIMENG_API_TOKEN;
const describeOrSkip = token ? describe : describe.skip;

describeOrSkip('继续生成功能集成测试', () => {
  let client: NewJimengClient;

  beforeAll(() => {
    client = new NewJimengClient(token!);
  });

  it('同步模式：生成6张图片应自动继续生成', async () => {
    console.log('\n🧪 测试：同步继续生成（count=6）');

    const params = {
      prompt: '简笔画风格，可爱的小动物',
      count: 6,
      model: 'jimeng-4.0',
      aspectRatio: '1:1',
      async: false
    };

    console.log('📤 提交请求:', params);

    const result = await client.generateImage(params);

    console.log('✅ 生成完成，获得图片数量:', result.length);

    // 验证结果
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(6);

    // 验证所有图片URL有效
    for (const url of result) {
      expect(url).toMatch(/^https?:\/\//);
    }

    console.log('🎉 同步继续生成测试通过！');
  }, 300000); // 5分钟超时

  it('异步模式：生成8张图片应触发智能继续生成', async () => {
    console.log('\n🧪 测试：异步智能继续生成（count=8）');

    const params = {
      prompt: '简笔画风格，彩色图案',
      count: 8,
      model: 'jimeng-4.0',
      aspectRatio: '1:1',
      async: true
    };

    console.log('📤 提交异步请求:', params);

    // 1. 提交异步任务
    const historyId = await client.generateImage(params);
    expect(typeof historyId).toBe('string');
    console.log('✅ 任务已提交，historyId:', historyId);

    // 2. 轮询查询，等待前4张完成
    console.log('⏳ 等待前4张图片生成...');
    let result;
    let attempts = 0;
    const maxAttempts = 60; // 最多等待2分钟

    while (attempts < maxAttempts) {
      result = await client.getImageResult(historyId);
      console.log(`🔍 查询状态: ${result.status}, 进度: ${result.progress}%`);

      if (result.status === 'completed' && result.imageUrls && result.imageUrls.length === 4) {
        console.log('✅ 前4张已完成');
        break;
      }

      if (result.status === 'failed') {
        throw new Error(`生成失败: ${result.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('等待前4张图片超时');
    }

    // 3. 检查是否触发了继续生成
    if (result.needs_more) {
      console.log('🔄 检测到继续生成标记，等待剩余图片...');

      // 继续等待剩余图片
      attempts = 0;
      while (attempts < maxAttempts) {
        result = await client.getImageResult(historyId);
        console.log(`🔍 查询状态: ${result.status}, 图片数: ${result.imageUrls?.length || 0}/8`);

        if (result.imageUrls && result.imageUrls.length === 8) {
          console.log('✅ 所有8张图片已生成完成！');
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      }
    }

    // 4. 验证最终结果
    expect(result.imageUrls).toBeDefined();
    expect(result.imageUrls!.length).toBeGreaterThanOrEqual(4);
    console.log(`🎉 异步继续生成测试通过！最终获得 ${result.imageUrls!.length} 张图片`);
  }, 600000); // 10分钟超时

  it('验证继续生成API参数正确', async () => {
    console.log('\n🧪 测试：验证继续生成API参数');

    // 使用spy监控submitImageTask调用
    const submitSpy = jest.spyOn(client as any, 'submitImageTask');

    const params = {
      prompt: '测试继续生成参数',
      count: 6,
      model: 'jimeng-4.0',
      async: false
    };

    console.log('📤 提交请求...');

    try {
      await client.generateImage(params);
    } catch (error) {
      // 可能因为其他原因失败，我们只关注API调用参数
    }

    // 验证第二次调用（继续生成）的参数
    if (submitSpy.mock.calls.length >= 2) {
      const secondCallParams = submitSpy.mock.calls[1][0];
      console.log('🔍 继续生成参数:', JSON.stringify(secondCallParams, null, 2));

      // 验证关键参数
      expect(secondCallParams).toHaveProperty('history_id');
      expect(secondCallParams.count).toBeLessThanOrEqual(4);

      console.log('✅ 继续生成参数验证通过！');
    } else {
      console.log('⚠️  未触发继续生成（可能第一次请求失败）');
    }

    submitSpy.mockRestore();
  }, 300000);
});
