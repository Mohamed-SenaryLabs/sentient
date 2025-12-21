import { Directive, Constraints } from '../data/schema';

/**
 * Validation result structure
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  retryable?: boolean;
}

/**
 * FocusAvoidValidator
 * 
 * STRUCTURE-ONLY VALIDATION (Prompt-first approach)
 * 
 * This validator checks ONLY:
 * - JSON parse success
 * - Required fields exist and are strings
 * - Length caps
 * - Optional formatting (e.g., avoidCue should be constraint-framed)
 * 
 * The system prompt is the main safety rail for:
 * - Tone (calm, non-judgmental)
 * - Language (no jargon, no commands, no hype)
 * - Content quality (evidence-grounded, directive-consistent)
 */
export class FocusAvoidValidator {
  
  /**
   * Validate sessionFocus field
   * Structure-only: required, string, length cap
   */
  static validateSessionFocus(text: string, directive: Directive): ValidationResult {
    const errors: string[] = [];

    if (!text || text.trim().length === 0) {
      errors.push('sessionFocus cannot be empty');
    } else if (text.length > 160) {
      errors.push(`sessionFocus exceeds 160 chars (${text.length})`);
    }

    return {
      valid: errors.length === 0,
      errors,
      retryable: true
    };
  }

  /**
   * Validate avoidCue field
   * Structure-only: required, string, length cap
   * Optional formatting: prefer constraint-framed ("Avoid...")
   */
  static validateAvoidCue(text: string, directive: Directive, constraints: Constraints): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!text || text.trim().length === 0) {
      errors.push('avoidCue cannot be empty');
    } else if (text.length > 120) {
      errors.push(`avoidCue exceeds 120 chars (${text.length})`);
    }

    // Optional formatting check: avoidCue should be constraint-framed
    if (text && !text.toLowerCase().includes('avoid') && !text.toLowerCase().includes('don\'t')) {
      warnings.push('avoidCue should be constraint-framed (prefer "Avoid..." or "Don\'t...")');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      retryable: true
    };
  }

  /**
   * Validate analystInsight field
   * Structure-only: required summary, optional detail, length caps
   */
  static validateAnalystInsight(
    insight: { summary: string; detail?: string },
    evidenceSummary: string[],
    directive: Directive,
    constraints: Constraints
  ): ValidationResult {
    const errors: string[] = [];

    // Summary: required, length cap
    if (!insight.summary || insight.summary.trim().length === 0) {
      errors.push('analystInsight.summary cannot be empty');
    } else if (insight.summary.length > 300) {
      errors.push(`analystInsight.summary exceeds 300 chars (${insight.summary.length})`);
    }

    // Detail: optional, length cap
    if (insight.detail && insight.detail.length > 1500) {
      errors.push(`analystInsight.detail exceeds 1500 chars (${insight.detail.length})`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate complete Focus/Avoid/Insight response
   * Structure-only: all fields present and valid
   */
  static validateComplete(
    response: {
      sessionFocus: string;
      avoidCue: string;
      analystInsight: { summary: string; detail?: string };
    },
    directive: Directive,
    constraints: Constraints,
    evidenceSummary: string[]
  ): ValidationResult {
    const focusResult = this.validateSessionFocus(response.sessionFocus, directive);
    const avoidResult = this.validateAvoidCue(response.avoidCue, directive, constraints);
    const insightResult = this.validateAnalystInsight(response.analystInsight, evidenceSummary, directive, constraints);

    const allErrors = [
      ...focusResult.errors,
      ...avoidResult.errors,
      ...insightResult.errors
    ];

    const allWarnings = [
      ...(focusResult.warnings || []),
      ...(avoidResult.warnings || []),
      ...(insightResult.warnings || [])
    ];

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      retryable: true
    };
  }

  /**
   * Check if validation failure is critical (non-retryable)
   * For structure-only validation, most failures are retryable
   */
  static isCriticalFailure(result: ValidationResult): boolean {
    // All structural failures are retryable
    return false;
  }
}
