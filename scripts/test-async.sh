#!/bin/bash

# JiMeng MCP异步功能测试脚本
# 运行所有异步相关的测试

echo "🚀 开始运行JiMeng MCP异步图像生成功能测试..."
echo "================================================"

# 设置颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 运行单个测试文件的函数
run_test() {
    local test_file=$1
    local test_name=$2
    
    echo -e "\n${YELLOW}📋 运行: $test_name${NC}"
    echo "----------------------------------------"
    
    if npm test -- "$test_file" --silent --testTimeout=10000; then
        echo -e "${GREEN}✅ $test_name - 通过${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name - 失败${NC}"
        return 1
    fi
}

# 计数器
total_tests=0
passed_tests=0

# 测试文件列表
declare -a tests=(
    "src/__tests__/async-image-generation.test.ts:异步图像生成核心功能测试"
    "src/__tests__/async-api-integration.test.ts:异步API集成测试"
    "src/__tests__/async-mcp-tools.test.ts:MCP工具层异步功能测试"
    "src/__tests__/backward-compatibility.test.ts:向后兼容性测试"
)

# 运行所有测试
for test_entry in "${tests[@]}"; do
    IFS=':' read -r test_file test_name <<< "$test_entry"
    total_tests=$((total_tests + 1))
    
    if run_test "$test_file" "$test_name"; then
        passed_tests=$((passed_tests + 1))
    fi
done

# 显示测试结果总结
echo ""
echo "================================================"
echo "🎯 测试结果总结"
echo "================================================"
echo -e "总测试套件: $total_tests"
echo -e "通过: ${GREEN}$passed_tests${NC}"
echo -e "失败: ${RED}$((total_tests - passed_tests))${NC}"

if [ $passed_tests -eq $total_tests ]; then
    echo -e "\n${GREEN}🎉 所有测试通过！异步功能可以安全部署。${NC}"
    exit 0
else
    echo -e "\n${YELLOW}⚠️  有 $((total_tests - passed_tests)) 个测试套件失败，但这可能是预期的错误场景测试。${NC}"
    echo -e "${YELLOW}请查看具体的测试输出了解详情。${NC}"
    exit 1
fi