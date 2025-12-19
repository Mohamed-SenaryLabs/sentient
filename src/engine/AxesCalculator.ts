/**
 * The Physics Engine (Axes Calculator)
 * 
 * Ingests raw data and calculates the 5-Axis System Status
 */

import { OperatorDailyStats, SystemStatus } from '../data/schema';
import { normalizeToGauge, clamp } from './math/Statistics';
import { createSystemStatus } from './StateEngine';

export interface AxesHistory {
  avgSteps: number;
  avgActiveCalories: number;
  avgSleepSeconds: number;
  avgHrv: number;
  avgRhr: number;
  avgMetabolicLoad: number;
}

const DEFAULT_BASELINES: AxesHistory = {
  avgSteps: 8000,
  avgActiveCalories: 500,
  avgSleepSeconds: 7 * 3600,
  avgHrv: 50,
  avgRhr: 60,
  avgMetabolicLoad: 500,
};

function getActivityLoad(workoutType: string): {
  metabolic: number;
  mechanical: number;
  neural: number;
  regulation: number;
} {
  const type = workoutType.toLowerCase();
  
  if (type.includes('run') || type.includes('cycling') || type.includes('swim') || 
      type.includes('hiking') || type.includes('rowing')) {
    return { metabolic: 1.5, mechanical: 0.3, neural: 0.2, regulation: 0 };
  }
  
  if (type.includes('strength') || type.includes('weight') || type.includes('lift') ||
      type.includes('crossfit') || type.includes('functional')) {
    return { metabolic: 0.5, mechanical: 2.0, neural: 0.5, regulation: 0 };
  }
  
  if (type.includes('hiit') || type.includes('sprint') || type.includes('plyometric') ||
      type.includes('boxing') || type.includes('martial')) {
    return { metabolic: 1.0, mechanical: 0.5, neural: 2.0, regulation: 0 };
  }
  
  if (type.includes('yoga') || type.includes('pilates') || type.includes('stretch') ||
      type.includes('meditation') || type.includes('breathwork')) {
    return { metabolic: 0.2, mechanical: 0.1, neural: 0.1, regulation: 1.5 };
  }
  
  return { metabolic: 0.8, mechanical: 0.5, neural: 0.3, regulation: 0.2 };
}

function calculateTrends(
  currentAxes: SystemStatus['axes'],
  previousAxes?: SystemStatus['axes']
): {
  recovery_trend: 'RISING' | 'FALLING' | 'STABLE';
  load_trend: 'RISING' | 'FALLING' | 'STABLE';
} {
  if (!previousAxes) {
    return { recovery_trend: 'STABLE', load_trend: 'STABLE' };
  }
  
  const recoveryDiff = currentAxes.recovery - previousAxes.recovery;
  const loadDiff = Math.max(
    currentAxes.metabolic - previousAxes.metabolic,
    currentAxes.mechanical - previousAxes.mechanical,
    currentAxes.neural - previousAxes.neural
  );
  
  return {
    recovery_trend: recoveryDiff > 5 ? 'RISING' : recoveryDiff < -5 ? 'FALLING' : 'STABLE',
    load_trend: loadDiff > 10 ? 'RISING' : loadDiff < -10 ? 'FALLING' : 'STABLE',
  };
}

export function calculateAxes(
  stats: OperatorDailyStats,
  history: AxesHistory = DEFAULT_BASELINES,
  previousSystemStatus?: SystemStatus
): {
  systemStatus: SystemStatus;
  trends: {
    recovery_trend: 'RISING' | 'FALLING' | 'STABLE';
    load_trend: 'RISING' | 'FALLING' | 'STABLE';
  };
} {
  const workouts = stats.activity.workouts || [];
  
  // 1. Metabolic
  const metabolicScore = normalizeToGauge(
    stats.activity.activeCalories,
    history.avgActiveCalories,
    2.5
  );
  
  // 2. Mechanical
  const stepsScore = normalizeToGauge(stats.activity.steps, history.avgSteps, 2.0);
  
  let totalMechanical = 0;
  workouts.forEach(workout => {
    const load = getActivityLoad(workout.type);
    const durationMin = workout.durationSeconds / 60;
    totalMechanical += (load.mechanical * durationMin);
  });
  
  const mechanicalLoadScore = clamp((totalMechanical / 3000) * 100, 0, 100);
  const mechanicalAxis = (stepsScore * 0.4) + (mechanicalLoadScore * 0.6);
  
  // 3. Neural
  let totalNeural = 0;
  workouts.forEach(workout => {
    const load = getActivityLoad(workout.type);
    const durationMin = workout.durationSeconds / 60;
    totalNeural += (load.neural * durationMin);
  });
  
  let neuralAxis = clamp((totalNeural / 2000) * 100, 0, 100);
  
  const hrvRatio = stats.biometrics.hrv / history.avgHrv;
  if (hrvRatio < 0.85) {
    neuralAxis *= 1.3; 
  }
  neuralAxis = clamp(neuralAxis, 0, 100);
  
  // 4. Recovery
  const sleepScore = stats.sleep.score || 50;
  const rhrRatio = stats.biometrics.restingHeartRate / history.avgRhr;
  let rhrScore = 100;
  if (rhrRatio > 1.05) rhrScore = 60; // Elevated RHR penalty
  if (rhrRatio > 1.1) rhrScore = 30; // High RHR penalty
  
  const recoveryAxis = (sleepScore * 0.5) + (rhrScore * 0.3) + (hrvRatio * 100 * 0.2);
  
  // 5. Regulation
  const mindfulMins = stats.mindfulMinutes || 0;
  const mindfulScore = normalizeToGauge(mindfulMins, 30, 1.0);
  
  let totalRegulation = 0;
  workouts.forEach(workout => {
    const load = getActivityLoad(workout.type);
    const durationMin = workout.durationSeconds / 60;
    totalRegulation += (load.regulation * durationMin);
  });
  
  const regulationLoadScore = clamp((totalRegulation / 2000) * 100, 0, 100);
  const regulationAxis = clamp(mindfulScore + regulationLoadScore, 0, 100);
  
  const axes = {
    metabolic: Math.round(metabolicScore),
    mechanical: Math.round(mechanicalAxis),
    neural: Math.round(neuralAxis),
    recovery: Math.round(recoveryAxis),
    regulation: Math.round(regulationAxis),
  };
  
  const systemStatus = createSystemStatus(
    axes,
    {
      sleepHours: stats.sleep.totalDurationSeconds / 3600,
      steps: stats.activity.steps,
      workouts: workouts,
      locationChanged: false, 
    },
    previousSystemStatus ? [previousSystemStatus] : undefined
  );
  
  const trends = calculateTrends(axes, previousSystemStatus?.axes);
  
  return {
    systemStatus,
    trends,
  };
}
