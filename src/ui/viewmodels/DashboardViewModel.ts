/**
 * DashboardViewModel — Transforms OperatorDailyStats + history → UI-ready fields for BiologyScreen
 * 
 * This is the single source of truth for all display logic on the Dashboard screen.
 * BiologyScreen should receive this view model and render it without any business logic.
 */

import { OperatorDailyStats } from '../../data/schema';
import { colors, confidenceStyles } from '../theme/tokens';

// ============================================
// VIEW DATA INTERFACES
// ============================================

export interface ConfidenceBadge {
  text: string;
  backgroundColor: string;
  borderColor: string;
}

export interface MetricDisplay {
  baseline: string;
  today: string;
  zLabel: string;
}

export interface SleepDisplay {
  today: string;
  baseline: string;
  delta: string;
  deltaColor: string;
  source: string;
}

export interface MovementMetricDisplay {
  baseline: string;
  today: string;
  trend: string;
}

export interface LoadDisplay {
  levelLabel: string;
  levelColor: string;
  detail: string;
  trend: string;
}

export interface StressDisplay {
  avg: string;
  high: string;
  low: string;
  elevated: string;
}

export interface LogItem {
  id: string;
  type: 'WORKOUT' | 'RECOVERY';
  label: string;
  dateDisplay: string;
  value: string;
  duration: string | null;
  hrRange: string | null;
  dotColor: string;
}

export interface TraceData {
  directiveLabel: string;
  horizonDays: { dayOffset: number; label: string; state: string | null }[];
  vitalityScore: number;
  vitalityConfidence: string;
  vitalityZScore: string | null;
  isVitalityEstimated: boolean;
  evidenceSummary: string[];
  systemState: string;
  activeLens: string;
  dominantAxes: string[];
  dominantFactors: string[];
  analystInsight: string | null;
  constraints: {
    allowImpact: boolean;
    hrCap: string | null;
    equipment: string[];
  } | null;
  loadDensity: string | null;
  loadTrend: string;
}

export interface DashboardViewData {
  // Loading state
  isLoading: boolean;
  loadingText: string;
  
  // Header
  confidenceBadge: ConfidenceBadge | null;
  
  // Recovery section
  hrv: MetricDisplay;
  rhr: MetricDisplay;
  sleep: SleepDisplay;
  
  // Movement section
  steps: MovementMetricDisplay;
  activeBurn: MovementMetricDisplay;
  
  // Load section
  load: LoadDisplay;
  
  // Stress section (optional)
  stress: StressDisplay | null;
  
  // Constitution section
  vo2Max: string;
  vo2MaxTrend: string;
  weightLeanMass: string;
  weightTrend: string;
  
  // Log section
  logItems: LogItem[];
  
  // Decision trace
  trace: TraceData;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getZLabel(z: number): string {
  if (z > 0.5) return 'Above';
  if (z < -0.5) return 'Below';
  return 'Stable';
}

function getTrendLabel(trend?: 'RISING' | 'FALLING' | 'STABLE'): string {
  if (trend === 'RISING') return '↗︎';
  if (trend === 'FALLING') return '↘︎';
  return '→';
}

function getLoadLevel(density: number): { label: string; color: string } {
  if (density > 25) return { label: 'High', color: colors.accent.strain };
  if (density > 15) return { label: 'Moderate', color: colors.accent.caution };
  return { label: 'Low', color: colors.accent.primary };
}

function formatWorkoutType(type: string): string {
  if (type.includes('High Intensity')) return 'HIIT';
  if (type.includes('Functional')) return 'Functional';
  if (type.includes('Traditional')) return 'Strength';
  if (type.includes('Running')) return 'Run';
  if (type.includes('Walking')) return 'Walk';
  return type.replace('Traditional ', '').replace('Training', '');
}

function getConfidenceStyle(confidence: string): ConfidenceBadge {
  const styles = confidenceStyles[confidence as keyof typeof confidenceStyles];
  if (styles) {
    return { 
      text: confidence, 
      backgroundColor: styles.backgroundColor, 
      borderColor: styles.borderColor 
    };
  }
  return { 
    text: confidence, 
    backgroundColor: `${colors.text.secondary}20`, 
    borderColor: colors.text.secondary 
  };
}

function formatSleepSource(source?: string): string {
  switch (source) {
    case 'MEASURED': return 'Measured';
    case 'ESTIMATED_7D': return 'Estimated (7-day)';
    case 'DEFAULT_6H': return 'Default (6h)';
    default: return 'Manual';
  }
}

// Intermediate type for log item processing
interface RawLogItem {
  type: 'WORKOUT' | 'RECOVERY';
  label: string;
  date: string;
  value: number;
  duration: number;
  minHr: number | undefined;
  maxHr: number | undefined;
  id: string;
}

function buildLogItems(
  stats: OperatorDailyStats, 
  history: OperatorDailyStats[]
): LogItem[] {
  const allDays = [stats, ...history];
  
  const allItems: RawLogItem[] = [];
  
  for (const day of allDays) {
    if (day.activity.workouts.length > 0) {
      for (const workout of day.activity.workouts) {
        allItems.push({
          type: 'WORKOUT',
          label: formatWorkoutType(workout.type),
          date: day.date,
          value: workout.activeCalories,
          duration: workout.durationSeconds,
          minHr: workout.minHeartRate,
          maxHr: workout.maxHeartRate,
          id: workout.id
        });
      }
    } else {
      allItems.push({
        type: 'RECOVERY',
        label: 'Recovery',
        date: day.date,
        value: day.activity.activeCalories,
        duration: 0,
        minHr: undefined,
        maxHr: undefined,
        id: day.date + '_rec'
      });
    }
  }

  // Deduplicate by ID
  const uniqueItems = Array.from(new Map(allItems.map(item => [item.id, item])).values());

  return uniqueItems
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .map(item => ({
      id: item.id,
      type: item.type,
      label: item.label,
      dateDisplay: new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
      value: `${Math.round(item.value)} kcal`,
      duration: item.duration ? `${Math.round(item.duration / 60)} min` : null,
      hrRange: (item.minHr !== undefined && item.maxHr !== undefined) 
        ? `${item.minHr}-${item.maxHr} bpm` 
        : null,
      dotColor: item.type === 'WORKOUT' ? colors.accent.primary : colors.border.default,
    }));
}

// ============================================
// VIEW MODEL FACTORY
// ============================================

export function createDashboardViewModel(
  stats: OperatorDailyStats | null,
  history: OperatorDailyStats[]
): DashboardViewData {
  // Loading state
  if (!stats) {
    return {
      isLoading: true,
      loadingText: 'ACCESSING BIOLOGY...',
      confidenceBadge: null,
      hrv: { baseline: '-', today: '-', zLabel: '' },
      rhr: { baseline: '-', today: '-', zLabel: '' },
      sleep: { today: '-', baseline: '-', delta: '-', deltaColor: colors.text.secondary, source: '' },
      steps: { baseline: '-', today: '-', trend: '' },
      activeBurn: { baseline: '-', today: '-', trend: '' },
      load: { levelLabel: '-', levelColor: colors.text.secondary, detail: '', trend: '' },
      stress: null,
      vo2Max: '-',
      vo2MaxTrend: '',
      weightLeanMass: 'No data',
      weightTrend: '(ok)',
      logItems: [],
      trace: {
        directiveLabel: 'Calculating...',
        horizonDays: [],
        vitalityScore: 0,
        vitalityConfidence: 'HIGH',
        vitalityZScore: null,
        isVitalityEstimated: false,
        evidenceSummary: [],
        systemState: '',
        activeLens: '',
        dominantAxes: [],
        dominantFactors: [],
        analystInsight: null,
        constraints: null,
        loadDensity: null,
        loadTrend: 'Stable',
      },
    };
  }

  const trends = stats.stats.biometric_trends;
  const directive = stats.logicContract?.directive;
  const contract = stats.logicContract;
  
  // Sleep calculations
  const sleepBaseline = trends?.sleep.baseline_duration || 25200;
  const sleepToday = stats.sleep.totalDurationSeconds;
  const sleepDelta = (sleepToday - sleepBaseline) / 3600;
  
  // Load calculations
  const loadDensity = stats.stats.loadDensity || 0;
  const loadLevel = getLoadLevel(loadDensity);
  const load72hSessions = history.slice(0, 3).reduce((sum, d) => sum + (d.activity?.workouts?.length || 0), 0);
  const load72hMinutes = Math.round(history.slice(0, 3).reduce((sum, d) => sum + (d.activity?.activeMinutes || 0), 0));

  // Directive label
  const directiveLabel = directive 
    ? `${directive.category} — ${directive.stimulus_type}` 
    : 'Calculating...';

  return {
    isLoading: false,
    loadingText: '',
    
    // Header
    confidenceBadge: stats.stats.vitalityConfidence 
      ? getConfidenceStyle(stats.stats.vitalityConfidence) 
      : null,
    
    // Recovery
    hrv: {
      baseline: trends?.hrv.baseline ? `${Math.round(trends.hrv.baseline)} ms` : '- ms',
      today: `${Math.round(stats.biometrics.hrv)} ms`,
      zLabel: trends?.hrv.today_z_score !== undefined 
        ? `${trends.hrv.today_z_score.toFixed(1)} (${getZLabel(trends.hrv.today_z_score)})` 
        : '-',
    },
    rhr: {
      baseline: trends?.rhr.baseline ? `${Math.round(trends.rhr.baseline)} bpm` : '- bpm',
      today: `${Math.round(stats.biometrics.restingHeartRate)} bpm`,
      zLabel: trends?.rhr.today_z_score !== undefined 
        ? `${trends.rhr.today_z_score.toFixed(1)} (${getZLabel(trends.rhr.today_z_score)})` 
        : '-',
    },
    sleep: {
      today: `${(sleepToday / 3600).toFixed(1)}h`,
      baseline: `${(sleepBaseline / 3600).toFixed(1)}h`,
      delta: `${sleepDelta > 0 ? '+' : ''}${sleepDelta.toFixed(1)}h`,
      deltaColor: sleepDelta < -0.5 ? colors.accent.strain : colors.accent.primary,
      source: formatSleepSource(stats.sleep.source),
    },
    
    // Movement
    steps: {
      baseline: Math.round(trends?.steps.baseline || 0).toLocaleString(),
      today: Math.round(stats.activity.steps).toLocaleString(),
      trend: getTrendLabel(trends?.steps.trend),
    },
    activeBurn: {
      baseline: `${Math.round(trends?.active_calories.baseline || 0)} kcal`,
      today: `${Math.round(stats.activity.activeCalories)} kcal`,
      trend: getTrendLabel(trends?.active_calories.trend),
    },
    
    // Load
    load: {
      levelLabel: loadLevel.label,
      levelColor: loadLevel.color,
      detail: `Last 72h: ${load72hSessions} sessions • ${load72hMinutes} min • Physio load: ${Math.round(loadDensity)}`,
      trend: stats.stats.trends?.load_trend || 'Stable',
    },
    
    // Stress
    stress: stats.biometrics.stress ? {
      avg: stats.biometrics.stress.avg?.toFixed(0) || '-',
      high: stats.biometrics.stress.highest?.toFixed(0) || '-',
      low: stats.biometrics.stress.lowest?.toFixed(0) || '-',
      elevated: `${stats.biometrics.stress.time_elevated_pct?.toFixed(0) || '-'}%`,
    } : null,
    
    // Constitution
    vo2Max: stats.biometrics.vo2Max 
      ? `${stats.biometrics.vo2Max.toFixed(1)} ml/kg/min` 
      : '-',
    vo2MaxTrend: 'Stable',
    weightLeanMass: 'No data',
    weightTrend: '(ok)',
    
    // Log
    logItems: buildLogItems(stats, history),
    
    // Trace
    trace: {
      directiveLabel,
      horizonDays: (contract?.horizon || []).map(day => ({
        dayOffset: day.dayOffset,
        label: `${day.directive.category} — ${day.directive.stimulus_type}`,
        state: day.state || null,
      })),
      vitalityScore: stats.stats.vitality,
      vitalityConfidence: stats.stats.vitalityConfidence || 'HIGH',
      vitalityZScore: stats.stats.vitalityZScore !== undefined 
        ? stats.stats.vitalityZScore.toFixed(2) 
        : null,
      isVitalityEstimated: stats.stats.isVitalityEstimated || false,
      evidenceSummary: stats.stats.evidenceSummary || [],
      systemState: stats.stats.systemStatus.current_state,
      activeLens: stats.stats.systemStatus.active_lens,
      dominantAxes: stats.stats.systemStatus.dominantAxes || [],
      dominantFactors: contract?.dominant_factors || [],
      analystInsight: stats.activeSession?.analyst_insight || null,
      constraints: contract?.constraints ? {
        allowImpact: contract.constraints.allow_impact,
        hrCap: contract.constraints.heart_rate_cap 
          ? `${contract.constraints.heart_rate_cap} bpm` 
          : null,
        equipment: contract.constraints.required_equipment || [],
      } : null,
      loadDensity: stats.stats.loadDensity !== undefined 
        ? `${Math.round(stats.stats.loadDensity)}` 
        : null,
      loadTrend: stats.stats.trends?.load_trend || 'Stable',
    },
  };
}
