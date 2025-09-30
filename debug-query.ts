import { generateImageAsync, getImageResult } from './src/api.js';

async function test() {
  const token = '165fe506411b95d771e619b7d509bb28';

  // Submit generation
  const historyId = await generateImageAsync({
    prompt: '测试',
    refresh_token: token
  });

  console.log('historyId:', historyId);

  // Wait a bit
  await new Promise(r => setTimeout(r, 15000));

  // Query
  const result = await getImageResult(historyId, token);
  console.log('Result:', JSON.stringify(result, null, 2));
}

test().catch(console.error);