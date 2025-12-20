import { OperatorDailyStats } from '../data/schema';
import { WORKOUT_LIBRARY } from '../data/WorkoutLibrary';

/**
 * The Analyst (Intelligence Layer)
 * 
 * Responsible for:
 * 1. Defining the AI Persona & Tone
 * 2. Constructing the Context (Mission Briefing)
 * 3. Selecting relevant Knowledge (Workout Library)
 * 4. Formatting the Prompt for the LLM
 */
export class Analyst {

  private static SYSTEM_PROMPT = `
  IDENTITY: You are the SENTIENT ANALYST.
  ROLE: The Narrator & Translator.
  VOICE: Elite Performance Physiologist.
  
  ARCHITECTURE:
  - The PLANNER (Layer 1) is the Architect. It has decided the Strategy (Directive) based on rigorous math.
  - YOU (Layer 2) are the Narrator. You do NOT decide the strategy. You explain *WHY* the Planner made that choice.
  
  CORE DIRECTIVE:
  Translate the raw biometrics and the hard Directive into a cohesive, human narrative.
  
  STYLE GUIDE:
  - **Explain the Trade-off:** "We are prioritizing recovery because your nervous system is saturated."
  - **Context-Aware:** Reference specific data points (e.g. "HRV is down 10%").
  - **No Robot-Speak:** Do not say "Based on the data". Just speak the insight.
  `;

  /**
   * Composes the full prompt package (System + User) for a Daily Briefing
   */
  static composeBriefing(
    stats: OperatorDailyStats, 
    tier1Directive: { 
      category: string; 
      stimulus: string; 
      reason: string;
      technical_trace?: {
          winner_score: number;
          rejected_alternatives: string[];
          constraints: string[];
      }
    }
  ): { system: string; user: string } {

    // 1. Filter Library for Context
    const lens = stats.stats.systemStatus.active_lens.toUpperCase();
    
    const relevantRoutines = WORKOUT_LIBRARY.filter(r => 
        r.category === tier1Directive.category && 
        (r.archetypes.includes('ALL') || r.archetypes.includes(lens) || r.archetypes.includes('OPERATOR'))
    ).slice(0, 5); // Take top 5 matching

    // 2. Format Workouts for Causal Analysis
    // We look at the last 24h of workouts to give context for fatigue/recovery
    const recentWorkouts = stats.activity.workouts.length > 0
        ? stats.activity.workouts.map(w => `${w.type} (${Math.round(w.durationSeconds/60)}min)`).join(', ')
        : "No distinct sessions recorded recently";

    // 3. Construct The Mission Briefing Payload
    const payload = `
    [MISSION BRIEFING DATA]
    >> Current Time: ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
    >> Operator State: ${stats.stats.systemStatus.current_state}
    >> Vitality: ${Math.round(stats.stats.vitality)}% (Homeostatic Integrity)
    >> Sleep: ${stats.sleep.score} Score (${Math.round(stats.sleep.totalDurationSeconds/60)}m Total)
    >> Recent Activity: ${recentWorkouts}
    
    [DIRECTIVE]
    >> Protocol: ${tier1Directive.category} // ${tier1Directive.stimulus}
    >> Technical Reason: ${tier1Directive.reason}
    >> Archetype Lens: ${lens}

    [THE LOGIC TRACE]
    >> Winner Score: ${tier1Directive.technical_trace?.winner_score.toFixed(2) || 'N/A'}
    >> Rejected Alternatives: 
    ${tier1Directive.technical_trace?.rejected_alternatives.map(a => `   - ${a}`).join('\n') || 'None'}
    >> Hard Constraints: ${tier1Directive.technical_trace?.constraints.join(', ') || 'None'}

    [AVAILABLE TACTICS (ROUTINE LIBRARY)]
    ${relevantRoutines.map(r => `> [${r.title}] ${r.subtitle}: ${r.description}`).join('\n')}

    [OBJECTIVES]
    1. TRANSLATE: The Planner has issued a Directive. You must explain WHY this specific biological state requires this specific protocol.
    2. JUSTIFY: You MUST reference the tension between metrics (e.g. "HRV is high, BUT Sleep is low").
    3. EXECUTE: Select the best routine.

    [OUTPUT FORMAT JSON]
    {
      "rationale": "STRICTLY PHYSIOLOGICAL REASONING. Do NOT give coaching cues here. Explain the trade-off. (e.g. 'Neural drive is preserved (HRV 74ms), but sleep debt is critical (5h), so we prioritize low-rep intensity to stimulate the CNS without draining metabolic reserves.')",
      "specific_advice": "The Tactical Cue. (e.g. 'Focus on controlled eccentrics.')",
      "session": {
        "title": "...",
        "subtitle": "...",
        "instructions": "...",
        "type": "DURATION", 
        "target_value": 30
      }
    }
    `;

    return {
        system: this.SYSTEM_PROMPT,
        user: payload
    };
  }
}
