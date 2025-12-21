import { OperatorDailyStats, AnalystInsight } from '../data/schema';
import { WORKOUT_LIBRARY } from '../data/WorkoutLibrary';
import { FocusAvoidValidator } from './FocusAvoidValidator';
import { FocusAvoidTemplates } from './FocusAvoidTemplates';
import { GeminiClient } from './GeminiClient';

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
    
    // Prepare fallback
    const fallback = FocusAvoidTemplates.getTemplate(
      directive.category as any,
      directive.stimulus_type as any,
      { source: 'FALLBACK', reason: ['LLM generation failed'] }
    );

    // Check if Gemini is available
    if (!GeminiClient.isAvailable()) {
      console.log('[Analyst] Gemini API not available, using fallback');
      return fallback;
    }

    // Build prompt
    const systemPrompt = this.buildFocusAvoidSystemPrompt();
    const userPrompt = this.buildFocusAvoidUserPrompt(stats, directive, constraints, evidenceSummary);

    // Define response type
    interface LLMResponse {
      sessionFocus: string;
      avoidCue: string;
      analystInsight: {
        summary: string;
        detail?: string;
      };
    }

    // Validator function
    const validator = (data: LLMResponse): boolean => {
      const result = FocusAvoidValidator.validateComplete(
        {
          sessionFocus: data.sessionFocus,
          avoidCue: data.avoidCue,
          analystInsight: data.analystInsight
        },
        directive as any,
        constraints,
        evidenceSummary
      );
      
      if (!result.valid) {
        console.warn('[Analyst] Validation failed:', result.errors);
      }
      
      return result.valid;
    };

    // Validator that captures errors for retry feedback
    let lastValidationErrors: string[] = [];
    const validatorWithErrorCapture = (data: LLMResponse): boolean => {
      const result = FocusAvoidValidator.validateComplete(
        {
          sessionFocus: data.sessionFocus,
          avoidCue: data.avoidCue,
          analystInsight: data.analystInsight
        },
        directive as any,
        constraints,
        evidenceSummary
      );
      
      lastValidationErrors = result.errors;
      
      if (!result.valid) {
        console.warn('[Analyst] Validation failed:', result.errors);
      }
      
      return result.valid;
    };

    // Attempt LLM generation with retry
    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      attempt++;
      
      // On retry, append validation errors to user prompt with repair instructions
      const promptToUse = attempt === 1 
        ? userPrompt 
        : `${userPrompt}

⚠️ REPAIR INSTRUCTIONS:
Rewrite the JSON. Fix only these issues:
${lastValidationErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Keep the meaning the same. Stay calm. No commands. No hype.
Generate corrected JSON output.`;
      
      const response = await GeminiClient.generateJSON<LLMResponse>(
        {
          systemPrompt,
          userPrompt: promptToUse,
          temperature: 0.5, // Balanced temp for variation while maintaining day-stability
          maxTokens: 1024
        },
        validatorWithErrorCapture
      );

      if (response.success && response.data) {
        console.log('[Analyst] LLM generation successful');
        return {
          sessionFocus: response.data.sessionFocus,
          avoidCue: response.data.avoidCue,
          analystInsight: {
            summary: response.data.analystInsight.summary,
            detail: response.data.analystInsight.detail,
            generatedAt: new Date().toISOString(),
            source: 'LLM',
            validationPassed: true,
            retryCount: attempt - 1
          },
          source: 'LLM'
        };
      }

      if (attempt < maxAttempts) {
        console.warn(`[Analyst] Attempt ${attempt} failed, retrying with error feedback...`);
      }
    }

    // All attempts failed, use fallback
    console.warn('[Analyst] All LLM attempts failed, using fallback');
    return fallback;
  }

  /**
   * Build system prompt for Focus/Avoid/Insight generation
   * 
   * Prompt-first approach: System prompt is the main safety rail.
   * Validator only checks structure/length/format.
   */
  private static buildFocusAvoidSystemPrompt(): string {
    return `You are Sentient's Performance Intelligence Analyst.

IDENTITY:
- Calm, precise, non-judgmental
- You explain and translate directives—you don't choose them
- Plain language, no physiology jargon, no hype, no commands
- You are a supportive coach, not a drill sergeant or mission commander

FORBIDDEN FRAMING:
- No "orders" language: avoid "execute", "proceed", "commence"
- No "mission/protocol" framing: avoid "mission", "protocol", "briefing", "orders"
- No command tone: avoid imperative commands like "You must", "You will", "Ensure that"
- No hype language: avoid "maximize", "optimal", "absolutely", "guaranteed"

SCOPE:
- The directive is already determined by the system
- Your job: explain it clearly and frame constraints
- Do not introduce new directive types or states
- Do not contradict the provided directive or constraints

VOICE:
- Operator-friendly (like a supportive coach, not a drill sergeant)
- No jargon: avoid "parasympathetic", "vagal", "mitochondrial", "neuromuscular", "metabolic", "anabolic", "hormonal"
- Plain language: use "recovery", "readiness", "fatigue", "coordination" instead

OUTPUT (JSON only):
{
  "sessionFocus": "1 sentence, ≤160 chars, tactical cue for the session",
  "avoidCue": "1 sentence, ≤120 chars, constraint framing (what NOT to do)",
  "analystInsight": {
    "summary": "1-2 sentences, ≤300 chars, complete standalone answer",
    "detail": "optional, ≤1500 chars, expanded context only"
  }
}

AVOID CUE RULE:
- AvoidCue MUST be a guardrail (what not to do), not a "do" instruction
- Frame as constraints: "Avoid...", "Don't...", "Skip...", "No..."
- Example: "Avoid intensity spikes—keep effort conversational" ✓
- NOT: "Keep effort conversational" ✗ (that's a "do" instruction)

INSIGHT STRUCTURE:
- Summary: Must stand alone as the complete answer (shown on Home, collapsed)
- Detail: Optional expansion (shown only when user taps "More context"):
  * Can be longer (up to 1500 chars)
  * Should follow 3-part structure: Why / What it means today / How to succeed
  * Must not introduce new facts—only expand on what's in summary
  * Keep calm, non-coercive tone throughout

HARD BOUNDS:
1. Never contradict constraints (impact restrictions, HR caps)
2. Never use forbidden framing (orders, mission, protocol, commands)
3. Keep FLUSH directives calm (no intensity language)
4. Ground insights in provided evidence bullets only
5. Respect character limits strictly (focus ≤160, avoid ≤120, summary ≤300, detail ≤1500)

TONE EXAMPLES:
✓ "Recovery looks good. Heavy work is appropriate today."
✗ "Execute maximum force output to optimize neuromuscular adaptation."

✓ "Avoid intensity spikes—keep effort conversational."
✗ "Execute low-intensity protocol to maximize parasympathetic recovery."

✓ "Focus is high. Complex skill work builds coordination."
✗ "Neural pathways are primed for optimal motor pattern acquisition."

EXPANDED DETAIL EXAMPLE (Endurance—Maintenance):
Summary: "Capacity is building and load is stable. This keeps your base moving forward without adding extra cost."
Detail: "Today's priority is consistency, not intensity. Keep the effort easy enough to hold a steady pace and speak in full sentences. If breathing gets strained or you feel pulled into surges, back off until the pace feels smooth again. You should finish feeling better than when you started—like you could do more."

Generate JSON only. No explanations, no markdown.`;
  }

  /**
   * Build user prompt with context
   */
  private static buildFocusAvoidUserPrompt(
    stats: OperatorDailyStats,
    directive: { category: string; stimulus_type: string; target_rpe?: number },
    constraints: { allow_impact: boolean; required_equipment: string[]; heart_rate_cap?: number },
    evidenceSummary: string[]
  ): string {
    const evidenceBullets = evidenceSummary.length > 0
      ? evidenceSummary.map((e, i) => `  ${i + 1}. ${e}`).join('\n')
      : '  1. No specific evidence available';

    const constraintsList = [];
    if (!constraints.allow_impact) constraintsList.push('No impact movements');
    if (constraints.heart_rate_cap) constraintsList.push(`HR cap: ${constraints.heart_rate_cap}bpm`);
    if (constraints.required_equipment.length > 0) constraintsList.push(`Equipment: ${constraints.required_equipment.join(', ')}`);

    const stateLabel = stats.stats.systemStatus.current_state;

    return `DIRECTIVE: ${directive.category} — ${directive.stimulus_type}
${directive.target_rpe ? `Target RPE: ${directive.target_rpe}` : ''}

STATE: ${stateLabel}

CONSTRAINTS:
${constraintsList.length > 0 ? constraintsList.map(c => `- ${c}`).join('\n') : '- None'}

EVIDENCE:
${evidenceBullets}

Generate Focus/Avoid/Insight as JSON. Stay calm, plain-language, evidence-grounded.`;
  }
}
