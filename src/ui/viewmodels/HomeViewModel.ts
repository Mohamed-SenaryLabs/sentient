/**
 * HomeViewModel — Transforms OperatorDailyStats → UI-ready fields for FocusScreen
 * 
 * This is the single source of truth for all display logic on the Home screen.
 * FocusScreen should receive this view model and render it without any business logic.
 */

import { OperatorDailyStats } from '../../data/schema';
import { getReadableState, getDirectiveLabel } from '../DisplayTranslator';
import { colors, getVitalityColor, stateColors } from '../theme/tokens';

// ============================================
// VIEW DATA INTERFACE
// ============================================

export interface HomeViewData {
  // Loading state
  isLoading: boolean;
  loadingText: string;
  
  // Hero section
  greeting: string;
  lastUpdateTime: string | null;
  directiveLabel: string;
  focusCue: string;
  stateAccent: string;

  // Metric Tiles
  stateValue: string;
  loadLabel: string;
  loadDisplayValue: string; // The formatted "Load: 123" or similar is old. Now we need "Low/Mod/High"
  capacityLabel: string;
  capacityValue: string;
  
  // Avoid section
  avoidLabel: string;
  avoidCue: string;
  
  // Warnings
  isLowVitality: boolean;
  vitalityColor: string;
  vitalityPercent: number;
  vitalityText: string;
  isHighRisk: boolean;
  
  // Context panel
  analystSummary: string | null;
  analystDetail: string | null;
  stateLabel: string;
  confidenceLabel: string;
  
  // Meta
  recalTime: string | null;
  recalReason: string | null;
  recalCount: number;
  hasRecalToday: boolean;
  directiveSnapshot: any | null;
  constraintsSnapshot: any | null;
  currentDirective: any | null;
  currentConstraints: any | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getDefaultConstraint(state: string, category: string): string {
  if (state === 'RECOVERY_MODE') return "High intensity efforts. Accumulated fatigue is high.";
  if (state === 'PHYSICAL_STRAIN') return "Impact loading. Neural system requires downtime.";
  if (state === 'HIGH_STRAIN') return "Glycolytic work. Reduce intensity and volatility.";
  
  if (category === 'STRENGTH') return "Glycolytic burnout. Keep reps low, quality high.";
  if (category === 'ENDURANCE') return "Anaerobic spikes. Stay within aerobic threshold.";
  if (category === 'REGULATION') return "Accumulated stress. Keep effort minimal.";
  
  return "Excessive volume beyond limits.";
}

function formatUpdateTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  });
}

// ============================================
// VIEW MODEL FACTORY
// ============================================

export function createHomeViewModel(
  stats: OperatorDailyStats | null, 
  status: string
): HomeViewData {
  // Loading state
  if (!stats || !stats.logicContract?.directive) {
    const stateLabel = stats?.stats?.systemStatus 
      ? getReadableState(stats.stats.systemStatus.current_state)
      : "System Initializing...";
    
    return {
      isLoading: true,
      loadingText: status || stateLabel,
      greeting: getGreeting(),
      lastUpdateTime: null,
      directiveLabel: '',
      focusCue: '',
      stateAccent: colors.accent.primary,
      stateValue: '...',
      loadLabel: 'LOAD (72H)',
      loadDisplayValue: '...',
      capacityLabel: 'CAPACITY',
      capacityValue: '...',
      avoidLabel: 'AVOID',
      avoidCue: '',
      isHighRisk: false,
      isLowVitality: false,
      vitalityColor: colors.accent.primary,
      vitalityPercent: 0,
      vitalityText: '...',
      analystSummary: null,
      analystDetail: null,
      stateLabel: stateLabel,
      confidenceLabel: 'HIGH',
      recalTime: null,
      recalReason: null,
    };
  }

  const { systemStatus } = stats.stats;
  const directive = stats.logicContract.directive;
  const contract = stats.logicContract;
  
  // State-based accent color
  const currentState = systemStatus.current_state as keyof typeof stateColors;
  const stateAccent = stateColors[currentState] || colors.accent.primary;
  
  // Vitality
  const isLowVitality = stats.stats.vitality < 30;
  const vitalityColor = getVitalityColor(stats.stats.vitality);
  
  // Focus cue derivation
  const focusCue = contract.session_focus_llm 
    || contract.session_focus 
    || stats.activeSession?.display.title 
    || "Daily Focus";
  
  // Avoid cue derivation
  const avoidCue = contract.avoid_cue 
    || getDefaultConstraint(systemStatus.current_state, directive.category);

  // Risk Check (for Avoid coloring)
  const isHighRisk = 
    ['HIGH_STRAIN', 'PHYSICAL_STRAIN', 'RECOVERY_MODE'].includes(systemStatus.current_state) ||
    stats.stats.vitality < 30;

  return {
    isLoading: false,
    loadingText: '',
    
    // Risk Flag
    isHighRisk,
    
    // Hero
    greeting: getGreeting(),
    // "Updated" = last refresh/scan (can happen many times/day, no plan change)
    lastUpdateTime: stats.last_refresh_at 
      ? formatUpdateTime(stats.last_refresh_at) 
      : null,
    directiveLabel: getDirectiveLabel(directive.category, directive.stimulus_type),
    focusCue,
    stateAccent,
    
    // Metrics Tiles
    stateValue: getReadableState(systemStatus.current_state), // Full canonical name
    loadLabel: 'LOAD (72H)',
    loadDisplayValue: stats.stats.loadDensity && stats.stats.loadDensity > 700 ? 'High' : 
                      stats.stats.loadDensity && stats.stats.loadDensity > 400 ? 'Moderate' : 'Low',
    capacityLabel: 'CAPACITY (TODAY)',
    capacityValue: (() => {
      const cap = stats.stats.adaptiveCapacity?.current || 0;
      if (cap >= 85) return 'Full';
      if (cap >= 50) return 'Moderate';
      if (cap >= 25) return 'Limited';
      return 'Low';
    })(),
    
    // Avoid
    avoidLabel: 'AVOID',
    avoidCue: avoidCue.length > 120 ? avoidCue.substring(0, 117) + '...' : avoidCue,
    
    // Vitality warning
    isLowVitality,
    vitalityColor,
    vitalityPercent: stats.stats.vitality,
    vitalityText: `${stats.stats.vitality}`, // Just the number for the tile
    
    // Context panel
    analystSummary: contract.analyst_insight?.summary 
      || stats.activeSession?.analyst_insight 
      || null,
    analystDetail: contract.analyst_insight?.detail || null,
    stateLabel: getReadableState(systemStatus.current_state),
    confidenceLabel: stats.stats.vitalityConfidence || 'HIGH',
    
    // Meta
    recalTime: contract.last_recal_at 
      ? formatUpdateTime(contract.last_recal_at) 
      : null,
    recalReason: contract.last_recal_reason || null,
    recalCount: contract.recal_count || 0,
    // Check if recal happened today
    hasRecalToday: (() => {
      if (!contract.last_recal_at) return false;
      const recalDate = new Date(contract.last_recal_at);
      const today = new Date();
      recalDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      return recalDate.getTime() === today.getTime();
    })(),
    // Snapshot data for showing what changed
    directiveSnapshot: contract.directive_snapshot ? JSON.parse(contract.directive_snapshot) : null,
    constraintsSnapshot: contract.constraints_snapshot ? JSON.parse(contract.constraints_snapshot) : null,
    currentDirective: directive,
    currentConstraints: contract.constraints,
  };
}
