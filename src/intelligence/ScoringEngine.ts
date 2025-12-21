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
    const currentState = context.stats.systemStatus.current_state;
    
    // 1. STATE MASKS (The "Hard Constraints")
    const allowedStimuli: Record<string, boolean> = {
        'OVERLOAD': true,
        'MAINTENANCE': true,
        'FLUSH': true,
        'TEST': true
    };

    switch (currentState) {
        case 'RECOVERY_MODE':
        case 'PHYSICAL_STRAIN':
            allowedStimuli['OVERLOAD'] = false;
            allowedStimuli['TEST'] = false;
            allowedStimuli['MAINTENANCE'] = false; // Forced Recovery
            break;
        case 'HIGH_STRAIN':
            allowedStimuli['OVERLOAD'] = false;
            allowedStimuli['TEST'] = false;
            break;
        case 'NEEDS_STIMULATION':
            allowedStimuli['FLUSH'] = false; // Do not rest when undertrained
            break;
        // READY_FOR_LOAD and BUILDING_CAPACITY allow all
    }

    const candidates: DirectiveCandidate[] = [];

    // 2. SCORING (The "Soft Preferences")
    if (allowedStimuli['OVERLOAD']) candidates.push(this.scoreOverload(context));
    if (allowedStimuli['MAINTENANCE']) candidates.push(this.scoreMaintenance(context));
    if (allowedStimuli['FLUSH']) candidates.push(this.scoreFlush(context));
    // TEST logic usually reserved for specific block phases, skipping for MVP daily logic unless explicit

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Fallback if empty (shouldn't happen with thorough masks)
    if (candidates.length === 0) {
        candidates.push(this.scoreFlush(context)); // Fail-safe
    }

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
   * Bonus: High Vitality, Good Sleep, Low recent load density.
   */
  private static scoreOverload(ctx: OperatorDailyStats): DirectiveCandidate {
    let score = 0.5; 
    const vitality = ctx.stats.vitality / 100;
    const loadDensity = ctx.stats.loadDensity || 0;
    
    // State-based Bias
    if (ctx.stats.systemStatus.current_state === 'READY_FOR_LOAD') score += 0.3;
    if (ctx.stats.systemStatus.current_state === 'NEEDS_STIMULATION') score += 0.4;

    // Density Check (Accumulated Fatigue)
    // Assuming normal load per day is ~500. 3 days = 1500.
    if (loadDensity > 2000) score -= 0.3; // High accumulated load
    if (loadDensity < 1000) score += 0.1; // Fresh

    // Biometric Constraints
    if (ctx.biometrics.hrv < (ctx.stats.biometric_trends?.hrv.baseline || 50)) score -= 0.2;
    if (ctx.biometrics.stress?.time_elevated_pct && ctx.biometrics.stress.time_elevated_pct > 40) score -= 0.2;

    score = Math.max(0, Math.min(1, score));

    return {
      category: 'STRENGTH', 
      stimulus: 'OVERLOAD',
      score,
      reason: `State: ${ctx.stats.systemStatus.current_state}, Density: ${loadDensity}`
    };
  }

  /**
   * MAINTENANCE: The Safe Zone.
   * Good for 'Building Capacity' or 'High Strain' (if allowed).
   */
  private static scoreMaintenance(ctx: OperatorDailyStats): DirectiveCandidate {
    let score = 0.4;
    
    if (ctx.stats.systemStatus.current_state === 'BUILDING_CAPACITY') score += 0.4;
    
    // If stress is high, maintenance > overload
    if (ctx.biometrics.stress?.time_elevated_pct && ctx.biometrics.stress.time_elevated_pct > 30) score += 0.2;

    score = Math.max(0, Math.min(1, score));

    return {
      category: 'ENDURANCE', 
      stimulus: 'MAINTENANCE',
      score,
      reason: `Capacity building focus`
    };
  }

  /**
   * FLUSH: Recovery.
   * Dominates in Strain/Recovery modes.
   */
  private static scoreFlush(ctx: OperatorDailyStats): DirectiveCandidate {
    let score = 0.2;
    const state = ctx.stats.systemStatus.current_state;

    if (state === 'RECOVERY_MODE' || state === 'PHYSICAL_STRAIN') score = 1.0; // Forced win if not masked
    if (state === 'HIGH_STRAIN') score += 0.6;
    
    // Auto-Flush on super high density
    if ((ctx.stats.loadDensity || 0) > 2500) score += 0.5;

    score = Math.max(0, Math.min(1, score));

    return {
      category: 'REGULATION',
      stimulus: 'FLUSH',
      score,
      reason: `System Protection (${state})`
    };
  }

  // --- GUARDRAILS ---

  private static generateSafetyConstraints(ctx: OperatorDailyStats): { maxLoad: number; allowedTypes: string[] } {
    const state = ctx.stats.systemStatus.current_state;
    
    if (state === 'RECOVERY_MODE' || state === 'PHYSICAL_STRAIN') {
       return { maxLoad: 3, allowedTypes: ['YOGA', 'WALKING', 'MOBILITY', 'MEDITATION'] };
    }
    if (state === 'HIGH_STRAIN') {
       return { maxLoad: 5, allowedTypes: ['RUNNING', 'CYCLING', 'YOGA', 'SWIMMING'] };
    }
    
    return { maxLoad: 10, allowedTypes: ['ALL'] };
  }
}
