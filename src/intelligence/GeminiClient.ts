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
    const fallback = Analyst.generateFallbackInsight(stats, tier1Directive);

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
      if (Analyst.validateResponse(parsed.rationale, parsed.specific_advice)) {
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
}
