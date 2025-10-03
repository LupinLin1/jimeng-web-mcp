/**
 * Prompt Validator Test Suite
 *
 * TDD Red Phase: These tests MUST FAIL initially
 * Expected to pass after implementing src/utils/prompt-validator.ts (T012)
 */

import { describe, it, expect } from '@jest/globals';
import { PromptValidator } from '../../src/utils/prompt-validator.js';

describe('PromptValidator', () => {
  let validator: PromptValidator;

  beforeEach(() => {
    validator = new PromptValidator();
  });

  describe('hasCountDeclaration', () => {
    it('should detect "一共5张图" pattern', () => {
      expect(validator.hasCountDeclaration('画一只猫，一共5张图')).toBe(true);
    });

    it('should detect "共6张" pattern', () => {
      expect(validator.hasCountDeclaration('共6张小狗')).toBe(true);
    });

    it('should detect "总共8张" pattern', () => {
      expect(validator.hasCountDeclaration('总共8张图片')).toBe(true);
    });

    it('should detect "5张图" pattern', () => {
      expect(validator.hasCountDeclaration('生成5张图')).toBe(true);
    });

    it('should return false when no pattern found', () => {
      expect(validator.hasCountDeclaration('画一只猫')).toBe(false);
    });

    it('should handle edge case: incomplete "一共" at end', () => {
      expect(validator.hasCountDeclaration('画一只猫一共')).toBe(false);
    });
  });

  describe('appendCountIfMissing', () => {
    it('should append "，一共5张图" when missing', () => {
      const result = validator.appendCountIfMissing('画一只猫', 5);
      expect(result).toBe('画一只猫，一共5张图');
    });

    it('should not append when "一共5张图" already present', () => {
      const result = validator.appendCountIfMissing('画一只猫，一共5张图', 5);
      expect(result).toBe('画一只猫，一共5张图');
    });

    it('should not append when "共6张" already present', () => {
      const result = validator.appendCountIfMissing('共6张小狗', 6);
      expect(result).toBe('共6张小狗');
    });

    it('should not append when "总共8张" already present', () => {
      const result = validator.appendCountIfMissing('总共8张图片', 8);
      expect(result).toBe('总共8张图片');
    });

    it('should handle empty prompt by appending without comma', () => {
      const result = validator.appendCountIfMissing('', 3);
      expect(result).toBe('一共3张图');
    });

    it('should handle prompt with only spaces', () => {
      const result = validator.appendCountIfMissing('   ', 4);
      // Whitespace-only prompts are treated as empty (trimmed)
      expect(result).toBe('一共4张图');
    });
  });

  describe('extractCount (optional)', () => {
    it('should extract count from "一共5张图"', () => {
      if (validator.extractCount) {
        const count = validator.extractCount('画一只猫，一共5张图');
        expect(count).toBe(5);
      }
    });

    it('should extract count from "共6张"', () => {
      if (validator.extractCount) {
        const count = validator.extractCount('共6张小狗');
        expect(count).toBe(6);
      }
    });

    it('should return null when no count found', () => {
      if (validator.extractCount) {
        const count = validator.extractCount('画一只猫');
        expect(count).toBeNull();
      }
    });
  });
});
