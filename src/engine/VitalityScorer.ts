import { OperatorDailyStats, Availability } from '../data/schema';
// Local Math Helpers to avoid dependency issues
function clamp(val: number, min: number, max: number): number {
    return Math.min(Math.max(val, min), max);
}

function calculateZScore(val: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return (val - mean) / stdDev;
}

export interface VitalityResult {
  // PRD §4.X.2 - Availability (computed or not)
  availability: Availability;
  unavailableReason?: string;
  
  // Computed values (only valid if availability === 'AVAILABLE')
  vitality: number; // 1-100
  scores: {
      hrv_score: number;
      rhr_score: number;
      sleep_score: number;
  };
  zScores: {
      hrv: number;
      rhr: number;
      sleep: number;
  };
  
  // PRD §4.X.2 - Confidence (trust level)
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  isEstimated: boolean;
  reasonCode?: string;
  
  // PRD §4.X.6 - Evidence Summary (3-5 bullets)
  evidenceSummary: string[];
}

export interface VitalityBaselines {
  avgHrv: number;
  stdDevHrv?: number;
  sampleCountHrv?: number;   // PRD §4.X.1
  coverageHrv?: number;
  
  avgRhr: number;
  stdDevRhr?: number;
  sampleCountRhr?: number;
  coverageRhr?: number;

  avgSleepSeconds: number;
  stdDevSleep?: number;
  sampleCountSleep?: number;
  coverageSleep?: number;
}

// PRD §4.X.1 - Confidence thresholds
const QUALITY_GATE = {
  LOW: 2,
  MEDIUM: 14,
  HIGH: 21
};

export class VitalityScorer {
  /**
   * Calculates Vitality (1-100) using strict Z-score statistical analysis.
   * Implements PRD §4.X Baseline Quality & Confidence Rules.
   */
  static calculate(stats: OperatorDailyStats, baselines: VitalityBaselines): VitalityResult {
    const hrv = stats.biometrics.hrv || 0;
    const rhr = stats.biometrics.restingHeartRate || 0;
    const sleepDur = stats.sleep.totalDurationSeconds || 0;

    const evidenceSummary: string[] = [];

    // --- PRD §4.X.1: Check Baseline Quality Gates ---
    const hrvSampleCount = baselines.sampleCountHrv || 0;
    const rhrSampleCount = baselines.sampleCountRhr || 0;
    const sleepSampleCount = baselines.sampleCountSleep || 0;
    
    // Compute maximum possible confidence from baseline quality
    let baselineConfidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    const minSamples = Math.min(hrvSampleCount, rhrSampleCount, sleepSampleCount);
    
    if (minSamples >= QUALITY_GATE.HIGH) {
      baselineConfidence = 'HIGH';
    } else if (minSamples >= QUALITY_GATE.MEDIUM) {
      baselineConfidence = 'MEDIUM';
    } else if (minSamples >= QUALITY_GATE.LOW) {
      baselineConfidence = 'LOW';
    } else {
      // Insufficient baseline data
      return {
        availability: 'UNAVAILABLE',
        unavailableReason: 'INSUFFICIENT_BASELINE',
        vitality: 0,
        scores: { hrv_score: 0, rhr_score: 0, sleep_score: 0 },
        zScores: { hrv: 0, rhr: 0, sleep: 0 },
        confidence: 'LOW',
        isEstimated: true,
        reasonCode: 'INSUFFICIENT_BASELINE',
        evidenceSummary: [`Baseline data insufficient (${minSamples}/${QUALITY_GATE.LOW} days needed)`]
      };
    }

    evidenceSummary.push(`Baseline quality: n=${minSamples} days`);

    let confidence = baselineConfidence;
    let reasonCode: string | undefined = undefined;
    let isEstimated = false;

    // --- Z-Score Calculations ---

    // 1. Sleep (Basis of Recovery)
    let sleepScore = 50;
    let sleepZ = 0;
    
    // Fallback Hierarchy: Measured -> 7-Day Avg -> Default 6h
    let effectiveSleep = sleepDur;
    let sleepSource: 'MEASURED' | 'ESTIMATED_7D' | 'DEFAULT_6H' = 'MEASURED';
    
    if (effectiveSleep === 0) {
        if (baselines.avgSleepSeconds > 0) {
            effectiveSleep = baselines.avgSleepSeconds;
            sleepSource = 'ESTIMATED_7D';
        } else {
            effectiveSleep = 21600; // 6 hours default
            sleepSource = 'DEFAULT_6H';
        }
    }

    if (effectiveSleep > 0 && baselines.avgSleepSeconds > 0) {
        const sleepStdDev = baselines.stdDevSleep || (baselines.avgSleepSeconds * 0.1);
        sleepZ = calculateZScore(effectiveSleep, baselines.avgSleepSeconds, sleepStdDev);
        sleepScore = this.zScoreToScore(sleepZ);
        
        // Evidence
        const sleepHours = Math.round(effectiveSleep / 3600 * 10) / 10;
        const baselineHours = Math.round(baselines.avgSleepSeconds / 3600 * 10) / 10;
        
        if (sleepSource === 'MEASURED') {
            if (sleepZ < -1) {
                evidenceSummary.push(`Sleep short vs baseline (${sleepHours}h vs ${baselineHours}h avg)`);
            } else if (sleepZ > 0.5) {
                evidenceSummary.push(`Sleep above baseline (${sleepHours}h vs ${baselineHours}h avg)`);
            }
        } else if (sleepSource === 'ESTIMATED_7D') {
            isEstimated = true;
            reasonCode = 'SLEEP_ESTIMATED';
            evidenceSummary.push(`Sleep estimated from 7-day avg (${sleepHours}h)`);
        } else {
            isEstimated = true;
            reasonCode = 'SLEEP_DEFAULT';
            evidenceSummary.push('Sleep defaulting to 6h (no data)');
        }
    } else {
         // Should technically be unreachable given the fallback to 21600, 
         // but handles case if baseline avg is somehow 0
         sleepScore = 50; 
         isEstimated = true;
         evidenceSummary.push('Sleep data unavailable');
    }

    // 2. RHR (Cardiovascular Load)
    let rhrScore = 50;
    let rhrZ = 0;
    if (rhr > 0 && baselines.avgRhr > 0) {
        const rhrStdDev = baselines.stdDevRhr || (baselines.avgRhr * 0.1);
        rhrZ = (baselines.avgRhr - rhr) / rhrStdDev; // Inverted: Lower RHR is better
        rhrScore = this.zScoreToScore(rhrZ);
        
        // Evidence
        if (rhrZ < -1) {
          evidenceSummary.push(`RHR elevated (${rhr} vs ${baselines.avgRhr} avg)`);
        }
    } else {
        if (confidence !== 'LOW') {
          confidence = 'MEDIUM';
          reasonCode = "RHR_DATA_MISSING";
        }
        isEstimated = true;
    }

    // 3. HRV (Nervous System) - The "Gold Standard"
    let hrvScore = 50;
    let hrvZ = 0;
    const hasHrv = hrv > 0 && baselines.avgHrv > 0;

    if (hasHrv) {
        const hrvStdDev = baselines.stdDevHrv || (baselines.avgHrv * 0.15);
        hrvZ = calculateZScore(hrv, baselines.avgHrv, hrvStdDev);
        hrvScore = this.zScoreToScore(hrvZ);
        
        // Evidence
        if (hrvZ < -1) {
          evidenceSummary.push(`HRV below baseline (${hrv}ms vs ${baselines.avgHrv}ms avg)`);
        } else if (hrvZ > 0.5) {
          evidenceSummary.push(`HRV above baseline (${hrv}ms vs ${baselines.avgHrv}ms avg)`);
        }
    } else {
        confidence = 'LOW';
        reasonCode = "HRV_MISSING";
        isEstimated = true;
        evidenceSummary.push("HRV unavailable today");
    }

    // --- Final Algorithm Selection ---

    let weightedSum = 0;

    if (hasHrv) {
        // STANDARD FORMULA (40/40/20)
        weightedSum = (sleepScore * 0.4) + (hrvScore * 0.4) + (rhrScore * 0.2);
    } else if (!hasHrv && effectiveSleep > 0 && rhr > 0) {
        // FALLBACK A: NO HRV (60/40) with penalty
        const rawScore = (sleepScore * 0.6) + (rhrScore * 0.4);
        weightedSum = rawScore * 0.95; 
        if (!reasonCode) reasonCode = "ESTIMATED_NO_HRV";
    } else {
        // PRD §4.X.4: CRITICAL DATA LOSS
        return {
            availability: 'UNAVAILABLE',
            unavailableReason: 'INSUFFICIENT_DATA',
            vitality: 0,
            scores: { hrv_score: 0, rhr_score: 0, sleep_score: 0 },
            zScores: { hrv: 0, rhr: 0, sleep: 0 },
            isEstimated: true,
            confidence: 'LOW',
            reasonCode: "INSUFFICIENT_DATA",
            evidenceSummary: ['Insufficient biometric data for scoring']
        };
    }

    return {
      availability: 'AVAILABLE',
      vitality: Math.round(clamp(weightedSum, 1, 100)),
      scores: {
          hrv_score: Math.round(hrvScore),
          rhr_score: Math.round(rhrScore),
          sleep_score: Math.round(sleepScore)
      },
      zScores: {
          hrv: Number(hrvZ.toFixed(2)),
          rhr: Number(rhrZ.toFixed(2)),
          sleep: Number(sleepZ.toFixed(2))
      },
      isEstimated,
      confidence,
      reasonCode,
      evidenceSummary
    };
  }

  /**
   * Maps a Z-Score to a 1-100 Scale.
   * Floor is strictly 1.
   */
  private static zScoreToScore(z: number): number {
      const score = (z + 2) * 25;
      return clamp(score, 1, 100);
  }
}
