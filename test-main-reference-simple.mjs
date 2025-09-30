/**
 * 主体参考视频生成简单测试
 * 直接测试代码逻辑，不需要实际调用API
 */

console.log('=== 主体参考功能单元测试 ===\n');

// 测试1: 提示词解析逻辑
console.log('📝 测试 1: 提示词解析逻辑\n');

function parsePrompt(prompt) {
  const segments = [];
  const imageRefPattern = /\[图(\d+)\]/g;

  let lastIndex = 0;
  let match;

  while ((match = imageRefPattern.exec(prompt)) !== null) {
    if (match.index > lastIndex) {
      const textContent = prompt.substring(lastIndex, match.index);
      if (textContent) {
        segments.push({
          type: 'text',
          content: textContent
        });
      }
    }

    segments.push({
      type: 'image_ref',
      content: match[1]
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < prompt.length) {
    const textContent = prompt.substring(lastIndex);
    if (textContent) {
      segments.push({
        type: 'text',
        content: textContent
      });
    }
  }

  return segments;
}

const testCases = [
  {
    prompt: '[图0]中的猫在[图1]的地板上跑',
    expected: [
      { type: 'image_ref', content: '0' },
      { type: 'text', content: '中的猫在' },  // 实际解析结果，[图N]后面直接是文本
      { type: 'image_ref', content: '1' },
      { type: 'text', content: '的地板上跑' }
    ]
  },
  {
    prompt: '开头是文本[图0]中间[图1]结尾',
    expected: [
      { type: 'text', content: '开头是文本' },
      { type: 'image_ref', content: '0' },
      { type: 'text', content: '中间' },
      { type: 'image_ref', content: '1' },
      { type: 'text', content: '结尾' }
    ]
  },
  {
    prompt: '[图0][图1]连续引用',
    expected: [
      { type: 'image_ref', content: '0' },
      { type: 'image_ref', content: '1' },
      { type: 'text', content: '连续引用' }
    ]
  }
];

let passCount = 0;
for (const testCase of testCases) {
  console.log(`测试提示词: "${testCase.prompt}"`);
  const result = parsePrompt(testCase.prompt);

  // 检查结果
  let pass = true;
  if (result.length !== testCase.expected.length) {
    pass = false;
    console.log(`  ❌ 长度不匹配: 期望${testCase.expected.length}, 实际${result.length}`);
  } else {
    for (let i = 0; i < result.length; i++) {
      if (result[i].type !== testCase.expected[i].type ||
          result[i].content !== testCase.expected[i].content) {
        pass = false;
        console.log(`  ❌ 片段${i}不匹配:`);
        console.log(`     期望: ${JSON.stringify(testCase.expected[i])}`);
        console.log(`     实际: ${JSON.stringify(result[i])}`);
      }
    }
  }

  if (pass) {
    console.log('  ✅ 通过');
    passCount++;
  }
  console.log('  解析结果:', JSON.stringify(result, null, 2));
  console.log('');
}

console.log(`\n结果: ${passCount}/${testCases.length} 测试通过\n`);

// 测试2: 参数验证逻辑
console.log('📝 测试 2: 参数验证逻辑\n');

function validateParams(params) {
  const errors = [];

  // 验证参考图片数量
  if (!params.referenceImages || params.referenceImages.length < 2) {
    errors.push('主体参考模式至少需要2张参考图片');
  }
  if (params.referenceImages && params.referenceImages.length > 4) {
    errors.push('主体参考模式最多支持4张参考图片');
  }

  // 验证提示词
  if (!params.prompt || params.prompt.trim().length === 0) {
    errors.push('提示词不能为空');
  }

  // 验证提示词中包含图片引用
  const imageRefPattern = /\[图\d+\]/g;
  const matches = params.prompt?.match(imageRefPattern);
  if (!matches || matches.length === 0) {
    errors.push('提示词中必须包含至少一个图片引用，格式如：[图0]、[图1]');
  }

  // 验证图片索引有效性
  if (params.referenceImages && matches) {
    const maxIndex = params.referenceImages.length - 1;
    for (const match of matches) {
      const index = parseInt(match.match(/\d+/)?.[0] || '0');
      if (index > maxIndex) {
        errors.push(`图片引用[图${index}]超出范围，当前只有${params.referenceImages.length}张图片（索引0-${maxIndex}）`);
      }
    }
  }

  return errors;
}

const validationTests = [
  {
    name: '正常情况',
    params: {
      referenceImages: ['a.jpg', 'b.jpg'],
      prompt: '[图0]和[图1]'
    },
    shouldFail: false
  },
  {
    name: '图片少于2张',
    params: {
      referenceImages: ['a.jpg'],
      prompt: '[图0]'
    },
    shouldFail: true
  },
  {
    name: '图片多于4张',
    params: {
      referenceImages: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg'],
      prompt: '[图0]'
    },
    shouldFail: true
  },
  {
    name: '提示词缺少图片引用',
    params: {
      referenceImages: ['a.jpg', 'b.jpg'],
      prompt: '一只猫'
    },
    shouldFail: true
  },
  {
    name: '图片索引超出范围',
    params: {
      referenceImages: ['a.jpg', 'b.jpg'],
      prompt: '[图0]和[图5]'
    },
    shouldFail: true
  }
];

let validationPassCount = 0;
for (const test of validationTests) {
  console.log(`测试: ${test.name}`);
  const errors = validateParams(test.params);
  const hasFailed = errors.length > 0;

  if (hasFailed === test.shouldFail) {
    console.log('  ✅ 通过');
    validationPassCount++;
    if (errors.length > 0) {
      console.log(`  错误信息: ${errors[0]}`);
    }
  } else {
    console.log('  ❌ 失败');
    console.log(`  期望${test.shouldFail ? '失败' : '成功'}, 实际${hasFailed ? '失败' : '成功'}`);
    if (errors.length > 0) {
      console.log(`  错误: ${errors.join('; ')}`);
    }
  }
  console.log('');
}

console.log(`\n结果: ${validationPassCount}/${validationTests.length} 测试通过\n`);

// 总结
console.log('=== 测试总结 ===\n');
const totalTests = testCases.length + validationTests.length;
const totalPass = passCount + validationPassCount;
console.log(`总计: ${totalPass}/${totalTests} 测试通过`);

if (totalPass === totalTests) {
  console.log('✅ 所有测试通过！');
  process.exit(0);
} else {
  console.log(`❌ 有 ${totalTests - totalPass} 个测试失败`);
  process.exit(1);
}