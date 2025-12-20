import { GoogleGenerativeAI } from '@google/generative-ai';
import { OperatorDailyStats } from '../data/schema';
import { GEMINI_API_KEY, GEMINI_MODEL, isApiKeyAvailable } from '../config/gemini';
import { Analyst } from './Analyst';

export class GeminiClient {
  private static genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  private static model = GeminiClient.genAI.getGenerativeModel({ model: GEMINI_MODEL });

  static async generateInsight(
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
  ): Promise<{
    rationale: string;
    specific_advice: string;
    avoid_cue?: string;
    session?: {
        title: string;
        subtitle: string;
        instructions: string;
        type: 'DURATION' | 'CALORIES' | 'STEPS' | 'HEART_RATE';
        target_value: number;
    }
  }> {
    
    // Default Fallback Generator (Product Quality Floor)
    const fallback = this.generateFallbackInsight(stats, tier1Directive);

    if (!isApiKeyAvailable()) {
      console.warn('Gemini API Key missing. Returning fallback.');
      return fallback;
    }

    // Delegate Prompt Construction to the Analyst (Intelligence Layer)
    const { system, user } = Analyst.composeBriefing(stats, tier1Directive);

    try {
      const result = await this.model.generateContent([
        system,
        user
      ]);
      
      const response = result.response;
      const text = response.text();
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      // QUALITY GATE
      if (this.validateInsight(parsed.rationale, parsed.specific_advice)) {
          return parsed;
      } else {
          console.warn('Analyst Insight rejected by Quality Gate:', parsed.rationale);
          return fallback;
      }

    } catch (error) {
      console.error('Gemini Consultant Failed:', error);
      return fallback;
    }
  }

  /**
   * QUALITY GATE:
   * Rejects generic, robotic, or lazy insights.
   */
  /**
   * QUALITY GATE:
   * Rejects generic, robotic, lazy, or prohibited insights.
   */
  private static validateInsight(rationale: string, focus?: string): boolean {
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
  private static generateFallbackInsight(stats: OperatorDailyStats, directive: any) {
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
}
