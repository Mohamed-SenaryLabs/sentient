import { OperatorDailyStats, DailyDirective } from '../data/schema';

/**
 * TIER 1: UTILITY SCORING ENGINE (The Guardrails)
 * -----------------------------------------------
 * This engine uses deterministic math (Utility AI) to calculate the
 * "Safe Bounds" and "Recommended Strategy" for the day.
 * 
 * It is NOT an LLM. It is 100% predictable code.
 */

// Normalized Score: 0.0 (Reject) to 1.0 (Must Do)
type UtilityScore = number;

interface DirectiveCandidate {
  category: 'STRENGTH' | 'ENDURANCE' | 'NEURAL' | 'REGULATION';
  stimulus: 'OVERLOAD' | 'MAINTENANCE' | 'FLUSH' | 'TEST';
  score: UtilityScore;
  reason: string;
}

export class ScoringEngine {
  
  /**
   * Main Entry Point: Evaluates all possible directives and returns the ranked list.
   * Also returns a hard boolean "Safety Mask" for what is allowed.
   */
  static evaluate(context: OperatorDailyStats): { 
    rankedDirectives: DirectiveCandidate[];
    rankingAnalysis: {
        winner: DirectiveCandidate;
        runnerUp: DirectiveCandidate;
        rejected: string[];
    };
    safetyConstraint: {
      maxLoad: number; // 0-10
      allowedTypes: string[];
    };
  } {
    const candidates: DirectiveCandidate[] = [
      this.scoreOverload(context),
      this.scoreMaintenance(context),
      this.scoreFlush(context)
    ];

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    return {
      rankedDirectives: candidates,
      rankingAnalysis: {
          winner: candidates[0],
          runnerUp: candidates[1],
          rejected: candidates.slice(1).map(c => `${c.category} (Score: ${c.score.toFixed(2)}) rejected due to: ${c.reason}`)
      },
      safetyConstraint: this.generateSafetyConstraints(context)
    };
  }

  // --- SCORERS ---

  /**
   * OVERLOAD: High Stimulus. Requires surplus resources.
   * Bonus: High Vitality, Good Sleep.
   * Penalty: High recent strain, low sleep.
   */
  private static scoreOverload(ctx: OperatorDailyStats): DirectiveCandidate {
    let score = 0.3; // Base probability (lower - easy to disqualify)
    const vitality = ctx.stats.vitality / 100; // 0.0 - 1.0
    const sleepScore = ctx.sleep.score / 100;

    // Bonuses
    if (vitality > 0.8) score += 0.4;
    else if (vitality > 0.6) score += 0.2;

    if (sleepScore > 0.8) score += 0.2;

    // Penalties (Hard Checks)
    if (vitality < 0.5) score -= 0.5; // Too weak
    if (sleepScore < 0.5) score -= 0.3; // Too tired

    // Clamp
    score = Math.max(0, Math.min(1, score));

    return {
      category: 'STRENGTH', // Default archetype for overload
      stimulus: 'OVERLOAD',
      score,
      reason: `Vitality ${vitality.toFixed(1)}, Sleep: ${sleepScore.toFixed(1)}`
    };
  }

  /**
   * MAINTENANCE: The Safe Zone.
   * Wins when user is 'Okay' but not 'Great'.
   */
  private static scoreMaintenance(ctx: OperatorDailyStats): DirectiveCandidate {
    let score = 0.5; // Base probability (The standard)
    const vitality = ctx.stats.vitality / 100;
    
    // Stable zone
    if (vitality > 0.4 && vitality < 0.8) score += 0.3;

    // Penalties
    if (vitality < 0.3) score -= 0.2; // Should flush
    if (vitality > 0.9) score -= 0.2; // Waste of potential

    score = Math.max(0, Math.min(1, score));

    return {
      category: 'ENDURANCE', // Default archetype for maintenance
      stimulus: 'MAINTENANCE',
      score,
      reason: `Vitality in middle band (${vitality.toFixed(1)})`
    };
  }

  /**
   * FLUSH: Recovery / Regulation.
   * Wins when system is failing.
   */
  private static scoreFlush(ctx: OperatorDailyStats): DirectiveCandidate {
    let score = 0.2; // Base
    const vitality = ctx.stats.vitality / 100;
    const load = ctx.activity.workouts.length > 0 ? 1 : 0; // Simple check for now

    // Crisis management
    if (vitality < 0.4) score += 0.6; // Critical need
    if (vitality < 0.6) score += 0.2;

    // If super high vitality, hate this option
    if (vitality > 0.8) score -= 0.8;

    score = Math.max(0, Math.min(1, score));

    return {
      category: 'REGULATION',
      stimulus: 'FLUSH',
      score,
      reason: `System needs repair state (Vit: ${vitality.toFixed(1)})`
    };
  }

  // --- GUARDRAILS ---

  private static generateSafetyConstraints(ctx: OperatorDailyStats): { maxLoad: number; allowedTypes: string[] } {
    const vitality = ctx.stats.vitality;
    
    if (vitality < 30) {
      return { maxLoad: 3, allowedTypes: ['YOGA', 'WALKING', 'MOBILITY', 'MEDITATION'] };
    }
    if (vitality < 60) {
      return { maxLoad: 6, allowedTypes: ['RUNNING', 'CYCLING', 'LIFTING', 'SWIMMING', 'ROWING', 'YOGA'] };
    }
    
    return { maxLoad: 10, allowedTypes: ['ALL'] }; // No restrictions
  }
}
