/**
 * 调试继续生成API请求
 * 输出实际发送的请求参数，与真实curl对比
 */

import { NewJimengClient } from '../../src/api/NewJimengClient.js';

async function debugContinueGeneration() {
  const token = process.env.JIMENG_API_TOKEN || '165fe506411b95d771e619b7d509bb28';
  const client = new NewJimengClient(token);

  console.log('\n🔍 调试继续生成API请求\n');

  // 拦截HTTP请求，输出完整参数
  const httpClient = (client as any).httpClient;
  const originalRequest = httpClient.request.bind(httpClient);

  httpClient.request = async function(config: any) {
    if (config.url?.includes('aigc_draft/generate')) {
      console.log('📤 发送请求URL:', config.url);
      console.log('📦 请求参数:');
      console.log(JSON.stringify(config.params, null, 2));
      console.log('📋 请求体:');
      console.log(JSON.stringify(config.data, null, 2));
      console.log('\n');
    }

    try {
      const result = await originalRequest(config);
      if (config.url?.includes('aigc_draft/generate')) {
        console.log('✅ 响应成功:');
        console.log(JSON.stringify(result, null, 2));
      }
      return result;
    } catch (error: any) {
      if (config.url?.includes('aigc_draft/generate')) {
        console.log('❌ 请求失败:');
        console.log(JSON.stringify(error.response?.data || error.message, null, 2));
      }
      throw error;
    }
  };

  try {
    console.log('🧪 测试：生成6张图片（同步模式）\n');

    const params = {
      prompt: '简笔画风格，可爱的动物',
      count: 6,
      model: 'jimeng-4.0',
      aspectRatio: '1:1',
      async: false
    };

    console.log('请求参数:', params, '\n');

    const result = await client.generateImage(params);

    console.log('\n✅ 最终结果:');
    console.log(`生成了 ${result.length} 张图片`);

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

debugContinueGeneration();
