module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/module-imports.test.ts',
    '**/__tests__/**/utilities.test.ts',
    '**/tests/unit/**/*.test.ts',
    '**/tests/integration/**/*.test.ts',
  ],
  // 暂时排除需要mock的测试文件（ESM环境下jest.mock()不工作）
  // TODO: 未来重写这些测试或升级到支持ESM mock的jest版本
  testPathIgnorePatterns: [
    '/node_modules/',
    'async-mcp-tools.test.ts',
    'async-image-generation.test.ts',
    'async-video-generation.test.ts',
    'backward-compatibility.test.ts',
    'build-verification.test.ts',
    'clients.test.ts',
    'image-generation.test.ts',
    'integration.test.ts',
    'simple-integration.test.ts',
    'video-generation.test.ts',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        moduleResolution: 'NodeNext',
        module: 'NodeNext',
      }
    }],
  },
  moduleNameMapper: {
    // Handle ES module imports with .js extension
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Support for ES modules
  extensionsToTreatAsEsm: ['.ts'],
  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/**/index.ts',
    '!src/api/index.ts', // Re-export file with missing modules
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};