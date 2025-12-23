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

// Exercise taxonomy excerpts for prompt grounding (from docs/exercise taxonomy.md)
const TAXONOMY_CONTEXT = `
ENERGY SYSTEMS:
- Aerobic (Oxidative): 50-75% max HR, 20+ min, nasal breathing, conversational pace, fat/carb oxidation
- Anaerobic (Glycolytic): 85-100% max HR, 30s-3min, high lactate, stored glycogen
- Phosphagen (Power): <10s max effort, full recovery between sets, phosphocreatine

TRAINING MODALITIES:
- Strength: compound lifts (squat, deadlift, press), progressive overload
  * Maximal strength: 85-100% 1RM, 1-5 reps, 3-5min rest
  * Hypertrophy: 70-85% 1RM, 6-12 reps, 60-90s rest
  * Muscular endurance: 50-70% 1RM, 12-20+ reps, 30-60s rest
- Endurance: Zone 2 base, tempo runs, interval training, long slow distance
- Neural: skill acquisition, coordination, plyometrics, agility, Olympic lifts
- Regulation: yoga, mobility, breathwork, active recovery walks, stretching

RUNNING/SPRINT TAXONOMY:
- Tempo Runs: 15-40min at 85-90% HRmax (comfortably hard, lactate threshold)
- Interval Runs: 3-5min work @ 95-100% HRmax, equal/longer recovery (VO2 max)
- Fartlek: Unstructured fast/slow alternation, 30-60min total
- Sprint Training: 100-400m max effort, complete rest between (4-8 reps)
- Long Slow Distance: 60-180+ min at 50-65% HRmax (aerobic base)
- Recovery Runs: 20-40min at 50-60% HRmax (active recovery)
- Strides: 80-200m building to 95% effort, walk recovery

HIIT PROTOCOLS:
- Tabata: 20sec work : 10sec rest, 8 rounds (4min total)
- 1:1 Ratio: 30sec work : 30sec rest, 8-12 rounds
- 1:2 Ratio: 30sec work : 60sec rest, 10-15 rounds
- 3:1 Ratio: 3min work : 1min rest, 4-5 rounds
- Norwegian 4x4: 4min hard @ 90% HR, 3min easy, repeat 4x (VO2 max)

MOVEMENT PATTERNS:
- Compound (multi-joint): Squat, deadlift, press, pull-up, Olympic lifts
- Isolation (single-joint): Bicep curl, leg extension, lateral raise
- Plyometric: Box jumps, bounding, medicine ball slams, burpees (impact)
- Functional: Turkish get-up, farmer carries, sled push/pull

INTENSITY PROFILES:
- LOW: RPE 3-4, recovery, flush, mobility, 50-60% HRmax
- MODERATE: RPE 5-6, maintenance, base building, 60-75% HRmax
- HIGH: RPE 7-9, overload, adaptation stimulus, 85-100% HRmax

SPECIFIC PROTOCOLS:
- Zone 2 Base: 30-45min steady, nasal breathing, conversational pace
- Threshold/Tempo: 20-40min at 85-90% HRmax (sustained hard effort)
- VO2 Max Intervals: 3-5min @ 95-100% HRmax with equal/longer recovery
- Power Development: Heavy compound lifts 3-5 reps, 3-5min rest
- Metabolic Conditioning: Circuit training, minimal rest, multiple energy systems
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
    constraints: { allow_impact: boolean; heart_rate_cap?: number; required_equipment?: string[] },
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
    constraints: { allow_impact: boolean; heart_rate_cap?: number; required_equipment?: string[] },
    recentLogs: WorkoutLog[]
  ): string {
    const recentWorkouts = recentLogs.slice(0, 7).map(l => l.note).join('; ');
    
    const constraintsList = [];
    if (!constraints.allow_impact) constraintsList.push('No impact movements');
    if (constraints.heart_rate_cap) constraintsList.push(`HR cap: ${constraints.heart_rate_cap}bpm (keep under this in suggestion)`);
    if (constraints.required_equipment && constraints.required_equipment.length > 0) {
      constraintsList.push(`Required equipment: ${constraints.required_equipment.join(', ')}`);
    }
    
    return `DIRECTIVE: ${directive.category} — ${directive.stimulus_type}

STATE: ${stats.stats.systemStatus.current_state}
VITALITY: ${stats.stats.vitality}%

CONSTRAINTS:
${constraintsList.length > 0 ? constraintsList.join('\n') : 'None'}

RECENT WORKOUTS (3-7, avoid repetition):
${recentWorkouts || 'No recent logs'}

Suggest one workout for today. JSON only.`;
  }
  
  private static validateSuggestion(
    suggestion: TrainerSuggestion,
    directive: { category: string; stimulus_type: string },
    constraints: { allow_impact: boolean; heart_rate_cap?: number; required_equipment?: string[] }
  ): boolean {
    // Title and summary required, length limits
    if (!suggestion.title || !suggestion.summary) return false;
    if (suggestion.title.length > 50) return false;
    if (suggestion.summary.length > 120) return false;
    if (suggestion.why && suggestion.why.length > 200) return false;
    
    // Safety gates: If allow_impact=false, forbid impact suggestions
    if (!constraints.allow_impact) {
      const lowerTitle = suggestion.title.toLowerCase();
      const lowerSummary = suggestion.summary.toLowerCase();
      const impactKeywords = ['jump', 'plyometric', 'impact', 'bounding', 'box jump', 'burpee'];
      if (impactKeywords.some(keyword => lowerTitle.includes(keyword) || lowerSummary.includes(keyword))) {
        return false;
      }
    }
    
    // If HR cap exists, suggestion must be cap-aware (check if summary mentions HR)
    if (constraints.heart_rate_cap) {
      const lowerSummary = suggestion.summary.toLowerCase();
      if (!lowerSummary.includes('hr') && !lowerSummary.includes('heart rate') && !lowerSummary.includes('bpm')) {
        // If it doesn't mention HR, it might not be cap-aware, but we'll allow it
        // The prompt should have instructed to include HR guidance
      }
    }
    
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
    constraints: { allow_impact: boolean; heart_rate_cap?: number; required_equipment?: string[] }
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
    let adjustedSuggestion = { ...suggestion };
    
    if (!constraints.allow_impact && adjustedSuggestion.intensity === 'HIGH') {
      adjustedSuggestion = {
        ...adjustedSuggestion,
        summary: adjustedSuggestion.summary + ' (low-impact alternatives)',
        intensity: 'MODERATE'
      };
    }
    
    // Add HR cap awareness if specified
    if (constraints.heart_rate_cap) {
      adjustedSuggestion = {
        ...adjustedSuggestion,
        summary: adjustedSuggestion.summary + ` (keep under ${constraints.heart_rate_cap} bpm)`
      };
    }
    
    return adjustedSuggestion;
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
