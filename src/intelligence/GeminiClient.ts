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
    session?: {
        title: string;
        subtitle: string;
        instructions: string;
        type: 'DURATION' | 'CALORIES' | 'STEPS' | 'HEART_RATE';
        target_value: number;
    }
  }> {
    
    if (!isApiKeyAvailable()) {
      console.warn('Gemini API Key missing. Returning fallback.');
      return {
        rationale: tier1Directive.reason,
        specific_advice: `Execute ${tier1Directive.stimulus} protocol.`
      };
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
      return JSON.parse(jsonStr);

    } catch (error) {
      console.error('Gemini Consultant Failed:', error);
      return {
        rationale: tier1Directive.reason,
        specific_advice: `Standard ${tier1Directive.stimulus} Protocol.`
      };
    }
  }
}
