# JiMeng MCP 内存优化方案

## 🚨 问题总结

发现JiMeng MCP服务器存在严重的内存泄漏和CPU占用问题：

### 问题表现
- 两个进程持续运行67+小时
- CPU占用率99.2%
- 内存占用120MB+且持续增长
- 进程卡在轮询循环中无法退出

### 根本原因
1. **无限轮询**: 三个轮询方法存在长时间循环
2. **缺乏超时机制**: 没有全局超时保护
3. **错误处理不当**: 网络错误时继续重试而不是退出
4. **内存积累**: 长时间运行导致请求日志和对象积累

## 🛠️ 解决方案

### 1. 添加全局超时机制

```typescript
// 在JimengClient.ts中添加全局配置
private readonly GLOBAL_TIMEOUT = 300000; // 5分钟全局超时
private readonly MAX_POLL_COUNT = 20; // 减少最大轮询次数
private readonly POLL_INTERVAL = 5000; // 统一轮询间隔
```

### 2. 优化轮询逻辑

#### 当前问题代码:
```typescript
while (pollCount < maxPollCount) {
  pollCount++;
  await new Promise(resolve => setTimeout(resolve, waitTime));
  // 无终止条件的持续轮询
}
```

#### 优化后代码:
```typescript
private async pollWithTimeout<T>(
  pollFunction: () => Promise<T>,
  isComplete: (result: T) => boolean,
  maxDuration: number = this.GLOBAL_TIMEOUT
): Promise<T> {
  const startTime = Date.now();
  let pollCount = 0;
  
  while (Date.now() - startTime < maxDuration && pollCount < this.MAX_POLL_COUNT) {
    pollCount++;
    
    try {
      const result = await pollFunction();
      if (isComplete(result)) {
        return result;
      }
    } catch (error) {
      // 连续失败3次则退出
      if (pollCount >= 3) {
        throw error;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, this.POLL_INTERVAL));
  }
  
  throw new Error('轮询超时或达到最大重试次数');
}
```

### 3. 内存泄漏防护

```typescript
// 添加请求缓存清理
private requestCache = new Map();
private readonly MAX_CACHE_SIZE = 100;

private cleanupCache() {
  if (this.requestCache.size > this.MAX_CACHE_SIZE) {
    const keysToDelete = Array.from(this.requestCache.keys()).slice(0, this.MAX_CACHE_SIZE / 2);
    keysToDelete.forEach(key => this.requestCache.delete(key));
  }
}
```

### 4. 进程健康检查

```typescript
// 添加进程监控
private healthCheck() {
  const memUsage = process.memoryUsage();
  if (memUsage.heapUsed > 200 * 1024 * 1024) { // 200MB
    console.warn('内存使用过高:', memUsage);
    this.cleanupCache();
    global.gc && global.gc(); // 强制垃圾回收
  }
}
```

## 🎯 实施步骤

### 第一阶段: 紧急修复
1. ✅ 终止占用高CPU的进程
2. ⏳ 修复轮询超时机制
3. ⏳ 添加错误退出条件

### 第二阶段: 性能优化
1. ⏳ 实现统一轮询框架
2. ⏳ 添加内存监控
3. ⏳ 优化日志输出

### 第三阶段: 长期维护
1. ⏳ 添加性能指标收集
2. ⏳ 实现自动重启机制
3. ⏳ 完善错误报告

## 📊 预期效果

- CPU占用降低到 < 5%
- 内存使用稳定在 < 50MB
- 轮询超时时间控制在5分钟内
- 进程稳定性显著提升

## ⚠️ 注意事项

1. 需要测试异步功能不受影响
2. 确保向后兼容性
3. 添加详细的监控日志
4. 考虑添加熔断机制