const fs = require('fs');

// 读取构建后的API文件进行测试
async function testMCPInterface() {
  console.log('🔍 Testing MCP interface debug...');
  
  try {
    // 导入构建后的模块
    const { generateImage } = require('./lib/index.cjs');
    
    console.log('🔍 Testing with aspectRatio parameter...');
    
    // 测试参数
    const testParams = {
      prompt: "一只可爱的橘猫坐在窗台上，阳光洒在它身上，温馨的画面",
      aspectRatio: "16:9",
      model: "jimeng-4.0"
    };
    
    console.log('🔍 Test parameters:', JSON.stringify(testParams, null, 2));
    
    // 调用生成函数
    const result = await generateImage(testParams);
    console.log('🔍 Generation successful!');
    console.log('🔍 Result URLs:', result);
    
  } catch (error) {
    console.error('🔍 Test failed with error:', error.message);
    console.error('🔍 Error details:', error);
  }
}

testMCPInterface().catch(console.error);