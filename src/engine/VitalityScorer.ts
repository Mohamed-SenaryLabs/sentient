import { OperatorDailyStats } from '../data/schema';
// Local Math Helpers to avoid dependency issues
function clamp(val: number, min: number, max: number): number {
    return Math.min(Math.max(val, min), max);
}

function calculateZScore(val: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return (val - mean) / stdDev;
}

export interface VitalityResult {
  vitality: number; // 0-100 (Homeostatic Integrity)
  scores: {
      hrv_score: number;
      rhr_score: number;
      sleep_score: number;
  };
  zScores: {
      hrv: number;
      rhr: number;
  };
  isEstimated: boolean;
}

export interface VitalityBaselines {
  avgHrv: number;
  stdDevHrv?: number;
  
  avgRhr: number;
  stdDevRhr?: number;

  avgSleepSeconds: number;
}

export class VitalityScorer {
  /**
   * Calculates Vitality (0-100) using strict Z-score statistical analysis.
   * PRD v3.0 Section 4.1: (Sleep * 0.4) + (HRV * 0.4) + (RHR * 0.2)
   */
  static calculate(stats: OperatorDailyStats, baselines: VitalityBaselines): VitalityResult {
    const hrv = stats.biometrics.hrv || 0;
    const rhr = stats.biometrics.restingHeartRate || 0;
    const sleepScore = stats.sleep.score || 50; // Fallback to 50 if missing

    // 1. Data Validation
    if (hrv === 0 || !baselines.avgHrv) {
        return { 
            vitality: 50, 
            scores: { hrv_score: 50, rhr_score: 50, sleep_score: 50 },
            zScores: { hrv: 0, rhr: 0 }, 
            isEstimated: true 
        };
    }

    // 2. HRV Analysis (Primary Nervous System Indicator)
    const hrvStdDev = baselines.stdDevHrv || (baselines.avgHrv * 0.15); 
    const hrvZ = calculateZScore(hrv, baselines.avgHrv, hrvStdDev);
    const hrvScore = this.zScoreToScore(hrvZ); 

    // 3. RHR Analysis (Cardiovascular Efficiency)
    // If RHR is missing (0), assume neutral (50) and mark as estimated.
    let rhrScore = 50;
    let rhrZ = 0;
    
    if (rhr > 0) {
        const rhrStdDev = baselines.stdDevRhr || (baselines.avgRhr * 0.1); 
        rhrZ = (baselines.avgRhr - rhr) / rhrStdDev; 
        rhrScore = this.zScoreToScore(rhrZ);
    }

    // 4. Weighted Calculation
    const weightedSum = (sleepScore * 0.4) + (hrvScore * 0.4) + (rhrScore * 0.2);

    return {
      vitality: Math.round(clamp(weightedSum, 0, 100)),
      scores: {
          hrv_score: Math.round(hrvScore),
          rhr_score: Math.round(rhrScore),
          sleep_score: Math.round(sleepScore)
      },
      zScores: {
          hrv: Number(hrvZ.toFixed(2)),
          rhr: Number(rhrZ.toFixed(2))
      },
      isEstimated: rhr === 0 // True if RHR was missing
    };
  }

  /**
   * Maps a Z-Score to a 0-100 Scale.
   * 0 (Baseline) -> 50
   * +2.0 (Sigma) -> 100
   * -2.0 (Sigma) -> 0
   */
  private static zScoreToScore(z: number): number {
      // Linear map between -2 and +2
      // -2 = 0, +2 = 100. Range 4.
      // (z + 2) * 25
      const score = (z + 2) * 25;
      return clamp(score, 1, 100);
  }
}
