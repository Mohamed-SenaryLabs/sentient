/**
 * Trainer Agent (Smart Cards: Workout Suggestion)
 * 
 * A practical programming assistant that generates workout suggestions
 * grounded in the exercise taxonomy. Separate from Analyst.
 * 
 * Persona: Practical, non-coercive, evidence-based
 * Grounding: docs/exercise taxonomy.md
 * Output: One suggested session with optional "why"
 * 
 * MUST respect directive + constraints from Tier-1
 */

import { OperatorDailyStats, WorkoutSuggestionPayload, WorkoutLog } from '../data/schema';
import { GeminiClient } from './GeminiClient';
import { getWorkoutLogsForDate, getRecentWorkoutLogCount } from '../data/database';

// Exercise taxonomy excerpts for prompt grounding
const TAXONOMY_CONTEXT = `
ENERGY SYSTEMS:
- Aerobic (Zone 2): 50-75% max HR, 20+ min, nasal breathing, conversational pace
- Anaerobic (Glycolytic): 85-100% max HR, 30s-3min, high lactate
- Phosphagen (Power): <10s max effort, full recovery between sets

TRAINING MODALITIES:
- Strength: compound lifts, progressive overload, 3-5 rep range for power, 8-12 for hypertrophy
- Endurance: Zone 2 base, tempo runs, interval training (4x4, Tabata, fartlek)
- Neural: skill acquisition, coordination, plyometrics, agility
- Regulation: yoga, mobility, breathwork, active recovery walks

INTENSITY PROFILES:
- LOW: RPE 3-4, recovery, flush, mobility
- MODERATE: RPE 5-6, maintenance, base building
- HIGH: RPE 7-9, overload, adaptation stimulus
`;

interface TrainerSuggestion {
  title: string;
  summary: string;
  why?: string;
  duration?: number;
  intensity?: 'LOW' | 'MODERATE' | 'HIGH';
}

export class Trainer {
  
  /**
   * Generate a workout suggestion based on directive and recent history
   */
  static async generateSuggestion(
    stats: OperatorDailyStats,
    directive: { category: string; stimulus_type: string },
    constraints: { allow_impact: boolean; heart_rate_cap?: number },
    recentLogs: WorkoutLog[]
  ): Promise<TrainerSuggestion | null> {
    
    // Check if LLM is available
    if (!GeminiClient.isAvailable()) {
      console.log('[Trainer] LLM not available, using fallback');
      return this.getFallbackSuggestion(directive, constraints);
    }
    
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(stats, directive, constraints, recentLogs);
    
    interface LLMResponse {
      title: string;
      summary: string;
      why?: string;
      duration?: number;
      intensity?: 'LOW' | 'MODERATE' | 'HIGH';
    }
    
    const response = await GeminiClient.generateJSON<LLMResponse>({
      systemPrompt,
      userPrompt,
      temperature: 0.7, // Slightly creative for variety
      maxTokens: 512
    });
    
    if (response.success && response.data) {
      // Validate response
      if (!this.validateSuggestion(response.data, directive, constraints)) {
        console.warn('[Trainer] Suggestion failed validation, using fallback');
        return this.getFallbackSuggestion(directive, constraints);
      }
      return response.data;
    }
    
    return this.getFallbackSuggestion(directive, constraints);
  }
  
  private static buildSystemPrompt(): string {
    return `You are a practical workout programming assistant for Sentient.

IDENTITY:
- Practical, calm, evidence-based
- You suggest—you don't command
- Plain language, no hype, no motivational coaching
- Grounded in exercise science

TAXONOMY KNOWLEDGE:
${TAXONOMY_CONTEXT}

OUTPUT (JSON only):
{
  "title": "Short workout title (max 50 chars)",
  "summary": "One-liner description of the session (max 120 chars)",
  "why": "Optional: why this fits today's directive (max 200 chars)",
  "duration": number (minutes, optional),
  "intensity": "LOW" | "MODERATE" | "HIGH" (optional)
}

RULES:
1. Suggestion MUST align with the provided directive category and stimulus
2. Suggestion MUST respect constraints (no impact if disallowed, HR cap if specified)
3. Keep it practical and achievable
4. Variety is good—don't repeat the same workout if recent logs show it
5. Be specific enough to be actionable (e.g., "Norwegian 4x4 intervals" not just "do cardio")

Generate JSON only. No explanations.`;
  }
  
  private static buildUserPrompt(
    stats: OperatorDailyStats,
    directive: { category: string; stimulus_type: string },
    constraints: { allow_impact: boolean; heart_rate_cap?: number },
    recentLogs: WorkoutLog[]
  ): string {
    const recentWorkouts = recentLogs.slice(0, 5).map(l => l.note).join('; ');
    
    const constraintsList = [];
    if (!constraints.allow_impact) constraintsList.push('No impact movements');
    if (constraints.heart_rate_cap) constraintsList.push(`HR cap: ${constraints.heart_rate_cap}bpm`);
    
    return `DIRECTIVE: ${directive.category} — ${directive.stimulus_type}

STATE: ${stats.stats.systemStatus.current_state}
VITALITY: ${stats.stats.vitality}%

CONSTRAINTS:
${constraintsList.length > 0 ? constraintsList.join('\n') : 'None'}

RECENT WORKOUTS (avoid repetition):
${recentWorkouts || 'No recent logs'}

Suggest one workout for today. JSON only.`;
  }
  
  private static validateSuggestion(
    suggestion: TrainerSuggestion,
    directive: { category: string; stimulus_type: string },
    constraints: { allow_impact: boolean; heart_rate_cap?: number }
  ): boolean {
    // Title and summary required
    if (!suggestion.title || !suggestion.summary) return false;
    if (suggestion.title.length > 60) return false;
    if (suggestion.summary.length > 150) return false;
    
    // Intensity should match stimulus roughly
    if (directive.stimulus_type === 'FLUSH' && suggestion.intensity === 'HIGH') {
      return false; // FLUSH should not be HIGH intensity
    }
    if (directive.stimulus_type === 'OVERLOAD' && suggestion.intensity === 'LOW') {
      return false; // OVERLOAD should not be LOW intensity
    }
    
    return true;
  }
  
  private static getFallbackSuggestion(
    directive: { category: string; stimulus_type: string },
    constraints: { allow_impact: boolean; heart_rate_cap?: number }
  ): TrainerSuggestion {
    const { category, stimulus_type } = directive;
    
    // Fallback templates by directive
    const templates: Record<string, Record<string, TrainerSuggestion>> = {
      STRENGTH: {
        OVERLOAD: {
          title: 'Heavy Compound Session',
          summary: 'Squat, deadlift, or press at 80%+ for 3-5 reps. Full rest between sets.',
          why: 'Progressive overload drives strength adaptation.',
          duration: 45,
          intensity: 'HIGH'
        },
        MAINTENANCE: {
          title: 'Moderate Strength Work',
          summary: 'Main lifts at 70% for 3x8. Keep form crisp.',
          why: 'Maintains strength without adding excessive fatigue.',
          duration: 40,
          intensity: 'MODERATE'
        },
        FLUSH: {
          title: 'Mobility & Light Movement',
          summary: 'Bodyweight flow, joint circles, light stretching.',
          duration: 20,
          intensity: 'LOW'
        },
        TEST: {
          title: 'Strength Test Day',
          summary: 'Work up to a heavy single on your main lift.',
          duration: 60,
          intensity: 'HIGH'
        }
      },
      ENDURANCE: {
        OVERLOAD: {
          title: 'Norwegian 4x4 Intervals',
          summary: '4 min hard @ 90% HR, 3 min easy. Repeat 4x.',
          why: 'VO2max stimulus with controlled recovery.',
          duration: 35,
          intensity: 'HIGH'
        },
        MAINTENANCE: {
          title: 'Zone 2 Base Build',
          summary: '30-45 min steady effort, nasal breathing, conversational pace.',
          why: 'Aerobic base without metabolic cost.',
          duration: 40,
          intensity: 'MODERATE'
        },
        FLUSH: {
          title: 'Easy Recovery Walk',
          summary: '20-30 min walk, keep HR under 100bpm.',
          duration: 25,
          intensity: 'LOW'
        },
        TEST: {
          title: 'Time Trial',
          summary: '5K or 20-min max effort to test current capacity.',
          duration: 30,
          intensity: 'HIGH'
        }
      },
      NEURAL: {
        OVERLOAD: {
          title: 'Skill Acquisition Block',
          summary: 'Complex movement patterns with full focus. Quality reps only.',
          why: 'Neural pathways adapt best with fresh attention.',
          duration: 30,
          intensity: 'MODERATE'
        },
        MAINTENANCE: {
          title: 'Coordination Practice',
          summary: 'Familiar movement drills with added complexity.',
          duration: 25,
          intensity: 'MODERATE'
        },
        FLUSH: {
          title: 'Light Movement Flow',
          summary: 'Easy mobility, animal flows, low-stakes movement.',
          duration: 20,
          intensity: 'LOW'
        },
        TEST: {
          title: 'Performance Test',
          summary: 'Execute your best version of a complex skill.',
          duration: 30,
          intensity: 'HIGH'
        }
      },
      REGULATION: {
        OVERLOAD: {
          title: 'Active Recovery Session',
          summary: 'Yoga or Pilates with focus on breath.',
          duration: 30,
          intensity: 'LOW'
        },
        MAINTENANCE: {
          title: 'Gentle Movement',
          summary: 'Light stretching and mobility work.',
          duration: 20,
          intensity: 'LOW'
        },
        FLUSH: {
          title: 'Rest & Breathwork',
          summary: 'Box breathing, meditation, or complete rest.',
          why: 'Nervous system reset.',
          duration: 15,
          intensity: 'LOW'
        },
        TEST: {
          title: 'Mindfulness Check',
          summary: 'Extended meditation or body scan.',
          duration: 20,
          intensity: 'LOW'
        }
      }
    };
    
    const categoryTemplates = templates[category] || templates.REGULATION;
    const suggestion = categoryTemplates[stimulus_type] || categoryTemplates.MAINTENANCE;
    
    // Adjust for constraints
    if (!constraints.allow_impact && suggestion.intensity === 'HIGH') {
      return {
        ...suggestion,
        summary: suggestion.summary + ' (low-impact alternatives allowed)',
        intensity: 'MODERATE'
      };
    }
    
    return suggestion;
  }
  
  /**
   * Check if suggestion should be generated today
   */
  static async shouldGenerateSuggestion(
    date: string,
    state: string,
    recentLogCount: number
  ): Promise<boolean> {
    // Minimum history requirement
    if (recentLogCount < 3) {
      return false;
    }
    
    // Don't suggest during strict recovery
    if (state === 'RECOVERY_MODE' || state === 'PHYSICAL_STRAIN') {
      return false;
    }
    
    return true;
  }
}
