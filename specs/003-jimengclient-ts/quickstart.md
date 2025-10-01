# 快速开始：验证 ImageGenerator 重构

**功能**: 003-jimengclient-ts
**日期**: 2025-10-01
**目的**: 验证图像生成代码提取后的向后兼容性和功能完整性

## 前提条件

1. ✅ 已完成重构（所有代码已从 JimengClient.ts 迁移到 ImageGenerator.ts）
2. ✅ 已设置环境变量：`JIMENG_API_TOKEN=your_session_id`
3. ✅ 已安装依赖：`yarn install`

## 验证步骤

### 步骤 1：类型检查

验证 TypeScript 类型定义正确，无类型错误。

```bash
yarn type-check
```

**预期结果**：
```
✅ 类型检查通过，无错误
```

**失败处理**：
- 检查 `src/api/image/ImageGenerator.ts` 的导入路径
- 检查 `src/api/JimengClient.ts` 的委托方法类型
- 确保所有类型定义在 `src/types/api.types.ts` 中正确导出

---

### 步骤 2：构建验证

验证项目可以成功构建，生成的 lib 文件正确。

```bash
yarn build
```

**预期结果**：
```
✅ 构建成功
lib/
├── api/
│   ├── image/
│   │   ├── ImageGenerator.js
│   │   ├── ImageGenerator.cjs
│   │   ├── ImageGenerator.d.ts
│   │   └── index.js
│   └── ...
```

**失败处理**：
- 检查 `tsup.config.ts` 是否正确配置
- 清理构建缓存：`rm -rf lib && yarn build`
- 检查是否有循环依赖

---

### 步骤 3：单元测试

运行所有测试，验证向后兼容性。

```bash
yarn test
```

**预期结果**：
```
✅ 所有测试通过
Test Suites: 12 passed, 12 total
Tests:       45 passed, 45 total
```

**关键测试文件**：
- `src/__tests__/image-generation.test.ts` - 同步图像生成
- `src/__tests__/async-image-generation.test.ts` - 异步图像生成
- `src/__tests__/backward-compatibility.test.ts` - **关键**：API 向后兼容性
- `src/__tests__/integration.test.ts` - 端到端集成

**失败处理**：
- 如果 `backward-compatibility.test.ts` 失败：检查公共 API 签名是否改变
- 如果 `image-generation.test.ts` 失败：检查委托方法是否正确实现
- 运行单个测试调试：`yarn test image-generation.test.ts`

---

### 步骤 4：代码行数验证

验证代码重构达到预期目标（减少 JimengClient.ts 行数）。

```bash
wc -l src/api/JimengClient.ts src/api/image/ImageGenerator.ts
```

**预期结果**：
```
  约 1100 行  src/api/JimengClient.ts       （重构前：1917 行）
  约 900 行   src/api/image/ImageGenerator.ts （新建）
```

**验证要点**：
- JimengClient.ts 应减少约 800 行（图像生成代码）
- ImageGenerator.ts 应包含约 900 行（包括注释和日志）
- 总代码行数应保持不变或略有减少

---

### 步骤 5：功能测试（手动）

使用 MCP Inspector 测试实际图像生成功能。

#### 5.1 启动 MCP Inspector

```bash
yarn test:mcp
```

#### 5.2 测试同步图像生成

在 MCP Inspector 中调用 `generateImage` 工具：

```json
{
  "prompt": "一只可爱的橘猫，坐在窗台上，阳光洒在身上",
  "aspectRatio": "16:9",
  "model": "jimeng-4.0"
}
```

**预期结果**：
- ✅ 成功返回图片 URL 数组
- ✅ 图片可以在浏览器中打开并查看

#### 5.3 测试异步图像生成

调用 `generateImageAsync` 工具：

```json
{
  "prompt": "一只可爱的橘猫，坐在窗台上，阳光洒在身上",
  "count": 1
}
```

**预期结果**：
- ✅ 立即返回 historyId（如 "4721606420748"）

然后调用 `getImageResult` 工具查询状态：

```json
{
  "historyId": "4721606420748"
}
```

**预期结果**：
- ✅ 返回任务状态和进度
- ✅ 完成后返回图片 URL

#### 5.4 测试继续生成

调用 `generateImage` 工具测试批量生成：

```json
{
  "prompt": "一只可爱的橘猫，坐在窗台上，阳光洒在身上",
  "count": 10,
  "aspectRatio": "16:9"
}
```

**预期结果**：
- ✅ 成功返回 10 张图片 URL
- ✅ 日志中显示继续生成请求（检测到 count > 4）

---

### 步骤 6：性能验证（可选）

验证重构后性能未降低。

```bash
yarn test:coverage
```

**预期结果**：
- ✅ 测试覆盖率保持不变（约 80%+）
- ✅ 测试执行时间未显著增加

---

## 验证检查清单

完成所有步骤后，确认以下检查项：

- [ ] ✅ 类型检查通过（`yarn type-check`）
- [ ] ✅ 构建成功（`yarn build`）
- [ ] ✅ 所有测试通过（`yarn test`）
- [ ] ✅ 向后兼容性测试通过（`backward-compatibility.test.ts`）
- [ ] ✅ JimengClient.ts 行数减少约 800 行
- [ ] ✅ ImageGenerator.ts 新建成功
- [ ] ✅ MCP Inspector 手动测试成功
- [ ] ✅ 同步图像生成正常工作
- [ ] ✅ 异步图像生成正常工作
- [ ] ✅ 继续生成（count > 4）正常工作
- [ ] ✅ 批量查询正常工作

## 回滚步骤（如果验证失败）

如果验证失败，可以回滚到重构前的状态：

```bash
# 切换回主分支
git checkout main

# 或者丢弃更改
git checkout 003-jimengclient-ts
git reset --hard origin/main
```

## 成功标准

✅ **所有验证步骤通过** = 重构成功

验证成功后，可以：
1. 提交代码：`git commit -m "refactor: extract image generation to ImageGenerator"`
2. 推送分支：`git push origin 003-jimengclient-ts`
3. 创建 Pull Request
4. 运行 CI/CD 验证

## 故障排查

### 问题 1：类型检查失败

**症状**：`yarn type-check` 报错
**可能原因**：
- 导入路径错误
- 类型定义不匹配
- 缺少类型导出

**解决方法**：
```bash
# 检查导入路径
grep -r "from.*ImageGenerator" src/

# 检查类型导出
cat src/api/image/index.ts
cat src/types/api.types.ts
```

### 问题 2：测试失败

**症状**：`yarn test` 部分测试失败
**可能原因**：
- 委托方法未正确实现
- 静态属性未正确迁移
- 测试依赖内部实现细节

**解决方法**：
```bash
# 运行单个测试并查看详细输出
yarn test image-generation.test.ts --verbose

# 检查委托方法
grep "return this.imageGen" src/api/JimengClient.ts
```

### 问题 3：构建失败

**症状**：`yarn build` 失败
**可能原因**：
- 循环依赖
- 缺少导出
- tsup 配置错误

**解决方法**：
```bash
# 清理构建缓存
rm -rf lib node_modules/.cache

# 重新构建
yarn build

# 检查循环依赖
npx madge --circular src/
```

## 下一步

验证成功后：
1. ✅ 标记 plan.md 中的"阶段 1：设计完成"为已完成
2. ✅ 更新 CLAUDE.md（如需要）
3. ✅ 执行 `/tasks` 命令生成任务列表
4. ✅ 开始实施任务

---

**文档版本**: 1.0.0
**最后更新**: 2025-10-01
**维护者**: 自动生成（/plan 命令）
