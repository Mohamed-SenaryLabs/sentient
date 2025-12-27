/**
 * Smart Card Engine (PRD Addendum)
 * 
 * Manages the lifecycle of Smart Cards:
 * - Eligibility checking (trigger conditions)
 * - Card selection (max 2, priority-based)
 * - Status transitions
 * 
 * Non-negotiables:
 * - Max 2 cards visible on Home at any time
 * - Cards must be day-stable unless triggers change
 * - Cards must persist state (no reappearing after completion)
 */

import { 
  SmartCard, 
  SmartCardType, 
  SmartCardStatus,
  SmartCardPayload,
  SleepConfirmPayload,
  WorkoutLogPayload,
  WorkoutSuggestionPayload,
  GoalsIntakePayload,
  WelcomePayload,
  WorkoutInsightPayload,
  OperatorDailyStats,
  OperatorGoals
} from '../data/schema';

import {
  saveSmartCard,
  getSmartCard,
  getSmartCardsForDate,
  getActiveSmartCards,
  updateSmartCardStatus,
  hasActiveCardOfType,
  wasCardCompletedToday,
  isWorkoutLogged,
  getBaselines,
  getOperatorGoals,
  getRecentWorkoutLogCount,
  getRecentWorkoutLogs,
  isWelcomeCompleted,
  setWelcomeCompleted
} from '../data/database';

// Card priority levels (higher = more important)
const PRIORITY = {
  SLEEP_CONFIRM: 90,      // Safety/data quality - highest
  WORKOUT_LOG: 70,        // Immediate relevance
  WORKOUT_INSIGHT: 60,    // Post-workout insight (between log and suggestion)
  WORKOUT_SUGGESTION: 50, // Enhancement
  GOALS_INTAKE: 40,       // Onboarding/periodic
  WELCOME: 30             // Low priority (onboarding)
} as const;

// Dismiss policies
const DISMISS_POLICY = {
  SLEEP_CONFIRM: 'RESURFACE_DAILY',       // Re-ask daily until confirmed
  WORKOUT_LOG: 'RESURFACE_ON_EVENT',      // Only on new workout
  WORKOUT_INSIGHT: 'PERMANENT',           // One per workout, permanent
  WORKOUT_SUGGESTION: 'PERMANENT',         // Don't re-ask same day
  GOALS_INTAKE: 'RESURFACE_DAILY',        // Re-ask daily until set
  WELCOME: 'PERMANENT'                    // One-time only
} as const;

export interface CardEligibilityContext {
  stats: OperatorDailyStats;
  date: string;
  goals?: OperatorGoals | null;
  recentLogCount?: number;
}

export class SmartCardEngine {
  
  /**
   * Main entry: compute eligible cards and return max 2
   */
  static async computeActiveCards(
    context: CardEligibilityContext
  ): Promise<SmartCard[]> {
    const { date } = context;
    
    // 1. Check all trigger conditions
    const eligibleCards: SmartCard[] = [];
    
    // Sleep Confirm
    const sleepCard = await this.checkSleepConfirmEligibility(context);
    if (sleepCard) eligibleCards.push(sleepCard);
    
    // Workout Log
    const workoutCard = await this.checkWorkoutLogEligibility(context);
    if (workoutCard) eligibleCards.push(workoutCard);
    
    // Workout Suggestion (requires enough history)
    const suggestionCard = await this.checkWorkoutSuggestionEligibility(context);
    if (suggestionCard) eligibleCards.push(suggestionCard);
    
    // Goals Intake
    const goalsCard = await this.checkGoalsIntakeEligibility(context);
    if (goalsCard) eligibleCards.push(goalsCard);
    
    // Welcome (low priority, first launch only)
    const welcomeCard = await this.checkWelcomeEligibility(context);
    if (welcomeCard) eligibleCards.push(welcomeCard);
    
    // Workout Insight (post-workout)
    const insightCard = await this.checkWorkoutInsightEligibility(context);
    if (insightCard) eligibleCards.push(insightCard);
    
    // 2. Sort by priority (descending)
    eligibleCards.sort((a, b) => b.priority - a.priority);
    
    // 3. Return max 2
    return eligibleCards.slice(0, 2);
  }
  
  // ============================================
  // ELIGIBILITY CHECKS
  // ============================================
  
  /**
   * Sleep Confirm: Show if sleep is missing/estimated
   */
  private static async checkSleepConfirmEligibility(
    context: CardEligibilityContext
  ): Promise<SmartCard | null> {
    const { stats, date } = context;
    
    // Check if already completed today
    if (await wasCardCompletedToday(date, 'SLEEP_CONFIRM')) {
      return null;
    }
    
    // Get baselines to check if user has already confirmed sleep
    const baselines = await getBaselines();
    
    // Trigger: sleep source is not MEASURED
    const sleepSource = stats.sleep.source;
    if (sleepSource === 'MEASURED') {
      return null; // Real data, no need to confirm
    }
    
    // Check for existing card
    const cardId = `${date}:SLEEP_CONFIRM`;
    const existing = await getSmartCard(cardId);
    
    if (existing) {
      // If dismissed, check resurface policy
      if (existing.status === 'DISMISSED') {
        const dismissedAt = new Date(existing.dismissed_at || '');
        const hoursSinceDismiss = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60);
        
        // Resurface after 12 hours
        if (hoursSinceDismiss < 12) {
          return null;
        }
        // Reset to ACTIVE for re-display
        existing.status = 'ACTIVE';
      }
      return existing;
    }
    
    // Create new card - use user's confirmed baseline if available
    const userSleepSeconds = baselines?.sleepUserEntered ? baselines.sleepSeconds : null;
    const estimatedSleep = userSleepSeconds || stats.sleep.totalDurationSeconds;
    
    const payload: SleepConfirmPayload = {
      type: 'SLEEP_CONFIRM',
      estimatedSleepSeconds: estimatedSleep,
      sleepSource: userSleepSeconds ? 'MANUAL' : ((sleepSource as 'ESTIMATED_7D' | 'DEFAULT_6H' | 'MANUAL') || 'DEFAULT_6H')
    };
    
    const card: SmartCard = {
      id: cardId,
      date,
      type: 'SLEEP_CONFIRM',
      status: 'ACTIVE',
      priority: PRIORITY.SLEEP_CONFIRM,
      payload,
      dismissPolicy: DISMISS_POLICY.SLEEP_CONFIRM,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await saveSmartCard(card);
    return card;
  }
  
  /**
   * Workout Log: Show if workout detected but not logged
   */
  private static async checkWorkoutLogEligibility(
    context: CardEligibilityContext
  ): Promise<SmartCard | null> {
    const { stats, date } = context;
    
    // No workouts today = no card
    const workouts = stats.activity.workouts || [];
    if (workouts.length === 0) {
      return null;
    }
    
    // Find first unlogged workout
    let unloggedWorkout = null;
    for (const workout of workouts) {
      const isLogged = await isWorkoutLogged(workout.id);
      if (!isLogged) {
        unloggedWorkout = workout;
        break;
      }
    }
    
    if (!unloggedWorkout) {
      return null; // All workouts logged
    }
    
    const cardId = `${date}:WORKOUT_LOG:${unloggedWorkout.id}`;
    
    // Check if already completed or dismissed today
    const existing = await getSmartCard(cardId);
    if (existing?.status === 'COMPLETED') {
      return null;
    }
    if (existing?.status === 'DISMISSED') {
      // For RESURFACE_ON_EVENT, only show again if new workout
      return null;
    }
    
    if (existing) {
      return existing;
    }
    
    // Create new card
    const payload: WorkoutLogPayload = {
      type: 'WORKOUT_LOG',
      workoutId: unloggedWorkout.id,
      workoutType: unloggedWorkout.type,
      detectedAt: unloggedWorkout.startDate
    };
    
    const card: SmartCard = {
      id: cardId,
      date,
      type: 'WORKOUT_LOG',
      status: 'ACTIVE',
      priority: PRIORITY.WORKOUT_LOG,
      payload,
      dismissPolicy: DISMISS_POLICY.WORKOUT_LOG,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await saveSmartCard(card);
    return card;
  }
  
  /**
   * Workout Suggestion: Show if enough history and state allows
   * Eligibility:
   * - Require minimum recent logs (≥ 3 logs in last 7 days)
   * - Must respect current Tier-1 directive/constraints
   * - Rate limit: ≤ 1 suggestion/day unless explicitly requested
   */
  private static async checkWorkoutSuggestionEligibility(
    context: CardEligibilityContext
  ): Promise<SmartCard | null> {
    const { stats, date, recentLogCount } = context;
    
    // Minimum log history requirement (≥ 3 logs in last 7 days)
    const MIN_LOGS = 3;
    const logCount = recentLogCount ?? await getRecentWorkoutLogCount(7);
    if (logCount < MIN_LOGS) {
      return null;
    }
    
    // Rate limit: ≤ 1 suggestion/day
    if (await wasCardCompletedToday(date, 'WORKOUT_SUGGESTION')) {
      return null;
    }
    if (await hasActiveCardOfType(date, 'WORKOUT_SUGGESTION')) {
      // Already have one today (dismissed or active)
      const existingCards = await getSmartCardsForDate(date);
      const existing = existingCards.find(c => c.type === 'WORKOUT_SUGGESTION');
      if (existing?.status === 'DISMISSED') {
        return null; // Dismissed suggestions do not resurface same day
      }
      return existing || null;
    }
    
    // State check: don't suggest during strict recovery
    const state = stats.stats.systemStatus.current_state;
    if (state === 'RECOVERY_MODE' || state === 'PHYSICAL_STRAIN') {
      return null;
    }
    
    // Get directive and constraints from current contract
    const contract = stats.contract;
    if (!contract || !contract.directive) {
      return null;
    }
    
    const directive = contract.directive;
    const constraints = contract.constraints || {
      allow_impact: true,
      required_equipment: [],
      heart_rate_cap: undefined
    };
    
    // Get recent workout logs (3-7) for Trainer input
    const recentLogs = await getRecentWorkoutLogs(7);
    if (recentLogs.length < 3) {
      return null;
    }
    
    // Generate suggestion using Trainer agent
    const suggestion = await Trainer.generateSuggestion(
      stats,
      {
        category: directive.category,
        stimulus_type: directive.stimulus_type
      },
      {
        allow_impact: constraints.allow_impact,
        heart_rate_cap: constraints.heart_rate_cap,
        required_equipment: constraints.required_equipment || []
      },
      recentLogs
    );
    
    if (!suggestion) {
      return null;
    }
    
    // Create card with suggestion payload
    const cardId = `${date}:WORKOUT_SUGGESTION`;
    const payload: WorkoutSuggestionPayload = {
      type: 'WORKOUT_SUGGESTION',
      suggestion,
      directiveCategory: directive.category,
      directiveStimulus: directive.stimulus_type,
      timestamp: new Date().toISOString()
    };
    
    const card: SmartCard = {
      id: cardId,
      date,
      type: 'WORKOUT_SUGGESTION',
      status: 'ACTIVE',
      priority: PRIORITY.WORKOUT_SUGGESTION,
      payload,
      dismissPolicy: DISMISS_POLICY.WORKOUT_SUGGESTION,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await saveSmartCard(card);
    return card;
  }
  
  /**
   * Goals Intake: Show if goals not set, stale (>30 days), or manually triggered
   * Trigger policy:
   * - No goals exist, OR
   * - updated_at older than 30 days, OR
   * - Operator manually initiates from Settings
   */
  private static async checkGoalsIntakeEligibility(
    context: CardEligibilityContext,
    manualTrigger: boolean = false
  ): Promise<SmartCard | null> {
    const { date, goals } = context;
    
    // If manually triggered from Settings, always show (unless already completed today)
    if (!manualTrigger) {
      // Check if already completed today
      if (await wasCardCompletedToday(date, 'GOALS_INTAKE')) {
        return null;
      }
    }
    
    // Check if goals exist and are recent
    const existingGoals = goals ?? await getOperatorGoals();
    if (existingGoals && !manualTrigger) {
      const goalAge = Date.now() - new Date(existingGoals.updated_at).getTime();
      const daysSinceUpdate = goalAge / (1000 * 60 * 60 * 24);
      
      // Only resurface if goals are > 30 days old
      if (daysSinceUpdate < 30) {
        return null;
      }
    }
    
    const cardId = `${date}:GOALS_INTAKE`;
    const existing = await getSmartCard(cardId);
    
    if (existing && !manualTrigger) {
      if (existing.status === 'DISMISSED') {
        // Resurface daily until set
        const dismissedAt = new Date(existing.dismissed_at || '');
        const hoursSinceDismiss = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceDismiss < 24) {
          return null;
        }
        existing.status = 'ACTIVE';
      }
      return existing;
    }
    
    // Create new card (or reactivate if manually triggered)
    const payload: GoalsIntakePayload = {
      type: 'GOALS_INTAKE',
      currentGoals: existingGoals || undefined,
      lastUpdated: existingGoals?.updated_at
    };
    
    const card: SmartCard = {
      id: cardId,
      date,
      type: 'GOALS_INTAKE',
      status: 'ACTIVE',
      priority: PRIORITY.GOALS_INTAKE,
      payload,
      dismissPolicy: DISMISS_POLICY.GOALS_INTAKE,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await saveSmartCard(card);
    return card;
  }
  
  /**
   * Manually trigger Goals Intake card (from Settings)
   */
  static async triggerGoalsIntakeManually(
    context: CardEligibilityContext
  ): Promise<SmartCard | null> {
    return this.checkGoalsIntakeEligibility(context, true);
  }
  
  /**
   * Welcome: Show only on first launch if welcome_completed != true
   */
  private static async checkWelcomeEligibility(
    context: CardEligibilityContext
  ): Promise<SmartCard | null> {
    const { stats, date } = context;
    
    // Check if welcome already completed
    if (await isWelcomeCompleted()) {
      return null;
    }
    
    // Check for existing card (completed or dismissed)
    const cardId = `${date}:WELCOME`;
    const existing = await getSmartCard(cardId);
    
    if (existing) {
      // If already completed or dismissed, don't show again
      if (existing.status === 'COMPLETED' || existing.status === 'DISMISSED') {
        return null;
      }
      return existing;
    }
    
    // Generate welcome message via Companion agent (LLM-only, no fallback)
    const { Companion } = await import('../intelligence/Companion');
    const welcomeData = await Companion.generateWelcome(stats);
    
    // If LLM fails, return null (no fallback)
    if (!welcomeData) {
      return null;
    }
    
    const payload: WelcomePayload = {
      type: 'WELCOME',
      headline: welcomeData.headline,
      message: welcomeData.message,
      createdAt: new Date().toISOString()
    };
    
    const card: SmartCard = {
      id: cardId,
      date,
      type: 'WELCOME',
      status: 'ACTIVE',
      priority: PRIORITY.WELCOME,
      payload,
      dismissPolicy: DISMISS_POLICY.WELCOME,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await saveSmartCard(card);
    return card;
  }
  
  /**
   * Workout Insight: Show after workout ends (within 3h), one per workout
   */
  private static async checkWorkoutInsightEligibility(
    context: CardEligibilityContext
  ): Promise<SmartCard | null> {
    const { stats, date } = context;
    
    // Check if there are workouts for today
    const workouts = stats.activity.workouts || [];
    if (workouts.length === 0) {
      return null;
    }
    
    // Select most recent workout
    const mostRecentWorkout = workouts[workouts.length - 1];
    if (!mostRecentWorkout.id) {
      return null; // Need workout ID for deduplication
    }
    
    // Calculate end time: prefer explicit end, else start + duration
    let workoutEndTime: Date;
    if (mostRecentWorkout.startDate) {
      const startTime = new Date(mostRecentWorkout.startDate);
      workoutEndTime = new Date(startTime.getTime() + (mostRecentWorkout.durationSeconds * 1000));
    } else {
      // No start date, assume it ended recently (within last hour)
      workoutEndTime = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
    }
    
    // Check if workout ended within last 3 hours
    const hoursSinceEnd = (Date.now() - workoutEndTime.getTime()) / (1000 * 60 * 60);
    if (hoursSinceEnd > 3) {
      return null; // Too old
    }
    
    // Check for existing card for this workout
    const cardId = `${date}:WORKOUT_INSIGHT:${mostRecentWorkout.id}`;
    const existing = await getSmartCard(cardId);
    
    if (existing) {
      // If already completed or dismissed, don't show again
      if (existing.status === 'COMPLETED' || existing.status === 'DISMISSED') {
        return null;
      }
      return existing;
    }
    
    // Generate insight via Companion agent (LLM-only, no fallback)
    const { Companion } = await import('../intelligence/Companion');
    const insightData = await Companion.generatePostWorkoutInsight(mostRecentWorkout, stats);
    
    // If LLM fails, return null (no fallback)
    if (!insightData) {
      return null;
    }
    
    const payload: WorkoutInsightPayload = {
      type: 'WORKOUT_INSIGHT',
      workoutId: mostRecentWorkout.id,
      workoutType: mostRecentWorkout.type,
      detectedAt: mostRecentWorkout.startDate,
      insight: {
        headline: insightData.headline,
        summary: insightData.summary,
        physiology: insightData.physiology,
        guidance: insightData.guidance
      },
      generatedAt: new Date().toISOString()
    };
    
    const card: SmartCard = {
      id: cardId,
      date,
      type: 'WORKOUT_INSIGHT',
      status: 'ACTIVE',
      priority: PRIORITY.WORKOUT_INSIGHT,
      payload,
      dismissPolicy: DISMISS_POLICY.WORKOUT_INSIGHT,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await saveSmartCard(card);
    return card;
  }
  
  // ============================================
  // CARD ACTIONS
  // ============================================
  
  /**
   * Complete a card with optional payload update
   */
  static async completeCard(
    cardId: string, 
    updatedPayload?: SmartCardPayload
  ): Promise<void> {
    await updateSmartCardStatus(cardId, 'COMPLETED', updatedPayload);
    console.log(`[SmartCardEngine] Card completed: ${cardId}`);
  }
  
  /**
   * Dismiss a card ("Not now")
   */
  static async dismissCard(cardId: string): Promise<void> {
    await updateSmartCardStatus(cardId, 'DISMISSED');
    console.log(`[SmartCardEngine] Card dismissed: ${cardId}`);
  }
  
  /**
   * Create a workout suggestion card (called by Trainer agent)
   */
  static async createWorkoutSuggestionCard(
    date: string,
    suggestion: WorkoutSuggestionPayload['suggestion'],
    directive: { category: string; stimulus_type: string }
  ): Promise<SmartCard> {
    const cardId = `${date}:WORKOUT_SUGGESTION`;
    
    const payload: WorkoutSuggestionPayload = {
      type: 'WORKOUT_SUGGESTION',
      suggestion,
      directiveCategory: directive.category,
      directiveStimulus: directive.stimulus_type
    };
    
    const card: SmartCard = {
      id: cardId,
      date,
      type: 'WORKOUT_SUGGESTION',
      status: 'ACTIVE',
      priority: PRIORITY.WORKOUT_SUGGESTION,
      payload,
      dismissPolicy: DISMISS_POLICY.WORKOUT_SUGGESTION,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await saveSmartCard(card);
    return card;
  }
}
