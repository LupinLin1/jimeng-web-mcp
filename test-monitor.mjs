#!/usr/bin/env node

import os from 'os';
import { generateImage } from './lib/index.js';

// CPU和内存监控函数
function getSystemStats() {
  const cpus = os.cpus();
  const totalCpu = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    return acc + total;
  }, 0);

  const idleCpu = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
  const cpuUsage = 100 - Math.round((idleCpu / totalCpu) * 100);

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);

  return {
    cpu: cpuUsage,
    memory: memUsage,
    memoryMB: Math.round((totalMem - freeMem) / 1024 / 1024)
  };
}

// 监控器
let monitorInterval;
let startTime;
const stats = [];

function startMonitoring() {
  startTime = Date.now();
  console.log('\n🔍 开始系统资源监控...');
  console.log('=====================================');

  // 初始状态
  const initial = getSystemStats();
  console.log(`初始状态: CPU=${initial.cpu}%, 内存=${initial.memory}% (${initial.memoryMB}MB)`);

  monitorInterval = setInterval(() => {
    const current = getSystemStats();
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    stats.push({ time: elapsed, ...current });

    // 高亮显示异常值
    const cpuWarning = current.cpu > 80 ? '⚠️ ' : '';
    const memWarning = current.memory > 80 ? '⚠️ ' : '';

    console.log(
      `[${elapsed}s] ${cpuWarning}CPU=${current.cpu}%, ${memWarning}内存=${current.memory}% (${current.memoryMB}MB)`
    );
  }, 1000);
}

function stopMonitoring() {
  clearInterval(monitorInterval);
  console.log('\n=====================================');
  console.log('📊 监控统计:');

  if (stats.length > 0) {
    const avgCpu = Math.round(stats.reduce((acc, s) => acc + s.cpu, 0) / stats.length);
    const maxCpu = Math.max(...stats.map(s => s.cpu));
    const avgMem = Math.round(stats.reduce((acc, s) => acc + s.memory, 0) / stats.length);
    const maxMem = Math.max(...stats.map(s => s.memoryMB));

    console.log(`平均CPU使用率: ${avgCpu}%`);
    console.log(`峰值CPU使用率: ${maxCpu}%`);
    console.log(`平均内存使用率: ${avgMem}%`);
    console.log(`峰值内存使用: ${maxMem}MB`);
  }
}

async function testImageGeneration() {
  console.log('\n🎨 开始测试图像生成...\n');

  // 开始监控
  startMonitoring();

  try {
    console.log('\n📸 发起图像生成请求...');
    const params = {
      prompt: '一只可爱的橘色小猫咪坐在窗台上，阳光洒在毛发上，温暖的色调，高清细节',
      model: 'jimeng-4.0',
      aspectRatio: '1:1',
      refresh_token: process.env.JIMENG_API_TOKEN || '165fe506411b95d771e619b7d509bb28'
    };

    console.log('参数:', JSON.stringify(params, null, 2));

    const result = await generateImage(params);

    console.log('\n✅ 图像生成成功!');
    console.log('返回结果数量:', result.length);
    result.forEach((url, index) => {
      console.log(`图片${index + 1}: ${url.substring(0, 50)}...`);
    });

  } catch (error) {
    console.error('\n❌ 图像生成失败:', error.message);
    console.error('错误堆栈:', error.stack);
  } finally {
    // 延迟停止监控，观察后续影响
    setTimeout(() => {
      stopMonitoring();
      process.exit(0);
    }, 3000);
  }
}

// 捕获未处理的错误
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  stopMonitoring();
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  stopMonitoring();
  process.exit(1);
});

// 执行测试
console.log('🚀 JiMeng API 调试监控工具');
console.log('=====================================');
testImageGeneration();