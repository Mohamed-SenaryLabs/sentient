/**
 * State Engine (Layer 1: Intelligence)
 * 
 * Determines SystemStatus from Axes:
 * - current_state (Canonical V3 State)
 * - active_lens (Archetype/Operator Class)
 */

import { SystemStatus, OperatorDailyStats } from '../data/schema';

// V3 Canonical States
export type SystemState = 
  | 'READY_FOR_LOAD'     // Green: Balanced, high readiness
  | 'BUILDING_CAPACITY'  // Blue: Adaptation zone
  | 'NEEDS_STIMULATION'  // Yellow: Stagnation/Undertraining
  | 'HIGH_STRAIN'        // Orange: Warning zone
  | 'PHYSICAL_STRAIN'    // Red: Structural/Mechanical failure risk
  | 'RECOVERY_MODE';     // Purple: Sickness/Deep fatigue

export type Archetype = 
  | 'INITIATE'
  | 'TANK'
  | 'RANGER'
  | 'STRIKER'
  | 'PALADIN'
  | 'GLADIATOR'
  | 'GUARDIAN'
  | 'MONK'
  | 'NOMAD'
  | 'PHOENIX'
  | 'OPERATOR';

/**
 * Determine system state from axes
 * SINGLE SOURCE OF TRUTH for current_state
 */
export function determineSystemState(axes: SystemStatus['axes']): SystemState {
  const { metabolic, mechanical, neural, recovery, regulation } = axes;
  const allLoadAxes = Math.max(metabolic, mechanical, neural);

  // 1. RECOVERY_MODE (Critical Failure / Sickness)
  // Replaces SYSTEM_REBOOT
  if (regulation > 80 || (recovery < 30 && allLoadAxes > 50)) return 'RECOVERY_MODE';

  // 2. PHYSICAL_STRAIN (Injury Risk)
  // Replaces STRUCTURAL_FAILURE
  if (mechanical > 85 && recovery < 50) return 'PHYSICAL_STRAIN';

  // 3. HIGH_STRAIN (Overreaching)
  // Replaces CNS_FRY / SYSTEM_OVERLOAD
  if ((neural > 85 || allLoadAxes > 90) && recovery < 60) return 'HIGH_STRAIN';

  // 4. BUILDING_CAPACITY (Positive Adaptation)
  // Replaces ADAPTATION
  if (recovery > 60 && (metabolic > 60 || mechanical > 60)) return 'BUILDING_CAPACITY';

  // 5. NEEDS_STIMULATION (Undertraining)
  // Replaces STAGNATION
  // High outcome (recovery) but low input (load)
  if (allLoadAxes < 30 && recovery > 70) return 'NEEDS_STIMULATION';

  // Default: Balanced State
  return 'READY_FOR_LOAD';
}

/**
 * Determine archetype lens
 */
export function determineArchetypeLens(
  axes: SystemStatus['axes'],
  context: {
    sleepHours: number;
    steps: number;
    workouts: OperatorDailyStats['activity']['workouts'];
    locationChanged?: boolean;
  }
): Archetype {
  const { metabolic, mechanical, neural, recovery, regulation } = axes;

  // Context Overrides
  if (context.sleepHours < 5 && context.steps > 6000) return 'GUARDIAN';

  const hasRehab = context.workouts.some(w => 
    w.type.toLowerCase().includes('therapy') || w.type.toLowerCase().includes('rehab')
  );
  if (hasRehab) return 'PHOENIX';

  if (context.locationChanged) return 'NOMAD';

  // Axis Dominance
  const allHigh = [metabolic, mechanical, neural, regulation].every(val => val > 70);
  if (allHigh) return 'GLADIATOR';

  const highestVal = Math.max(metabolic, mechanical, neural, regulation);
  
  if (highestVal === neural) return 'STRIKER';
  if (highestVal === mechanical) return context.steps > 12000 ? 'PALADIN' : 'TANK';
  if (highestVal === metabolic) return 'RANGER';
  if (highestVal === regulation) return 'MONK';

  return 'INITIATE';
}

/**
 * Create SystemStatus
 */
export function createSystemStatus(
  axes: SystemStatus['axes'],
  context: {
    sleepHours: number;
    steps: number;
    workouts: OperatorDailyStats['activity']['workouts'];
    locationChanged?: boolean;
  },
  history?: SystemStatus[]
): SystemStatus {
  const current_state = determineSystemState(axes);
  const active_lens = determineArchetypeLens(axes, context);
  
  // Calculate specific confidence/validity logic here if needed (simplified for V3 Greenfield)
  const state_confidence = 80; 
  const archetype_confidence = 70;
  
  return {
    axes,
    current_state,
    active_lens,
    state_confidence,
    archetype_confidence,
    valid_from: new Date().toISOString(),
    valid_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}
