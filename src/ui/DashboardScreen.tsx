import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from './components/Screen';
import { OperatorDailyStats } from '../data/schema';
import { colors, typography, spacing, radius, confidenceStyles } from './theme/tokens';

interface DashboardScreenProps {
  stats: OperatorDailyStats | null;
  history: OperatorDailyStats[];
  onRefresh: () => void;
  refreshing: boolean;
}

export function DashboardScreen({ stats, history, onRefresh, refreshing }: DashboardScreenProps) {
  const [traceExpanded, setTraceExpanded] = useState(false);

  if (!stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>ACCESSING BIOLOGY...</Text>
      </View>
    );
  }

  // ... (metrics calculation code suppressed for brevity, assume unchanged unless specified)
  const trends = stats.stats.biometric_trends;
  const directive = stats.logicContract?.directive;
  const contract = stats.logicContract;
  
  // Helper: Format directive label
  const getDirectiveLabel = () => {
    if (!directive) return 'Calculating...';
    return `${directive.category} — ${directive.stimulus_type}`;
  };

  // Helper: Get Z-score label
  const getZLabel = (z: number) => {
    if (z > 0.5) return 'Above';
    if (z < -0.5) return 'Below';
    return 'Stable';
  };

  const getTrendLabel = (trend?: 'RISING' | 'FALLING' | 'STABLE') => {
    if (trend === 'RISING') return '↗︎';
    if (trend === 'FALLING') return '↘︎';
    return '→';
  };

  // Helper: Get load density level
  const getLoadLevel = (density: number) => {
    if (density > 25) return { label: 'High', color: colors.accent.strain };
    if (density > 15) return { label: 'Moderate', color: colors.accent.peak };
    return { label: 'Low', color: colors.accent.vitality };
  };

  // Calculate metrics
  const sleepBaseline = trends?.sleep.baseline_duration || 25200;
  const sleepToday = stats.sleep.totalDurationSeconds;
  const sleepDelta = (sleepToday - sleepBaseline) / 3600;
  
  const loadDensity = stats.stats.loadDensity || 0;
  const loadLevel = getLoadLevel(loadDensity);

  // Format workout type
  const formatWorkoutType = (type: string) => {
    if (type.includes('High Intensity')) return 'HIIT';
    if (type.includes('Functional')) return 'Functional';
    if (type.includes('Traditional')) return 'Strength';
    if (type.includes('Running')) return 'Run';
    if (type.includes('Walking')) return 'Walk';
    return type.replace('Traditional ', '').replace('Training', '');
  };

  // Confidence styling using tokens
  const getConfidenceStyle = (confidence: string) => {
    const styles = confidenceStyles[confidence as keyof typeof confidenceStyles];
    if (styles) {
      return { backgroundColor: styles.backgroundColor, borderColor: styles.borderColor };
    }
    return { backgroundColor: `${colors.text.secondary}20`, borderColor: colors.text.secondary };
  };

  return (
    <Screen 
      preset="scroll" 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.vitality} />}
    >
      {/* HEADER */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>DASHBOARD</Text>
        {stats.stats.vitalityConfidence && (
          <View style={[styles.confidenceBadge, getConfidenceStyle(stats.stats.vitalityConfidence)]}>
            <Text style={styles.confidenceText}>
              {stats.stats.vitalityConfidence}
            </Text>
          </View>
        )}
      </View>

      {/* RECOVERY SECTION */}
      <Text style={styles.sectionHeader}>RECOVERY</Text>
      
      <View style={styles.columns}>
        {/* HRV Status */}
        <View style={[styles.metricCard, styles.flex1]}>
          <Text style={styles.metricTitle}>HRV Status</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Baseline:</Text>
            <Text style={styles.metricValue}>
              {trends?.hrv.baseline ? Math.round(trends.hrv.baseline) : '-'} <Text style={styles.unit}>ms</Text>
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Today:</Text>
            <Text style={styles.metricValue}>
              {Math.round(stats.biometrics.hrv)} <Text style={styles.unit}>ms</Text>
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Z:</Text>
            <Text style={styles.metricValue}>
              {trends?.hrv.today_z_score?.toFixed(1) || '-'} 
              <Text style={styles.zLabel}> ({getZLabel(trends?.hrv.today_z_score || 0)})</Text>
            </Text>
          </View>
        </View>

        {/* RHR Status */}
        <View style={[styles.metricCard, styles.flex1]}>
          <Text style={styles.metricTitle}>RHR Status</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Baseline:</Text>
            <Text style={styles.metricValue}>
              {trends?.rhr.baseline ? Math.round(trends.rhr.baseline) : '-'} <Text style={styles.unit}>bpm</Text>
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Today:</Text>
            <Text style={styles.metricValue}>
              {Math.round(stats.biometrics.restingHeartRate)} <Text style={styles.unit}>bpm</Text>
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Z:</Text>
            <Text style={styles.metricValue}>
              {trends?.rhr.today_z_score?.toFixed(1) || '-'}
              <Text style={styles.zLabel}> ({getZLabel(trends?.rhr.today_z_score || 0)})</Text>
            </Text>
          </View>
        </View>
      </View>

      {/* Sleep */}
      <View style={styles.metricCard}>
        <Text style={styles.metricTitle}>Sleep</Text>
        <View style={styles.sleepRow}>
          <View>
            <Text style={styles.sleepLabel}>Today: <Text style={styles.sleepValue}>{(sleepToday / 3600).toFixed(1)}h</Text></Text>
          </View>
          <View>
            <Text style={styles.sleepLabel}>Baseline: <Text style={styles.sleepValue}>{(sleepBaseline / 3600).toFixed(1)}h</Text></Text>
          </View>
          <View>
            <Text style={styles.sleepLabel}>Δ: <Text style={[styles.sleepValue, { color: sleepDelta < -0.5 ? colors.accent.strain : colors.accent.vitality }]}>
              {sleepDelta > 0 ? '+' : ''}{sleepDelta.toFixed(1)}h
            </Text></Text>
          </View>
        </View>
        <Text style={styles.sourceText}>
          Source: {stats.sleep.source === 'MEASURED' ? 'Measured' : 
                   stats.sleep.source === 'ESTIMATED_7D' ? 'Estimated (7-day)' :
                   stats.sleep.source === 'DEFAULT_6H' ? 'Default (6h)' : 'Manual'}
        </Text>
      </View>

      {/* MOVEMENT SECTION */}
      <Text style={styles.sectionHeader}>MOVEMENT</Text>
      <View style={styles.columns}>
        <View style={[styles.metricCard, styles.flex1]}>
          <Text style={styles.metricTitle}>Steps</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Baseline:</Text>
            <Text style={styles.metricValue}>
              {Math.round(trends?.steps.baseline || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Today:</Text>
            <Text style={styles.metricValue}>
              {Math.round(stats.activity.steps).toLocaleString()} 
              <Text style={styles.unit}> {getTrendLabel(trends?.steps.trend)}</Text>
            </Text>
          </View>
        </View>

        <View style={[styles.metricCard, styles.flex1]}>
          <Text style={styles.metricTitle}>Active Burn</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Baseline:</Text>
            <Text style={styles.metricValue}>
              {Math.round(trends?.active_calories.baseline || 0)} <Text style={styles.unit}>kcal</Text>
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Today:</Text>
            <Text style={styles.metricValue}>
              {Math.round(stats.activity.activeCalories)} <Text style={styles.unit}>kcal {getTrendLabel(trends?.active_calories.trend)}</Text>
            </Text>
          </View>
        </View>
      </View>

      {/* LOAD SECTION */}
      <Text style={styles.sectionHeader}>LOAD</Text>
      <View style={styles.metricCard}>
        <Text style={styles.metricTitle}>72h Load Density</Text>
        <View style={styles.loadRow}>
          <Text style={styles.loadLabel}>Level: </Text>
          <Text style={[styles.loadLevel, { color: loadLevel.color }]}>{loadLevel.label}</Text>
        </View>
        <Text style={styles.loadDetail}>
          Last 72h: {history.slice(0, 3).reduce((sum, d) => sum + (d.activity?.workouts?.length || 0), 0)} sessions • {' '}
          {Math.round(history.slice(0, 3).reduce((sum, d) => sum + (d.activity?.activeMinutes || 0), 0))} min • {' '}
          Physio load: {Math.round(loadDensity)}
        </Text>
        <Text style={styles.trendText}>Trend: {stats.stats.trends?.load_trend || 'Stable'}</Text>
      </View>

      {/* STRESS SECTION */}
      {stats.biometrics.stress && (
        <>
          <Text style={styles.sectionHeader}>STRESS</Text>
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Autonomic Arousal</Text>
            <Text style={styles.stressDetail}>
              Avg: {stats.biometrics.stress.avg?.toFixed(0) || '-'} • {' '}
              High: {stats.biometrics.stress.highest?.toFixed(0) || '-'} • {' '}
              Low: {stats.biometrics.stress.lowest?.toFixed(0) || '-'} • {' '}
              Time elevated: {stats.biometrics.stress.time_elevated_pct?.toFixed(0) || '-'}%
            </Text>
            <Text style={styles.trendText}>Trend: Stable</Text>
          </View>
        </>
      )}

      {/* CONSTITUTION SECTION */}
      <Text style={styles.sectionHeader}>CONSTITUTION</Text>
      <View style={styles.columns}>
        <View style={[styles.metricCard, styles.flex1]}>
          <Text style={styles.metricTitle}>VO₂ Max</Text>
          <Text style={styles.constitutionValue}>
            {stats.biometrics.vo2Max?.toFixed(1) || '-'} <Text style={styles.unit}>ml/kg/min</Text>
          </Text>
          <Text style={styles.trendText}>Trend: Stable</Text>
        </View>
        <View style={[styles.metricCard, styles.flex1]}>
          <Text style={styles.metricTitle}>Weight / Lean Mass</Text>
          <Text style={styles.constitutionValue}>No data</Text>
          <Text style={styles.trendText}>(ok)</Text>
        </View>
      </View>

      {/* THE LOG */}
      <Text style={styles.sectionHeader}>THE LOG</Text>
      <View style={styles.logContainer}>
        {(() => {
          const allDays = stats ? [stats, ...history] : history;
          const allItems = allDays.flatMap(day => {
            if (day.activity.workouts.length > 0) {
              return day.activity.workouts.map(workout => ({
                type: 'WORKOUT',
                label: formatWorkoutType(workout.type),
                date: day.date,
                value: workout.activeCalories,
                duration: workout.durationSeconds,
                rpm: workout.rpm,
                minHr: workout.minHeartRate,
                maxHr: workout.maxHeartRate,
                id: workout.id
              }));
            }
            return [{
              type: 'RECOVERY',
              label: 'Recovery',
              date: day.date,
              value: day.activity.activeCalories,
              duration: 0,
              rpm: undefined,
              minHr: undefined,
              maxHr: undefined,
              id: day.date + '_rec'
            }];
          });

          const uniqueItems = Array.from(new Map(allItems.map(item => [item.id, item])).values());

          return uniqueItems
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10)
            .map((item, i) => (
              <View key={item.id} style={styles.logRow}>
                <View style={[styles.logDot, { backgroundColor: item.type === 'WORKOUT' ? colors.accent.vitality : colors.border.default }]} />
                <View style={styles.logContent}>
                  <Text style={styles.logTitle}>{item.label}</Text>
                  <Text style={styles.logDate}>
                    {new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.logValueContainer}>
                  <Text style={styles.logValue}>{Math.round(item.value)} kcal</Text>
                  <View style={styles.logMetaRow}>
                    {!!item.duration && (
                      <Text style={styles.logDetail}>{Math.round(item.duration / 60)} min</Text>
                    )}
                    {item.minHr !== undefined && item.maxHr !== undefined && (
                      <Text style={styles.logDetail}>
                        · {item.minHr}-{item.maxHr} bpm
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ));
        })()}
      </View>

      {/* DECISION TRACE (Expandable) */}
      <Text style={styles.sectionHeader}>DECISION TRACE</Text>
      <TouchableOpacity 
        style={styles.traceCard} 
        onPress={() => setTraceExpanded(!traceExpanded)}
        activeOpacity={0.8}
      >
        <View style={styles.traceHeader}>
          <Text style={styles.traceTitle}>Logic Chain</Text>
          <Text style={styles.expandIcon}>{traceExpanded ? '▼' : '▶'}</Text>
        </View>
        
        <Text style={styles.traceDirective}>{getDirectiveLabel()}</Text>
        
        {traceExpanded && (
          <View style={styles.traceDetails}>
            {/* 3-Day Arc */}
            {contract?.horizon && contract.horizon.length > 0 && (
              <View style={styles.traceSection}>
                <Text style={styles.traceSectionTitle}>3-DAY STRATEGIC ARC</Text>
                {contract.horizon.map((day, i) => (
                  <Text key={i} style={styles.traceItem}>
                    Day {day.dayOffset}: {day.directive.category} — {day.directive.stimulus_type}
                    {day.state && ` (${day.state})`}
                  </Text>
                ))}
              </View>
            )}

            {/* Vitality Calculation */}
            <View style={styles.traceSection}>
              <Text style={styles.traceSectionTitle}>VITALITY CALCULATION</Text>
              <Text style={styles.traceItem}>Score: {stats.stats.vitality}%</Text>
              <Text style={styles.traceItem}>Confidence: {stats.stats.vitalityConfidence || 'HIGH'}</Text>
              {stats.stats.vitalityZScore !== undefined && (
                <Text style={styles.traceItem}>Z-Score: {stats.stats.vitalityZScore.toFixed(2)}</Text>
              )}
              {stats.stats.isVitalityEstimated && (
                <Text style={styles.traceItem}>⚠ Estimated (incomplete data)</Text>
              )}
            </View>

            {/* Evidence Summary */}
            {stats.stats.evidenceSummary && stats.stats.evidenceSummary.length > 0 && (
              <View style={styles.traceSection}>
                <Text style={styles.traceSectionTitle}>EVIDENCE</Text>
                {stats.stats.evidenceSummary.map((item, i) => (
                  <Text key={i} style={styles.traceItem}>• {item}</Text>
                ))}
              </View>
            )}

            {/* System Status */}
            <View style={styles.traceSection}>
              <Text style={styles.traceSectionTitle}>SYSTEM STATUS</Text>
              <Text style={styles.traceItem}>State: {stats.stats.systemStatus.current_state}</Text>
              <Text style={styles.traceItem}>Lens: {stats.stats.systemStatus.active_lens}</Text>
              {stats.stats.systemStatus.dominantAxes && stats.stats.systemStatus.dominantAxes.length > 0 && (
                <Text style={styles.traceItem}>
                  Dominant Axes: {stats.stats.systemStatus.dominantAxes.join(', ')}
                </Text>
              )}
            </View>

            {/* Planner Reasoning */}
            {contract?.dominant_factors && contract.dominant_factors.length > 0 && (
              <View style={styles.traceSection}>
                <Text style={styles.traceSectionTitle}>PLANNER REASONING</Text>
                <Text style={styles.traceItem}>Dominant Factors:</Text>
                {contract.dominant_factors.map((factor, i) => (
                  <Text key={i} style={styles.traceSubItem}>• {factor}</Text>
                ))}
              </View>
            )}

            {/* Analyst Insight */}
            {stats.activeSession?.analyst_insight && (
              <View style={styles.traceSection}>
                <Text style={styles.traceSectionTitle}>ANALYST INSIGHT</Text>
                <Text style={styles.traceText}>"{stats.activeSession.analyst_insight}"</Text>
              </View>
            )}

            {/* Constraints */}
            {contract?.constraints && (
              <View style={styles.traceSection}>
                <Text style={styles.traceSectionTitle}>CONSTRAINTS</Text>
                <Text style={styles.traceItem}>
                  Impact Allowed: {contract.constraints.allow_impact ? 'Yes' : 'No'}
                </Text>
                {contract.constraints.heart_rate_cap && (
                  <Text style={styles.traceItem}>
                    HR Cap: {contract.constraints.heart_rate_cap} bpm
                  </Text>
                )}
                {contract.constraints.required_equipment && contract.constraints.required_equipment.length > 0 && (
                  <Text style={styles.traceItem}>
                    Equipment: {contract.constraints.required_equipment.join(', ')}
                  </Text>
                )}
              </View>
            )}

            {/* Load Density */}
            {stats.stats.loadDensity !== undefined && (
              <View style={styles.traceSection}>
                <Text style={styles.traceSectionTitle}>LOAD ANALYSIS</Text>
                <Text style={styles.traceItem}>72h Density: {Math.round(stats.stats.loadDensity)}</Text>
                <Text style={styles.traceItem}>Trend: {stats.stats.trends?.load_trend || 'Stable'}</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.meta,
    color: colors.text.secondary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  headerTitle: {
    ...typography.screenTitle,
  },
  subtitle: {
    ...typography.meta,
    color: colors.text.secondary,
    marginBottom: spacing[4],
  },
  confidenceBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  confidenceText: {
    ...typography.metricLabel,
    color: colors.text.primary,
  },
  

  // ... check existing styles below this line ...
  evidenceContainer: {
    marginTop: spacing[2],
  },
  // ...
  sectionHeader: {
    ...typography.sectionLabel,
    color: colors.text.secondary, // Neutral labels for dashboard sections
    marginTop: spacing[5],
    marginBottom: spacing[3],
  },

  // Metric Cards
  metricCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.subtle, // Consistent with panel styling rule
  },
  metricTitle: {
    ...typography.metricLabel,
    marginBottom: spacing[3],
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  metricLabel: {
    ...typography.metricLabel,
    color: colors.text.secondary,
  },
  metricValue: {
    ...typography.compactMetric,
    color: colors.text.primary,
  },
  unit: {
    ...typography.meta,
    color: colors.text.secondary,
    fontWeight: '400',
    marginLeft: 2,
  },
  zLabel: {
    ...typography.meta,
    color: colors.text.secondary,
    fontWeight: '400',
  },

  // Columns
  columns: {
    flexDirection: 'row',
    gap: spacing[3],
  },

  // Sleep
  sleepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  sleepLabel: {
    ...typography.metricLabel,
    color: colors.text.secondary,
  },
  sleepValue: {
    ...typography.compactMetric,
    color: colors.text.primary,
  },

  logDetail: {
    ...typography.small,
    color: colors.text.secondary,
  },
  sourceText: {
    ...typography.extraSmall,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },

  // Load
  loadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  loadLabel: {
    ...typography.metricLabel,
    color: colors.text.secondary,
  },
  loadLevel: {
    ...typography.compactMetric,
  },
  loadDetail: {
    ...typography.meta,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  trendText: {
    ...typography.meta,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },

  // Stress
  stressDetail: {
    ...typography.meta,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },

  // Constitution
  constitutionValue: {
    ...typography.compactMetricLarge,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },

  // Log
  logContainer: {
    marginBottom: spacing[5],
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing[3],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.subtle, // Consistent with panel styling rule
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  logTitle: {
    ...typography.cardTitleSmall,
    color: colors.text.primary,
  },
  logDate: {
    ...typography.meta,
    color: colors.text.secondary,
    marginTop: 2,
  },
  logValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  logValueContainer: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  logMetaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
  },
  logContent: {
    flex: 1,
    marginLeft: spacing[3],
  },
  flex1: {
    flex: 1,
  },

  // Trace / Analysis
  traceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  expandIcon: {
    padding: spacing[2],
  },
  traceDetails: {
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle, // Keep subtle for internal divider
  },
  traceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing[4],
    marginBottom: spacing[5],
    borderWidth: 1,
    borderColor: colors.border.subtle, // Consistent with panel styling rule
  },
  traceSection: {
    marginBottom: spacing[4],
  },
  traceSectionTitle: {
    ...typography.meta,
    color: colors.text.secondary,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
  },

  traceTitle: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  traceDirective: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  traceItem: {
    ...typography.meta,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  traceSubItem: {
    ...typography.meta,
    color: colors.text.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[1],
    paddingLeft: spacing[2],
  },
  traceText: {
    ...typography.meta,
    color: colors.text.secondary,
  },
});

