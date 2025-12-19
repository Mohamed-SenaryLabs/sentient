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
  static generateDayZeroContract(status: SystemStatus): LogicChainContract {
     // Default recommendations based on state
     let directive = "Establish baseline metrics. No high intensity.";
     let type = "CALIBRATION";
     
     if (status.current_state === 'RECOVERY_MODE') {
         directive = "System requires restoration. Rest authorized.";
         type = "REST";
     } else if (status.current_state === 'READY_FOR_LOAD') {
         directive = "System primed. Assessment protocol authorized.";
         type = "ASSESSMENT";
     }

     return {
         horizon: [
             {
                 dayOffset: 0,
                 state: status.current_state,
                 directive: {
                     category: 'REGULATION',
                     stimulus_type: 'TEST'
                 },
                 constraints: { allow_impact: true, required_equipment: [] }
             },
             {
                 dayOffset: 1,
                 state: 'CALCULATING',
                 directive: {
                     category: 'ENDURANCE',
                     stimulus_type: 'MAINTENANCE'
                 },
                 constraints: { allow_impact: true, required_equipment: [] }
             },
             {
                 dayOffset: 2,
                 state: 'CALCULATING',
                 directive: {
                     category: 'STRENGTH',
                     stimulus_type: 'OVERLOAD'
                 },
                 constraints: { allow_impact: true, required_equipment: [] }
             }
         ],
         // Legacy mapping
         state: status.current_state,
         dominant_factors: [],
         directive: {
             category: 'REGULATION',
             stimulus_type: 'TEST' 
         },
         quest_type: type,
         constraints: {
             allow_impact: true,
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
