/**
 * Intelligence Planner (Layer 2)
 * 
 * Manages the Logic Chain Contract and 3-Day Strategic Arc.
 * Interfaces with the Oracle (Gemini) or falls back to static logic.
 */

import { LogicChainContract, OperatorDailyStats, SystemStatus } from '../data/schema';

export class Planner {
  /**
   * Generates a "Day Zero" contract for immediate use
   * Used when no API is available or for first launch
   */
  /**
   * Generates the 3-Day Strategic Arc (Today, Tomorrow, Horizon)
   * Based on current System Status and Recovery Trends
   */
  static generateStrategicArc(status: SystemStatus, trends?: { recovery_trend: 'RISING' | 'FALLING' | 'STABLE' }): LogicChainContract {
     const todayContract = this.determineDailyDirective(status.current_state, 0);
     
     // FORECAST TOMORROW (Day 1)
     const tomorrowState = this.predictNextState(status.current_state, trends?.recovery_trend || 'STABLE', 1);
     const tomorrowContract = this.determineDailyDirective(tomorrowState, 1);
     
     // FORECAST HORIZON (Day 2)
     const horizonState = this.predictNextState(tomorrowState, trends?.recovery_trend || 'STABLE', 2);
     const horizonContract = this.determineDailyDirective(horizonState, 2);

     return {
         horizon: [todayContract, tomorrowContract, horizonContract],
         
         // Legacy mapping for compatibility
         state: status.current_state,
         dominant_factors: [],
         directive: todayContract.directive,
         quest_type: todayContract.directive.stimulus_type,
         constraints: todayContract.constraints
     };
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
