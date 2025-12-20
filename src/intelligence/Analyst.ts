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
  - **Explain the Trade-off:** You MUST explain the biological tension. (e.g. "Recovery is suppressed, but neural drive is high, creating a window for technical work but not metabolic load.")
    # OUTPUT CONSTRAINTS
    1. SESSION_FOCUS (Max 120 chars):
       - A single, crisp tactical cue.
       - Style: Low friction, high clarity.
       - Example: "Crisp reps, long rests—stop before form degrades."
       
    2. AVOID_CUE (Max 120 chars):
       - What to strictly avoid to protect the system.
       - Example: "Glycolytic burnout—keep reps low; maintain quality."
       
    3. ANALYST_INSIGHT (Max 800 chars):
       - PLAIN ENGLISH ONLY. NO JARGON.
       - STRUCTURE: [1-2 Sentence Summary]. [Deep Context Paragraph].
       - The first 2 sentences MUST stand alone as the decision summary.
       - Usage: "Vitality is strong, but sleep is short. We’re using a focused strength stimulus to drive adaptation without adding unnecessary fatigue. Deep Sleep was only 45m (10%) which indicates specifically neural recovery is incomplete, so we are avoiding high-coordination complexity."

    # INPUT DATA
    `;

  /**
   * Composes the full prompt package (System + User) for a Daily Briefing
   */
  static composeBriefing(stats: OperatorDailyStats, tier1Directive: any) {
    const context = `
    STATE: ${stats.stats.systemStatus.current_state}
    VITALITY: ${Math.round(stats.stats.vitality)}%
    SLEEP: ${Math.round(stats.sleep.totalDurationSeconds / 60)} min (Score: ${stats.sleep.score})
    LOAD: ${stats.stats.physiologicalLoad}/10
    
    DIRECTIVE: ${tier1Directive.category} // ${tier1Directive.stimulus}
    REASON: ${tier1Directive.reason}
    `;

    const instructions = `
    Analyze the biometrics and generate the briefing based on the constraints.
    Return JSON ONLY.
    {
      "rationale": "The Trade-Off Analysis. STRUCTURE: Start with a 1-2 sentence summary. Then optionally add deep context. DO NOT include tactical commands.",
      "specific_advice": "The Tactical Focus Cue.",
      "avoid_cue": "The Risk Constraint.",
      "session": {
        "title": "Optional Override Title",
        "subtitle": "Optional Override Subtitle",
        "instructions": "Optional Override Instructions",
        "type": "DURATION", 
        "target_value": 30
      }
    }
    `;

    return { 
        system: this.SYSTEM_PROMPT, 
        user: context + instructions 
    };
  }
}
