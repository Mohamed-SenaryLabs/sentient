/**
 * Alignment Tracker (Layer 3 Helper)
 * 
 * Determines if the Operator successfully adhered to the Daily Directive.
 * "We do not reward effort. We reward alignment."
 */

import { ActivityData, DailyDirective, LogicChainContract } from '../data/schema';

export function checkDailyAlignment(
  actual: ActivityData, 
  contract: LogicChainContract
): 'ALIGNED' | 'MISALIGNED' | 'PENDING' {
  
  const directive = contract.directive;
  
  // 1. If no directive, undefined
  if (!directive) return 'PENDING';

  // 2. Check Constraints (Universal)
  // If HR Cap Exceeded -> Misaligned (regardless of effort)
//   if (contract.constraints.heart_rate_cap) {
//       const maxHR = Math.max(...actual.workouts.map(w => w.maxHeartRate || 0));
//       if (maxHR > contract.constraints.heart_rate_cap) {
//           // Strict adherence? Maybe later. For now, let's be lenient on accidental spikes.
//       }
//   }

  // 3. Logic by Stimulus Type
  switch (directive.stimulus_type) {
    case 'FLUSH':
      // Goal: Low exertion
      // Fail if: Too much intense activity
      if (actual.activeCalories > 600) return 'MISALIGNED'; // Hard cap for rest days
      // Also fail if recorded a "High Intensity" workout
      const hasIntenseWorkout = actual.workouts.some(w => 
        w.avgHeartRate && w.avgHeartRate > 130
      );
      if (hasIntenseWorkout) return 'MISALIGNED';
      return 'ALIGNED';

    case 'MAINTENANCE':
      // Goal: Moderate exertion
      // Pass if: Moderate activity (arbitrary thresholds for MVP)
      if (actual.activeCalories > 300) return 'ALIGNED';
      return 'MISALIGNED';

    case 'OVERLOAD':
    case 'TEST':
      // Goal: High exertion
      // Pass if: High calories OR High intensity workout
      if (actual.activeCalories > 600) return 'ALIGNED';
      const hasHardWorkout = actual.workouts.some(w => 
        w.activeCalories > 300 || (w.avgHeartRate && w.avgHeartRate > 140)
      );
      if (hasHardWorkout) return 'ALIGNED';
      return 'MISALIGNED';
      
    default:
      return 'ALIGNED';
  }
}
