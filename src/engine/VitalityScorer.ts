import { OperatorDailyStats } from '../data/schema';
import { clamp, calculateZScore } from './math/Statistics';

export interface VitalityResult {
  vitality: number; // 0-100
  zScore: number;
  isEstimated: boolean;
}

export interface VitalityBaselines {
  avgHrv: number;
  avgRhr: number;
  stdDevHrv?: number;
}

export class VitalityScorer {
  /**
   * Calculates the Homeostatic Integrity (Vitality) score based on key biomarkers.
   * Formula: Weighted average of HRV Status, Sleep Quality, and RHR Status.
   */
  static calculate(stats: OperatorDailyStats, baselines: VitalityBaselines): VitalityResult {
    // 1. Extract Metrics
    const hrv = stats.biometrics.hrv || 0;
    const rhr = stats.biometrics.restingHeartRate || 0;
    const sleepScore = stats.sleep.score || 0;

    // 2. Validate Data
    if (hrv === 0 || rhr === 0) {
      return { vitality: 0, zScore: 0, isEstimated: true };
    }

    // 3. Calculate Component Scores (0-100)
    
    // HRV Score: Baseline is normal (50). 
    // If HRV > Baseline, Score > 50. If HRV < Baseline, Score < 50.
    // We use a simple ratio logic here, or Z-Score if stdDev is available.
    // For specific "Readiness" usually:
    // Raw Ratio approach:
    const hrvRatio = hrv / (baselines.avgHrv || 1);
    // Sigmoid-ish mapping: 1.0 -> 75, 1.3 -> 95, 0.7 -> 40
    let hrvScore = clamp(hrvRatio * 75, 0, 100); 
    // Penalize drastic drops more heavily
    if (hrvRatio < 0.8) hrvScore = hrvScore * 0.8; 

    // RHR Score: Lower is better.
    // Ratio = Today / Avg. 
    // 1.0 -> 75. 1.1 (Elevated) -> 50. 0.9 (Lower) -> 90.
    const rhrRatio = rhr / (baselines.avgRhr || 1);
    let rhrScore = 75;
    if (rhrRatio > 1.0) {
        // Elevated: Drop score
        rhrScore -= (rhrRatio - 1.0) * 200; // e.g. 1.1 -> 55 (-20)
    } else {
        // Lower: Boost score
        rhrScore += (1.0 - rhrRatio) * 100; // e.g. 0.9 -> 85 (+10)
    }
    rhrScore = clamp(rhrScore, 0, 100);

    // 4. Weighted Average
    // Weights: Sleep (40%), HRV (40%), RHR (20%)
    const vitality = (sleepScore * 0.4) + (hrvScore * 0.4) + (rhrScore * 0.2);

    // 5. Z-Score Calculation (Proxy via HRV for now as primary nervous system indicator)
    const zScore = baselines.stdDevHrv 
        ? calculateZScore(hrv, baselines.avgHrv, baselines.stdDevHrv)
        : 0;

    return {
      vitality: Math.round(vitality),
      zScore: Number(zScore.toFixed(2)),
      isEstimated: false // Computed successfully
    };
  }
}
