/**
 * Progression Engine (Layer 3)
 * 
 * Handles Alignment Score and Rank determination.
 * "We do not level up by grinding. We level up by consistency."
 */

import { OperatorDailyStats } from '../data/schema';

export type ConsistencyRank = 
  | 'OPERATOR'       // 90-100%
  | 'CANDIDATE'      // 70-89%
  | 'UNCALIBRATED';  // <70%

export interface ProgressionResult {
  alignmentScore: number; // 0-100
  rank: ConsistencyRank;
  consistencyStreak: number;
}

/**
 * Calculate Alignment Score based on last 30 days history
 */
export function calculateProgression(
  history: OperatorDailyStats[] // Last 30 days
): ProgressionResult {
  if (!history || history.length === 0) {
    return {
      alignmentScore: 0,
      rank: 'UNCALIBRATED',
      consistencyStreak: 0
    };
  }

  // 1. Calculate Alignment Score (Percentage of ALIGNED days)
  // We look at the 'alignmentStatus' of each day.
  // Note: alignmentStatus needs to be stored in stats.stats.alignmentStatus in schema (I added it in schema?)
  // Checking schema... yes, I added `alignmentStatus?: 'ALIGNED' | 'MISALIGNED';` to stats.
  
  const window = history.slice(0, 30); // Ensure max 30
  const alignedDays = window.filter(day => day.stats.alignmentStatus === 'ALIGNED').length;
  const alignmentScore = Math.round((alignedDays / window.length) * 100);

  // 2. Determine Rank
  let rank: ConsistencyRank = 'UNCALIBRATED';
  if (alignmentScore >= 90) rank = 'OPERATOR';
  else if (alignmentScore >= 70) rank = 'CANDIDATE';

  // 3. Calculate Streak
  // Count backwards from most recent
  let streak = 0;
  for (const day of history) { // Assuming history is sorted NEWEST first
    if (day.stats.alignmentStatus === 'ALIGNED') {
      streak++;
    } else {
      break;
    }
  }

  return {
    alignmentScore,
    rank,
    consistencyStreak: streak
  };
}
