/**
 * Companion Agent (Smart Cards: Welcome & Workout Insight)
 * 
 * Emits Home-only Smart Cards as "live signals":
 * - WELCOME: day-1 onboarding (one-time)
 * - WORKOUT_INSIGHT: near real-time post-workout physiology insight
 * 
 * Non-negotiables:
 * - LLM-only: if LLM unavailable/fails/timeout/invalid JSON → return null (no fallback)
 * - Tone: calm, instrument-like, precise; no hype, no emojis, no medical claims
 */

import { OperatorDailyStats, Workout } from '../data/schema';
import { GeminiClient } from './GeminiClient';

interface WelcomeResponse {
  headline: string;  // ≤ 32 chars
  message: string;    // 1-2 sentences, ≤ 220 chars
}

interface WorkoutInsightResponse {
  headline: string;
  summary: string;
  physiology?: string;
  guidance?: string;
}

export class Companion {
  
  /**
   * Generate welcome message for day-1 onboarding
   * Returns null if LLM fails (no fallback)
   */
  static async generateWelcome(
    stats?: OperatorDailyStats
  ): Promise<WelcomeResponse | null> {
    
    // Check if LLM is available
    if (!GeminiClient.isAvailable()) {
      console.log('[Companion] LLM not available, skipping welcome card');
      return null;
    }
    
    const systemPrompt = this.buildWelcomeSystemPrompt();
    const userPrompt = this.buildWelcomeUserPrompt(stats);
    
    const response = await GeminiClient.generateJSON<WelcomeResponse>({
      systemPrompt,
      userPrompt,
      temperature: 0.6, // Slightly creative but controlled
      maxTokens: 256
    });
    
    if (!response.success || !response.data) {
      console.log('[Companion] Welcome generation failed, skipping card');
      return null;
    }
    
    // Validate response
    if (!this.validateWelcome(response.data)) {
      console.log('[Companion] Welcome validation failed, skipping card');
      return null;
    }
    
    return response.data;
  }
  
  /**
   * Generate post-workout physiology insight
   * Returns null if LLM fails (no fallback)
   */
  static async generatePostWorkoutInsight(
    workout: Workout,
    stats: OperatorDailyStats
  ): Promise<WorkoutInsightResponse | null> {
    
    // Check if LLM is available
    if (!GeminiClient.isAvailable()) {
      console.log('[Companion] LLM not available, skipping workout insight card');
      return null;
    }
    
    const systemPrompt = this.buildWorkoutInsightSystemPrompt();
    const userPrompt = this.buildWorkoutInsightUserPrompt(workout, stats);
    
    const response = await GeminiClient.generateJSON<WorkoutInsightResponse>({
      systemPrompt,
      userPrompt,
      temperature: 0.6,
      maxTokens: 512
    });
    
    if (!response.success || !response.data) {
      console.log('[Companion] Workout insight generation failed, skipping card');
      return null;
    }
    
    // Validate response
    if (!this.validateWorkoutInsight(response.data)) {
      console.log('[Companion] Workout insight validation failed, skipping card');
      return null;
    }
    
    return response.data;
  }
  
  // ============================================
  // PROMPT BUILDING
  // ============================================
  
  private static buildWelcomeSystemPrompt(): string {
    return `You are the SENTIENT COMPANION.
ROLE: Onboarding guide for first-time users.
VOICE: Calm, instrument-like, precise. No hype, no emojis, no medical claims.

OUTPUT FORMAT (JSON only):
{
  "headline": "string (max 32 characters)",
  "message": "string (1-2 sentences, max 220 characters)"
}

TONE:
- Professional, understated
- Focus on what the system does, not what it promises
- Avoid superlatives and marketing language
- Example: "Welcome to Sentient. Your biometrics are being analyzed to generate personalized training guidance."

CONSTRAINTS:
- headline: Must be ≤ 32 characters
- message: Must be 1-2 sentences, ≤ 220 characters
- No medical advice
- No claims about outcomes
- No emojis or special characters`;
  }
  
  private static buildWelcomeUserPrompt(stats?: OperatorDailyStats): string {
    const hasVitality = stats?.stats?.vitality !== undefined;
    const vitality = stats?.stats?.vitality;
    const confidence = stats?.stats?.vitalityConfidence;
    const state = stats?.stats?.systemStatus?.current_state;
    
    let context = 'First launch detected.';
    if (hasVitality && vitality !== undefined) {
      context += ` Initial vitality reading: ${vitality}/100`;
      if (confidence) {
        context += ` (${confidence} confidence)`;
      }
    }
    if (state) {
      context += ` System state: ${state}`;
    }
    
    return `Generate a welcome message for a first-time user.

Context: ${context}

Generate a calm, professional welcome that:
1. Acknowledges this is their first day
2. Briefly explains what Sentient does (analyzes biometrics, generates training guidance)
3. Sets appropriate expectations (no hype)

Return JSON with headline and message.`;
  }
  
  private static buildWorkoutInsightSystemPrompt(): string {
    return `You are the SENTIENT COMPANION.
ROLE: Post-workout physiology analyst.
VOICE: Calm, instrument-like, precise. No hype, no emojis, no medical claims.

OUTPUT FORMAT (JSON only):
{
  "headline": "string (max 50 characters)",
  "summary": "string (1-2 sentences, max 200 characters)",
  "physiology": "string (optional, max 300 characters)",
  "guidance": "string (optional, max 200 characters)"
}

TONE:
- Professional, observational
- Focus on what the data suggests, not prescriptions
- Avoid medical advice or diagnostic language
- Example: "Elevated HRV recovery pattern observed. Neural system shows readiness for technical work."

CONSTRAINTS:
- headline: Must be ≤ 50 characters
- summary: Must be 1-2 sentences, ≤ 200 characters
- physiology: Optional, ≤ 300 characters if provided
- guidance: Optional, ≤ 200 characters if provided
- No medical advice
- No claims about outcomes
- No emojis or special characters`;
  }
  
  private static buildWorkoutInsightUserPrompt(
    workout: Workout,
    stats: OperatorDailyStats
  ): string {
    const workoutType = workout.type || 'Unknown';
    const duration = workout.durationSeconds ? Math.round(workout.durationSeconds / 60) : null;
    const calories = workout.activeCalories || null;
    const distance = workout.distance ? (workout.distance / 1000).toFixed(2) : null; // km
    const avgHR = workout.avgHeartRate || null;
    const maxHR = workout.maxHeartRate || null;
    const rpm = workout.rpm || null;
    
    const vitality = stats.stats.vitality;
    const hrv = stats.biometrics.hrv;
    const rhr = stats.biometrics.restingHeartRate;
    const respRate = stats.biometrics.respiratoryRate;
    const state = stats.stats.systemStatus.current_state;
    
    let workoutDetails = `Workout: ${workoutType}`;
    if (duration) workoutDetails += `, ${duration} min`;
    if (calories) workoutDetails += `, ${calories} kcal`;
    if (distance) workoutDetails += `, ${distance} km`;
    if (avgHR) workoutDetails += `, avg HR ${avgHR} bpm`;
    if (maxHR) workoutDetails += `, max HR ${maxHR} bpm`;
    if (rpm) workoutDetails += `, ${rpm} rpm`;
    
    let currentState = `Current state: ${state}`;
    if (vitality !== undefined) currentState += `, vitality ${vitality}/100`;
    if (hrv) currentState += `, HRV ${hrv} ms`;
    if (rhr) currentState += `, RHR ${rhr} bpm`;
    if (respRate) currentState += `, resp rate ${respRate} bpm`;
    
    return `Generate a post-workout physiology insight.

Workout details: ${workoutDetails}

Current system state: ${currentState}

Generate a calm, observational insight that:
1. Summarizes what the workout data suggests about physiological response
2. Optionally explains relevant physiology (HRV patterns, recovery markers, etc.)
3. Optionally provides guidance (what to expect, what to monitor)

Keep it professional and instrument-like. No medical advice.

Return JSON with headline, summary, and optional physiology/guidance fields.`;
  }
  
  // ============================================
  // VALIDATION
  // ============================================
  
  private static validateWelcome(data: WelcomeResponse): boolean {
    if (!data.headline || !data.message) {
      return false;
    }
    
    if (data.headline.length > 32) {
      console.warn('[Companion] Welcome headline too long:', data.headline.length);
      return false;
    }
    
    if (data.message.length > 220) {
      console.warn('[Companion] Welcome message too long:', data.message.length);
      return false;
    }
    
    // Check for banned content (emojis, medical claims)
    const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(data.headline + data.message);
    if (hasEmoji) {
      console.warn('[Companion] Welcome contains emojis');
      return false;
    }
    
    return true;
  }
  
  private static validateWorkoutInsight(data: WorkoutInsightResponse): boolean {
    if (!data.headline || !data.summary) {
      return false;
    }
    
    if (data.headline.length > 50) {
      console.warn('[Companion] Workout insight headline too long:', data.headline.length);
      return false;
    }
    
    if (data.summary.length > 200) {
      console.warn('[Companion] Workout insight summary too long:', data.summary.length);
      return false;
    }
    
    if (data.physiology && data.physiology.length > 300) {
      console.warn('[Companion] Workout insight physiology too long:', data.physiology.length);
      return false;
    }
    
    if (data.guidance && data.guidance.length > 200) {
      console.warn('[Companion] Workout insight guidance too long:', data.guidance.length);
      return false;
    }
    
    // Check for banned content
    const allText = data.headline + data.summary + (data.physiology || '') + (data.guidance || '');
    const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(allText);
    if (hasEmoji) {
      console.warn('[Companion] Workout insight contains emojis');
      return false;
    }
    
    return true;
  }
}




