const { z } = require('zod');

// 复制MCP服务器中的Zod schema
const generateImageSchema = {
  filePath: z.string().optional().describe("本地图片路径或图片URL（可选，若填写则为图片混合/参考图生成功能）"),
  prompt: z.string().describe("生成图像的文本描述"),
  model: z.string().optional().describe("模型名称，可选值: jimeng-4.0,jimeng-3.0, jimeng-2.1, jimeng-2.0-pro, jimeng-2.0, jimeng-1.4, jimeng-xl-pro"),
  aspectRatio: z.string().optional().default("auto").describe("宽高比预设，支持以下选项: auto(智能), 21:9(超宽屏), 16:9(标准宽屏), 3:2(摄影), 4:3(传统), 1:1(正方形), 3:4(竖屏), 2:3(书籍), 9:16(手机竖屏)"),
  sample_strength: z.number().min(0).max(1).optional().default(0.5).describe("精细度，范围0-1，默认0.5。数值越小越接近参考图"),
  negative_prompt: z.string().optional().default("").describe("反向提示词，告诉模型不要生成什么内容"),
};

async function testZodValidation() {
  console.log('🔍 Testing Zod validation...');
  
  try {
    // 创建Zod对象
    const schema = z.object(generateImageSchema);
    
    // 测试参数（模拟MCP接口接收到的参数）
    const testParams = {
      prompt: "一只可爱的橘猫坐在窗台上，阳光洒在它身上，温馨的画面",
      aspectRatio: "16:9",
      model: "jimeng-4.0"
    };
    
    console.log('🔍 Input parameters:', JSON.stringify(testParams, null, 2));
    
    // 进行Zod验证
    const validatedParams = schema.parse(testParams);
    
    console.log('🔍 Zod validation successful!');
    console.log('🔍 Validated parameters:', JSON.stringify(validatedParams, null, 2));
    
    // 现在测试API调用
    console.log('🔍 Testing API call with validated parameters...');
    
    const { generateImage } = require('./lib/index.cjs');
    const result = await generateImage(validatedParams);
    
    console.log('🔍 API call successful with Zod-validated parameters!');
    console.log('🔍 Result URLs count:', result.length);
    
  } catch (error) {
    console.error('🔍 Test failed:', error.message);
    console.error('🔍 Error details:', error);
  }
}

testZodValidation().catch(console.error);