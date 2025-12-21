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
  // PRD §4.X.2 - Confidence (trust level)
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';  
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
   * PHASE 15 UPDATE: Metric-Specific Gating (Unavailable is Rare)
   */
  static calculate(stats: OperatorDailyStats, baselines: VitalityBaselines): VitalityResult {
    const hrv = stats.biometrics.hrv || 0;
    const rhr = stats.biometrics.restingHeartRate || 0;
    const sleepDur = stats.sleep.totalDurationSeconds || 0;

    const evidenceSummary: string[] = [];

    // --- 1. Metric-Specific Baseline Gating ---
    // Instead of a global gate, we validate each metric independently.
    const isHrvValid = (baselines.sampleCountHrv || 0) >= QUALITY_GATE.LOW;
    const isRhrValid = (baselines.sampleCountRhr || 0) >= QUALITY_GATE.LOW;
    const isSleepValid = (baselines.sampleCountSleep || 0) >= QUALITY_GATE.LOW;

    // --- 2. Input Availability & Fallback Policy ---
    
    // SLEEP: Strict Hierarchy (Measured > Estimated > Default)
    // Sleep is ALWAYS available in some form.
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

    // HRV & RHR: Must be present AND baseline-valid to contribute fully
    const hasHrv = hrv > 0 && isHrvValid;
    const hasRhr = rhr > 0 && isRhrValid;

    // --- 3. Global Availability Check ---
    // UNAVAILABLE only if BOTH HRV and RHR are missing/invalid.
    // Sleep alone is not enough for Vitality (needs some autonomic signal).
    if (!hasHrv && !hasRhr) {
         return {
            availability: 'UNAVAILABLE',
            unavailableReason: 'NO_AUTONOMIC_DATA',
            vitality: 0,
            scores: { hrv_score: 0, rhr_score: 0, sleep_score: 0 },
            zScores: { hrv: 0, rhr: 0, sleep: 0 },
            confidence: 'LOW',
            isEstimated: true,
            reasonCode: 'NO_DATA',
            evidenceSummary: [`No valid HRV or RHR data today.`]
        };
    }

    // --- 4. Partial Scoring Logic ---
    let weightedSum = 0;
    let totalWeight = 0;
    
    const scores = { hrv: 0, rhr: 0, sleep: 0 };
    const zScores = { hrv: 0, rhr: 0, sleep: 0 };
    
    // A) Sleep Score
    if (effectiveSleep > 0 && baselines.avgSleepSeconds > 0) {
         const sleepStdDev = baselines.stdDevSleep || (baselines.avgSleepSeconds * 0.1);
         const z = calculateZScore(effectiveSleep, baselines.avgSleepSeconds, sleepStdDev);
         scores.sleep = this.zScoreToScore(z);
         zScores.sleep = z;
         
         const sleepHours = (effectiveSleep / 3600).toFixed(1);
         
         if (sleepSource === 'MEASURED') {
             // Weight: 30% if we have HRV/RHR
             weightedSum += scores.sleep * 0.3;
             totalWeight += 0.3;
             
             if (z < -1) evidenceSummary.push(`Sleep short vs baseline (${sleepHours}h)`);
             else if (z > 0.5) evidenceSummary.push(`Sleep above baseline (${sleepHours}h)`);
             
         } else {
             // Estimated Sleep has lower weight (20%) to avoid skewing
             weightedSum += scores.sleep * 0.2;
             totalWeight += 0.2;
             evidenceSummary.push(`Sleep estimated (${sleepHours}h)`);
         }
    } else {
        // Should not happen due to default fallback
        scores.sleep = 50; 
    }

    // B) HRV Score (Primary Autonomic Signal)
    if (hasHrv) {
        const hrvStdDev = baselines.stdDevHrv || (baselines.avgHrv * 0.15);
        const z = calculateZScore(hrv, baselines.avgHrv, hrvStdDev);
        scores.hrv = this.zScoreToScore(z);
        zScores.hrv = z;
        
        // Weight: 40% (Primary)
        weightedSum += scores.hrv * 0.4;
        totalWeight += 0.4;
        
         if (z < -1) evidenceSummary.push(`HRV suppressed (${Math.round(hrv)}ms)`);
         else if (z > 1) evidenceSummary.push(`HRV elevated (${Math.round(hrv)}ms)`);
    } else if (hrv > 0 && !isHrvValid) {
        evidenceSummary.push(`HRV collecting baseline (${baselines.sampleCountHrv}/2)`);
    }

    // C) RHR Score (Secondary Autonomic Signal)
    if (hasRhr) {
         // Invert RHR Z-Score: Higher RHR = Lower Score (Uninverted Z)
         const rhrStdDev = baselines.stdDevRhr || (baselines.avgRhr * 0.1);
         const zRaw = calculateZScore(rhr, baselines.avgRhr, rhrStdDev);
         const zInverted = -zRaw; // IMPORTANT: Invert for RHR
         
         scores.rhr = this.zScoreToScore(zInverted);
         zScores.rhr = zRaw; // Store raw deviation direction (positive = elevated HR)

         // Weight: 30%
         weightedSum += scores.rhr * 0.3;
         totalWeight += 0.3;
         
         if (zRaw > 1) evidenceSummary.push(`RHR elevated (${Math.round(rhr)}bpm)`);
         else if (zRaw < -1) evidenceSummary.push(`RHR below baseline (${Math.round(rhr)}bpm)`);
    } else if (rhr > 0 && !isRhrValid) {
         evidenceSummary.push(`RHR collecting baseline (${baselines.sampleCountRhr}/2)`);
    }
    
    // --- 5. Normalization & Confidence ---
    let finalVitality = 0;
    if (totalWeight > 0) {
        finalVitality = weightedSum / totalWeight;
    }

    // Determine Final Confidence Level
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let reasonCode = 'OK';
    let isEstimatedComposite = false;

    // Rule: HIGH requires ALL metrics to be valid + MEASURED Sleep + High Sample Counts
    const allBaselinesHigh = (baselines.sampleCountHrv || 0) >= QUALITY_GATE.HIGH && 
                             (baselines.sampleCountRhr || 0) >= QUALITY_GATE.HIGH;

    if (hasHrv && hasRhr && sleepSource === 'MEASURED' && allBaselinesHigh) {
        confidence = 'HIGH';
    } else if (hasHrv || hasRhr) {
        confidence = 'MEDIUM';
        if (sleepSource !== 'MEASURED') {
            confidence = 'LOW'; // Demote if sleep is estimated
            reasonCode = 'SLEEP_ESTIMATED';
        }
    } else {
        confidence = 'LOW';
    }
    
    if (sleepSource !== 'MEASURED') {
        isEstimatedComposite = true;
    }

    // Cap at 100, floor at 1
    finalVitality = Math.max(1, Math.min(100, Math.round(finalVitality)));

    return {
      availability: 'AVAILABLE', // We strictly return AVAILABLE if we reached here
      vitality: finalVitality,
      scores: {
        hrv_score: Math.round(scores.hrv),
        rhr_score: Math.round(scores.rhr),
        sleep_score: Math.round(scores.sleep)
      },
      zScores: {
          hrv: Number(zScores.hrv.toFixed(2)),
          rhr: Number(zScores.rhr.toFixed(2)),
          sleep: Number(zScores.sleep.toFixed(2))
      },
      isEstimated: isEstimatedComposite,
      confidence,
      reasonCode,
      evidenceSummary
    };
  }

  // Linear Mapping: Z-Score +/- 2.5 SD map to 0-100
  // 0 SD = 50
  // +1 SD = 70
  // +2 SD = 90
  // -1 SD = 30
  // -2 SD = 10
  private static zScoreToScore(z: number): number {
      const score = 50 + (z * 20); 
      return clamp(score, 1, 100);
  }
}
