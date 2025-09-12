const fs = require('fs');

// 读取构建后的API文件
async function testModel() {
  const { JimengApiClient } = require('./lib/api.cjs');
  
  const client = new JimengApiClient();
  
  // 测试模型映射
  console.log('🔍 测试jimeng-4.0模型映射...');
  
  // 创建一个测试参数
  const testParams = {
    prompt: "测试提示词",
    model: "jimeng-4.0",
    width: 1024,
    height: 1024
  };
  
  try {
    // 使用内部方法获取实际模型名称
    const modelName = testParams.model || 'jimeng-4.0';
    console.log('🔍 请求模型名称:', modelName);
    
    // 这里我们只是测试请求构建，不实际发送请求
    console.log('🔍 模型映射测试完成');
    
    // 尝试构建请求数据看看实际使用的模型
    const actualModel = client.getModel ? client.getModel(modelName) : 'unknown';
    console.log('🔍 映射后的实际模型:', actualModel);
    
  } catch (error) {
    console.error('🔍 测试过程中出错:', error.message);
  }
}

testModel().catch(console.error);