/**
 * Prompt Validator Implementation
 *
 * Detects and prevents duplicate count declarations in prompts
 * when auto-appending "一共N张图".
 */

/**
 * Regex patterns for count detection
 */
const COUNT_PATTERNS = {
  FULL_PATTERN: /一共\s*(\d+)\s*张图?/,
  SHORT_PATTERN: /共\s*(\d+)\s*张/,
  TOTAL_PATTERN: /总共\s*(\d+)\s*张/,
  GENERIC_PATTERN: /(\d+)\s*张图/
};

export class PromptValidator {
  /**
   * Check if prompt already contains a count declaration
   */
  hasCountDeclaration(prompt: string): boolean {
    return (
      COUNT_PATTERNS.FULL_PATTERN.test(prompt) ||
      COUNT_PATTERNS.SHORT_PATTERN.test(prompt) ||
      COUNT_PATTERNS.TOTAL_PATTERN.test(prompt) ||
      COUNT_PATTERNS.GENERIC_PATTERN.test(prompt)
    );
  }

  /**
   * Safely append count to prompt, avoiding duplicates
   */
  appendCountIfMissing(prompt: string, count: number): string {
    if (this.hasCountDeclaration(prompt)) {
      return prompt;
    }

    // Handle empty or whitespace-only prompts
    const trimmed = prompt.trim();
    if (trimmed.length === 0) {
      return `一共${count}张图`;
    }

    return `${prompt}，一共${count}张图`;
  }

  /**
   * Extract declared count from prompt (optional enhancement)
   */
  extractCount(prompt: string): number | null {
    // Try each pattern in order of specificity
    let match = prompt.match(COUNT_PATTERNS.FULL_PATTERN);
    if (match) return parseInt(match[1], 10);

    match = prompt.match(COUNT_PATTERNS.SHORT_PATTERN);
    if (match) return parseInt(match[1], 10);

    match = prompt.match(COUNT_PATTERNS.TOTAL_PATTERN);
    if (match) return parseInt(match[1], 10);

    match = prompt.match(COUNT_PATTERNS.GENERIC_PATTERN);
    if (match) return parseInt(match[1], 10);

    return null;
  }
}

// Export singleton instance
export const promptValidator = new PromptValidator();
