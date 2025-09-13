#!/usr/bin/env node

// 简单的URL提取测试
import fs from 'fs';

// 读取最新的debug文件
const debugFile = 'debug-jimeng-response-jimeng-4.0-1757655695439.json';
const data = JSON.parse(fs.readFileSync(debugFile, 'utf8'));

console.log('Poll result length:', data.pollResult.length);

// 测试extractImageUrls逻辑
function extractImageUrls(itemList) {
  console.log('itemList 项目数量:', itemList?.length || 0);

  const resultList = (itemList || []).map((item, index) => {
    console.log(`处理第${index}项的 image 字段:`, {
      hasImage: !!item.image,
      hasLargeImages: !!item.image?.large_images,
      largeImagesLength: item.image?.large_images?.length
    });
    
    // 尝试多种可能的URL路径
    let imageUrl = item?.image?.large_images?.[0]?.image_url 
                || item?.common_attr?.cover_url
                || item?.image?.url
                || item?.image?.image_url
                || item?.cover_url
                || item?.url;
    
    console.log(`第${index}项提取到的URL:`, imageUrl ? '有URL' : '无URL');
    return imageUrl;
  }).filter(Boolean)
  
  console.log('提取的图片结果数量:', resultList.length)
  return resultList
}

const urls = extractImageUrls(data.pollResult);
console.log('最终结果:', urls.length > 0 ? '成功' : '失败');
if (urls.length > 0) {
  console.log('第一个URL:', urls[0]);
}