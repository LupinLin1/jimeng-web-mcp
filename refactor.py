#!/usr/bin/env python3
"""
Refactor JimengClient.ts to delegate image generation methods to ImageGenerator
"""

import re

# Read the file
with open('src/api/JimengClient.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern 1: Replace generateImage method (lines ~60-77)
pattern1 = r'(  \/\/ ============== 图像生成功能 ==============\s+\n  \s+\/\*\*\s+\* 即梦AI图像生成.*?\*\/\s+)public async generateImage\(params: ImageGenerationParams\): Promise<string\[\]> \{\s+console\.log\(\x27\[DEBUG\].*?\);\s+console\.log\(\x27\[DEBUG\].*?\);\s+\n\s+return await this\.generateImageWithBatch\(params\);\s+\}'

replacement1 = r'\1public async generateImage(params: ImageGenerationParams): Promise<string[]> {\n    return this.imageGen.generateImage(params);\n  }'

content = re.sub(pattern1, replacement1, content, flags=re.DOTALL)

# Pattern 2: Remove generateImageWithBatch and all private methods up to video generation
# Find everything from "批量生成图像" to just before "视频生成功能"
pattern2 = r'\n  \/\*\*\s+\* 批量生成图像.*?(?=\n  \/\/ ============== 视频生成功能)'

content = re.sub(pattern2, '', content, flags=re.DOTALL)

# Pattern 3: Replace async methods (after video后处理 section)
# Find async query section and replace the methods

# Replace generateImageAsync
pattern3 = r'(  \/\*\*\s+\* 异步提交图像生成任务.*?\*\/\s+)async generateImageAsync\(params: ImageGenerationParams\): Promise<string> \{\s+console\.log.*?return historyId;\s+\}'

replacement3 = r'\1async generateImageAsync(params: ImageGenerationParams): Promise<string> {\n    return this.imageGen.generateImageAsync(params);\n  }'

content = re.sub(pattern3, replacement3, content, flags=re.DOTALL)

# Replace getImageResult
pattern4 = r'(  \/\*\*\s+\* 查询生成任务的当前状态和结果.*?\*\/\s+)async getImageResult\(historyId: string\): Promise<QueryResultResponse> \{\s+\/\/ 验证historyId.*?return response;\s+\}'

replacement4 = r'\1async getImageResult(historyId: string): Promise<QueryResultResponse> {\n    return this.imageGen.getImageResult(historyId);\n  }'

content = re.sub(pattern4, replacement4, content, flags=re.DOTALL)

# Replace getBatchResults
pattern5 = r'(  \/\*\*\s+\* 批量查询多个任务的生成状态和结果.*?\*\/\s+)async getBatchResults\(historyIds: string\[\]\): Promise<\{ \[historyId: string\]: QueryResultResponse \| \{ error: string \} \}> \{\s+console\.log.*?throw error;\s+\}\s+\}'

replacement5 = r'\1async getBatchResults(historyIds: string[]): Promise<{ [historyId: string]: QueryResultResponse | { error: string } }> {\n    return this.imageGen.getBatchResults(historyIds);\n  }'

content = re.sub(pattern5, replacement5, content, flags=re.DOTALL)

# Write back
with open('src/api/JimengClient.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactoring complete!")
print(f"New file has {len(content.splitlines())} lines")
