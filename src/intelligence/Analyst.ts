import { OperatorDailyStats, AnalystInsight } from '../data/schema';
import { WORKOUT_LIBRARY } from '../data/WorkoutLibrary';
import { FocusAvoidValidator } from './FocusAvoidValidator';
import { FocusAvoidTemplates } from './FocusAvoidTemplates';

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
    // PRD §4.X.6: Build evidence bullets from computed data
    const evidenceBullets = stats.stats.evidenceSummary?.length 
      ? stats.stats.evidenceSummary.map((e, i) => `  ${i + 1}. ${e}`).join('\n')
      : `  1. Vitality: ${Math.round(stats.stats.vitality)}%\n  2. Sleep: ${Math.round(stats.sleep.totalDurationSeconds / 3600)}h`;

    const context = `
    STATE: ${stats.stats.systemStatus.current_state}
    VITALITY: ${Math.round(stats.stats.vitality)}%
    CONFIDENCE: ${stats.stats.vitalityConfidence || 'HIGH'}
    AVAILABILITY: ${stats.stats.vitalityAvailability || 'AVAILABLE'}
    SLEEP: ${Math.round(stats.sleep.totalDurationSeconds / 60)} min (Score: ${stats.sleep.score})
    LOAD: ${stats.stats.physiologicalLoad}/10
    
    DIRECTIVE: ${tier1Directive.category} // ${tier1Directive.stimulus}
    REASON: ${tier1Directive.reason}
    
    # EVIDENCE (PRD §4.X.6)
    You MUST reference ONLY these evidence bullets in your rationale:
${evidenceBullets}
    `;

    const instructions = `
    Analyze the biometrics and generate the briefing based on the constraints.
    CRITICAL: Your rationale MUST ONLY reference the evidence bullets provided above.
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

  /**
   * QUALITY GATE:
   * Rejects generic, robotic, lazy, or prohibited insights.
   */
  static validateResponse(rationale: string, focus?: string): boolean {
      if (!rationale || rationale.length < 20 || rationale.length > 800) return false;
      if (focus && focus.length > 160) return false;
      
      const forbidden = [
          // Robotic/Generic
          "maintain system alignment", "proceed with directive", "based on the data", "as an ai", "system is primed",
          // Banned Verbs/Nouns (Voice)
          "execute", "protocol", "briefing", "mission", "maximize", "absolutely", "ensure",
          // Banned Jargon
          "myofibrillar", "parasympathetic tone", "potentiation", "homeostasis"
      ];

      const lowerRat = rationale.toLowerCase();
      const lowerFoc = (focus || '').toLowerCase();
      
      if (forbidden.some(phrase => lowerRat.includes(phrase) || lowerFoc.includes(phrase))) {
          console.warn(`Analyst Insight rejected. Contained forbidden phrase.`);
          return false;
      }

      return true;
  }

  /**
   * FALLBACK TEMPLATE (Product-Safe Defaults):
   * Structure: "Vitality is [Qualitative], but [Constraint] is present. We choose [Strategy] to [Outcome]."
   */
  static generateFallbackInsight(stats: OperatorDailyStats, directive: any) {
      const v = stats.stats.vitality;
      const sleepScore = stats.sleep.score;
      const load = stats.stats.physiologicalLoad;

      let vitalityState = "moderate";
      if (v > 80) vitalityState = "strong";
      else if (v < 40) vitalityState = "compromised";

      let constraint = "recovery is stable";
      if (sleepScore < 70) constraint = "sleep is short";
      else if (load > 6) constraint = "systemic load is high";
      else if (stats.stats.biometric_trends?.rhr?.trend === 'RISING') constraint = "recovery is trending down";

      // Director logic
      const strategyMap: Record<string, string> = {
          'STRENGTH': 'a focused strength stimulus',
          'ENDURANCE': 'steady aerobic work',
          'NEURAL': 'high-precision output',
          'REGULATION': 'active restoration'
      };

      const outcomeMap: Record<string, string> = {
           'STRENGTH': 'drive adaptation without adding unnecessary fatigue',
           'ENDURANCE': 'maintain capacity while protecting reserves',
           'NEURAL': 'stimulate the CNS without metabolic cost',
           'REGULATION': 'reset the nervous system'
      };
      
      const rationale = `Vitality is ${vitalityState}, but ${constraint}. We’re using ${strategyMap[directive.category] || 'a calibrated stimulus'} to ${outcomeMap[directive.category] || 'ensure progress'}.`;

      // Fallback Focus Cues (Banned word safe)
      const focusMap: Record<string, string> = {
          'STRENGTH': 'Crisp reps, long rests—stop before form degrades.',
          'ENDURANCE': 'Steady pace. Keep heart rate stable.',
          'NEURAL': 'Fast, crisp, perfect. Quality over quantity.',
          'REGULATION': 'Breathe deep. Disconnect.'
      };

      const avoidMap: Record<string, string> = {
          'STRENGTH': 'Glycolytic burnout—keep reps low; maintain quality.',
          'ENDURANCE': 'Drifting into Zone 4/5.',
          'NEURAL': 'Grinding out reps.',
          'REGULATION': 'Stressful environments.'
      };
      
      return {
          rationale,
          specific_advice: focusMap[directive.category] || 'Focus on quality.',
          avoid_cue: avoidMap[directive.category] || 'Avoid overexertion.',
          session: undefined 
      };
  }

  /**
   * PRD §3.4.1.1: Generate Focus/Avoid/Insight with LLM + Validation + Fallback
   * 
   * This method:
   * 1. Attempts LLM generation with strict input constraints
   * 2. Validates output against banned terms, length limits, and consistency rules
   * 3. Retries once if validation fails
   * 4. Falls back to deterministic templates if retry also fails
   * 
   * @returns Validated Focus/Avoid/Insight with source metadata
   */
  static async generateFocusAvoidInsight(
    stats: OperatorDailyStats,
    directive: { category: string; stimulus_type: string; target_rpe?: number },
    constraints: { allow_impact: boolean; required_equipment: string[]; heart_rate_cap?: number },
    evidenceSummary: string[]
  ): Promise<{
    sessionFocus: string;
    avoidCue: string;
    analystInsight: AnalystInsight;
    source: 'LLM' | 'FALLBACK';
  }> {
    
    // For now, use fallback templates directly
    // TODO: Integrate actual LLM call when Gemini integration is ready
    console.log('[Analyst] generateFocusAvoidInsight: Using fallback templates (LLM integration pending)');
    
    const template = FocusAvoidTemplates.getTemplate(
      directive.category as any,
      directive.stimulus_type as any,
      { source: 'FALLBACK', reason: ['LLM integration pending'] }
    );

    return template;
  }
}
