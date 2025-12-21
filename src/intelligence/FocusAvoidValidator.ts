/**
 * PRD §3.4.1.1: Validation Pipeline for LLM-Generated Content
 * 
 * Enforces strict constraints on sessionFocus, avoidCue, and analystInsight
 * to prevent drift, jargon, and invented facts.
 */

type Category = 'STRENGTH' | 'ENDURANCE' | 'NEURAL' | 'REGULATION';
type StimulusType = 'OVERLOAD' | 'MAINTENANCE' | 'FLUSH' | 'TEST';

interface Directive {
  category: Category;
  stimulus_type: StimulusType;
}

interface Constraints {
  allow_impact: boolean;
  heart_rate_cap?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  retryable: boolean;
}

/**
 * Banned terms that indicate jargon, corporate speak, or robotic language
 */
const BANNED_TERMS = [
  'execute',
  'protocol',
  'briefing',
  'mission',
  'maximize',
  'absolutely',
  'ensure',
  'optimal',
  'optimize',
  'leverage',
  'utilize',
  'implement',
  'deploy',
  'strategic',  // when used as jargon
  'tactical',   // when used as jargon (allowed in "tactical cue" context)
  'synergy',
  'paradigm',
  'holistic',
  'ecosystem',
  'bandwidth',
  'circle back',
  'touch base',
  'deep dive',
  'low-hanging fruit',
  'move the needle',
  'think outside the box'
];

/**
 * Intensity-related terms that should not appear in recovery/flush contexts
 */
const INTENSITY_TERMS = [
  'max',
  'maximum',
  'hard',
  'intense',
  'push',
  'drive',
  'aggressive',
  'explosive',
  'all-out',
  'failure'
];

export class FocusAvoidValidator {
  
  /**
   * Validate sessionFocus field
   */
  static validateSessionFocus(text: string, directive: Directive): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Length validation
    if (!text || text.trim().length === 0) {
      errors.push('sessionFocus cannot be empty');
    } else if (text.length > 160) {
      errors.push(`sessionFocus too long (${text.length} chars, max 160)`);
    }

    // Banned terms check
    const lowerText = text.toLowerCase();
    for (const term of BANNED_TERMS) {
      if (lowerText.includes(term.toLowerCase())) {
        errors.push(`sessionFocus contains banned term: "${term}"`);
      }
    }

    // Directive consistency check
    if (directive.stimulus_type === 'FLUSH') {
      for (const term of INTENSITY_TERMS) {
        if (lowerText.includes(term.toLowerCase())) {
          errors.push(`sessionFocus for FLUSH should not contain intensity term: "${term}"`);
        }
      }
    }

    // Check for overly prescriptive language
    if (lowerText.includes('must') || lowerText.includes('should') || lowerText.includes('need to')) {
      warnings.push('sessionFocus uses prescriptive language—prefer suggestive framing');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      retryable: true
    };
  }

  /**
   * Validate avoidCue field
   */
  static validateAvoidCue(
    text: string,
    directive: Directive,
    constraints: Constraints
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Length validation
    if (!text || text.trim().length === 0) {
      errors.push('avoidCue cannot be empty');
    } else if (text.length > 120) {
      errors.push(`avoidCue too long (${text.length} chars, max 120)`);
    }

    // Banned terms check
    const lowerText = text.toLowerCase();
    for (const term of BANNED_TERMS) {
      if (lowerText.includes(term.toLowerCase())) {
        errors.push(`avoidCue contains banned term: "${term}"`);
      }
    }

    // Constraint compliance check
    if (!constraints.allow_impact) {
      const impactTerms = ['jump', 'impact', 'plyometric', 'explosive', 'bound'];
      const hasImpactTerm = impactTerms.some(term => lowerText.includes(term));
      
      if (hasImpactTerm && !lowerText.includes('avoid') && !lowerText.includes('no')) {
        errors.push('avoidCue should explicitly warn against impact when impact is disallowed');
      }
    }

    // Directive consistency check
    if (directive.category === 'ENDURANCE' && directive.stimulus_type === 'MAINTENANCE') {
      if (lowerText.includes('strength') || lowerText.includes('heavy')) {
        errors.push('avoidCue for endurance maintenance should not suggest strength work');
      }
    }

    if (directive.stimulus_type === 'FLUSH') {
      const hasIntensityWarning = INTENSITY_TERMS.some(term => lowerText.includes(term.toLowerCase()));
      if (!hasIntensityWarning) {
        warnings.push('avoidCue for FLUSH should explicitly warn against intensity');
      }
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
   */
  static validateAnalystInsight(
    insight: { summary: string; detail?: string },
    evidenceSummary: string[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Summary validation
    if (!insight.summary || insight.summary.trim().length === 0) {
      errors.push('analystInsight.summary cannot be empty');
    } else if (insight.summary.length > 300) {
      errors.push(`analystInsight.summary too long (${insight.summary.length} chars, max 300)`);
    }

    // Detail validation (optional)
    if (insight.detail && insight.detail.length > 800) {
      errors.push(`analystInsight.detail too long (${insight.detail.length} chars, max 800)`);
    }

    // Banned terms check
    const fullText = (insight.summary + ' ' + (insight.detail || '')).toLowerCase();
    for (const term of BANNED_TERMS) {
      if (fullText.includes(term.toLowerCase())) {
        errors.push(`analystInsight contains banned term: "${term}"`);
      }
    }

    // Evidence grounding check
    if (evidenceSummary && evidenceSummary.length > 0) {
      // Check if insight references at least one evidence bullet
      const hasEvidenceReference = evidenceSummary.some(evidence => {
        const evidenceKeywords = evidence.toLowerCase().split(' ').filter(w => w.length > 4);
        return evidenceKeywords.some(keyword => fullText.includes(keyword));
      });

      if (!hasEvidenceReference) {
        warnings.push('analystInsight should reference at least one evidence bullet');
      }
    }

    // Check for invented facts (common patterns)
    const inventedFactPatterns = [
      /\d+% (increase|decrease|improvement)/i,  // Specific percentages not in evidence
      /exactly \d+/i,                            // Overly precise claims
      /studies show/i,                           // External references
      /research indicates/i,                     // External references
      /proven to/i                               // Absolute claims
    ];

    for (const pattern of inventedFactPatterns) {
      if (pattern.test(fullText)) {
        warnings.push(`analystInsight may contain invented facts: ${pattern.source}`);
      }
    }

    // Check for jargon
    const jargonTerms = ['homeostasis', 'allostatic', 'sympathetic dominance', 'parasympathetic activation'];
    const hasJargon = jargonTerms.some(term => fullText.includes(term.toLowerCase()));
    
    if (hasJargon) {
      warnings.push('analystInsight contains technical jargon—prefer plain language');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      retryable: true
    };
  }

  /**
   * Validate complete LLM response
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
    const insightResult = this.validateAnalystInsight(response.analystInsight, evidenceSummary);

    const allErrors = [
      ...focusResult.errors,
      ...avoidResult.errors,
      ...insightResult.errors
    ];

    const allWarnings = [
      ...focusResult.warnings,
      ...avoidResult.warnings,
      ...insightResult.warnings
    ];

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      retryable: focusResult.retryable && avoidResult.retryable && insightResult.retryable
    };
  }

  /**
   * Check if validation errors are critical (non-retryable)
   */
  static isCriticalFailure(result: ValidationResult): boolean {
    const criticalPatterns = [
      'cannot be empty',
      'too long',
      'banned term'
    ];

    return result.errors.some(error =>
      criticalPatterns.some(pattern => error.includes(pattern))
    );
  }
}
