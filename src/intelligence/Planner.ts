/**
 * Intelligence Planner (Layer 2)
 * 
 * Manages the Logic Chain Contract and 3-Day Strategic Arc.
 * Interfaces with the Oracle (Gemini) or falls back to static logic.
 */

import { LogicChainContract, OperatorDailyStats, SystemStatus } from '../data/schema';
import { ScoringEngine } from './ScoringEngine';
import { GeminiClient } from './GeminiClient';

export class Planner {
  /**
   * Generates a "Day Zero" contract for immediate use
   * Used when no API is available or for first launch
   */
  /**
   * Generates the 3-Day Strategic Arc (Today, Tomorrow, Horizon)
   * V3.1 Update: Uses ScoringEngine for Today (Tier 1) -> Gemini (Tier 2) -> Forecast (Tier 3)
   */
  static async generateStrategicArc(context: OperatorDailyStats, trends?: { recovery_trend: 'RISING' | 'FALLING' | 'STABLE' }): Promise<LogicChainContract> {
     // 1. TODAY (Tier 1 Utility AI - The Guardrails)
     const tier1Result = ScoringEngine.evaluate(context);
     const winner = tier1Result.rankedDirectives[0];
     
     // 2. TODAY (Tier 2 LLM - The Consultant)
     // We run this in parallel or sequence. For safety, sequence: Get Tier 1, then ask LLM to refine.
     const consultantResult = await GeminiClient.generateInsight(context, {
         category: winner.category,
         stimulus: winner.stimulus,
         reason: winner.reason,
         technical_trace: {
             winner_score: winner.score,
             rejected_alternatives: tier1Result.rankingAnalysis.rejected,
             constraints: tier1Result.safetyConstraint.allowedTypes
         }
     });

     const todayContract = {
         dayOffset: 0,
         state: context.stats.systemStatus.current_state,
         directive: {
             category: winner.category,
             stimulus_type: winner.stimulus
         },
         constraints: {
             allow_impact: tier1Result.safetyConstraint.allowedTypes.includes('ALL') || tier1Result.safetyConstraint.allowedTypes.includes('RUNNING'),
             required_equipment: [],
             heart_rate_cap: tier1Result.safetyConstraint.maxLoad < 5 ? 135 : undefined
         },
         // Store the consultant advise in session focus or summary
         session_focus_refinement: consultantResult.specific_advice
     };
     
     // 3. FORECAST TOMORROW (Day 1)
     const currentState = context.stats.systemStatus.current_state;
     const tomorrowState = this.predictNextState(currentState, trends?.recovery_trend || 'STABLE', 1);
     const tomorrowContract = this.determineDailyDirective(tomorrowState, 1);
     
     // 4. FORECAST HORIZON (Day 2)
     const horizonState = this.predictNextState(tomorrowState, trends?.recovery_trend || 'STABLE', 2);
     const horizonContract = this.determineDailyDirective(horizonState, 2);

     return {
         horizon: [todayContract as any, tomorrowContract, horizonContract],
         
         // Flat mapping for Day 0
         state: currentState,
         dominant_factors: [consultantResult.rationale], // Use LLM Rationale here
         directive: todayContract.directive as any,
         session_focus: consultantResult.specific_advice || this.getHumanReadableFocus(todayContract.directive.category, todayContract.directive.stimulus_type), // Use LLM advice here
         constraints: todayContract.constraints,
         // [NEW] Pass through the LLM Session Details
         llm_generated_session: consultantResult.session
     };
  }

  private static getHumanReadableFocus(category: string, stimulus: string): string {
      if (category === 'STRENGTH') {
          return stimulus === 'OVERLOAD' ? 'Prioritize heavy resistance.' : 'Maintain strength levels.';
      }
      if (category === 'ENDURANCE') {
          return stimulus === 'OVERLOAD' ? 'Push aerobic duration.' : 'Build aerobic base.';
      }
      if (category === 'REGULATION') return 'Focus on active recovery.';
      return `Execute ${category.toLowerCase()} protocol.`;
  }

  /**
   * Predicts the likely next state based on current state and trend
   */
  private static predictNextState(currentState: string, trend: string, dayOffset: number): string {
      // Simple Markov-like chain for V3.0
      switch (currentState) {
          case 'RECOVERY_MODE':
              return trend === 'RISING' ? 'BUILDING_CAPACITY' : 'RECOVERY_MODE';
          
          case 'BUILDING_CAPACITY':
              return trend === 'FALLING' ? 'RECOVERY_MODE' : 'READY_FOR_LOAD';
              
          case 'READY_FOR_LOAD':
              // If we load today, tomorrow we might be recovering or metabolic
              return dayOffset === 1 ? 'METABOLIC_HEALTH' : 'READY_FOR_LOAD';
              
          case 'METABOLIC_HEALTH':
              return trend === 'RISING' ? 'PRIMED_TO_PERFORM' : 'BUILDING_CAPACITY';
              
          case 'PRIMED_TO_PERFORM':
              // Peak state usually followed by necessary recovery if leveraged
              return dayOffset === 1 ? 'RECOVERY_MODE' : 'PRIMED_TO_PERFORM';
              
          case 'OVERREACHING':
              return 'RECOVERY_MODE';
              
          default:
              return 'BUILDING_CAPACITY';
      }
  }

  /**
   * Maps a State to a Directive
   */
  private static determineDailyDirective(state: string, dayOffset: number): any { // Returns DailyDirective-like object
      let category = 'REGULATION';
      let stimulus = 'MAINTENANCE';
      
      switch (state) {
          case 'RECOVERY_MODE':
              category = 'REGULATION';
              stimulus = 'FLUSH';
              break;
          case 'BUILDING_CAPACITY':
              category = 'ENDURANCE';
              stimulus = 'MAINTENANCE';
              break;
          case 'READY_FOR_LOAD':
              category = 'STRENGTH';
              stimulus = 'OVERLOAD';
              break;
          case 'METABOLIC_HEALTH':
              category = 'ENDURANCE';
              stimulus = 'OVERLOAD';
              break;
          case 'PRIMED_TO_PERFORM':
              category = 'NEURAL';
              stimulus = 'TEST';
              break;
          case 'OVERREACHING':
              category = 'REGULATION';
              stimulus = 'FLUSH';
              break;
      }
      
      return {
          dayOffset,
          state,
          directive: {
              category,
              stimulus_type: stimulus
          },
          constraints: { 
              allow_impact: state !== 'RECOVERY_MODE', 
              required_equipment: [] 
          }
      };
  }

  /**
   * Construct the prompt for Gemini (The Oracle)
   * To be used by the API service
   */
  static constructOraclePrompt(stats: OperatorDailyStats): string {
      // V3 Prompt logic would go here
      return `
      Identify Operator State: ${stats.stats.systemStatus.current_state}
      Vitality: ${stats.stats.vitality}
      Capacity: ${stats.stats.adaptiveCapacity.current}
      Mission Vars: ${stats.missionVariables.join(', ')}
      
      Generate 3-Day Arc.
      `;
  }
}
