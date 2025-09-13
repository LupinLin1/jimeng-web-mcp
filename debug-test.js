#!/usr/bin/env node

const { createClientFromEnvironment } = require('./lib/index.cjs');

async function testImageGeneration() {
  try {
    console.log('Creating client...');
    const client = createClientFromEnvironment();
    
    console.log('Client info:', client.getClientInfo());
    
    console.log('Testing simple image generation...');
    const result = await client.generateImage({
      prompt: "一只可爱的小猫",
      model: "jimeng-4.0",
      aspectRatio: "1:1"
    });
    
    console.log('Generation result:', result);
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testImageGeneration();