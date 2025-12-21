import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { OperatorDailyStats } from '../data/schema';

interface BiologyScreenProps {
  stats: OperatorDailyStats | null;
  history: OperatorDailyStats[];
  onRefresh: () => void;
  refreshing: boolean;
}

export function BiologyScreen({ stats, history, onRefresh, refreshing }: BiologyScreenProps) {
  const [traceExpanded, setTraceExpanded] = useState(false);

  if (!stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>ACCESSING BIOLOGY...</Text>
      </View>
    );
  }

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
    if (density > 25) return { label: 'High', color: '#EF4444' };
    if (density > 15) return { label: 'Moderate', color: '#FBBF24' };
    return { label: 'Low', color: '#10B981' };
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

  // Confidence styling
  const getConfidenceStyle = (confidence: string) => {
    switch (confidence) {
      case 'HIGH': return { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10B981' };
      case 'MEDIUM': return { backgroundColor: 'rgba(251, 191, 36, 0.2)', borderColor: '#FBBF24' };
      case 'LOW': return { backgroundColor: 'rgba(248, 113, 113, 0.2)', borderColor: '#F87171' };
      default: return { backgroundColor: 'rgba(100, 116, 139, 0.2)', borderColor: '#64748B' };
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ paddingTop: 60, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      showsVerticalScrollIndicator={false}
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
        <View style={[styles.metricCard, { flex: 1 }]}>
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
        <View style={[styles.metricCard, { flex: 1 }]}>
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
            <Text style={styles.sleepLabel}>Δ: <Text style={[styles.sleepValue, { color: sleepDelta < -0.5 ? '#EF4444' : '#10B981' }]}>
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
        <View style={[styles.metricCard, { flex: 1 }]}>
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

        <View style={[styles.metricCard, { flex: 1 }]}>
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
        <View style={[styles.metricCard, { flex: 1 }]}>
          <Text style={styles.metricTitle}>VO₂ Max</Text>
          <Text style={styles.constitutionValue}>
            {stats.biometrics.vo2Max?.toFixed(1) || '-'} <Text style={styles.unit}>ml/kg/min</Text>
          </Text>
          <Text style={styles.trendText}>Trend: Stable</Text>
        </View>
        <View style={[styles.metricCard, { flex: 1 }]}>
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
                <View style={[styles.logDot, { backgroundColor: item.type === 'WORKOUT' ? '#10B981' : '#334155' }]} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.logTitle}>{item.label}</Text>
                  <Text style={styles.logDate}>
                    {new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', minWidth: 100 }}>
                  <Text style={styles.logValue}>{Math.round(item.value)} kcal</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    color: '#E2E8F0',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 16,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  confidenceText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  
  // Decision Trace
  traceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  traceTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  traceDirective: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  evidenceContainer: {
    marginTop: 8,
  },
  evidenceLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  evidenceItem: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
  traceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandIcon: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  traceDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  traceSection: {
    marginBottom: 16,
  },
  traceSectionTitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  traceItem: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  traceSubItem: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    marginLeft: 12,
    marginBottom: 3,
  },
  traceText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // Section Headers
  sectionHeader: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 12,
  },

  // Metric Cards
  metricCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 12,
  },
  metricValue: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  unit: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'normal',
  },
  zLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },

  // Columns
  columns: {
    flexDirection: 'row',
    gap: 12,
  },

  // Sleep
  sleepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sleepLabel: {
    color: '#64748B',
    fontSize: 12,
  },
  sleepValue: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },

  logDetail: {
    color: '#64748B',
    fontSize: 11,
  },
  sourceText: {
    color: '#64748B',
    fontSize: 10,
    fontStyle: 'italic',
  },

  // Load
  loadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadLabel: {
    color: '#64748B',
    fontSize: 12,
  },
  loadLevel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadDetail: {
    color: '#CBD5E1',
    fontSize: 12,
    marginBottom: 6,
  },
  trendText: {
    color: '#64748B',
    fontSize: 11,
    fontStyle: 'italic',
  },

  // Stress
  stressDetail: {
    color: '#CBD5E1',
    fontSize: 12,
    marginBottom: 6,
  },

  // Constitution
  constitutionValue: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },

  // Log
  logContainer: {
    marginBottom: 20,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  logTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  logDate: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  logValue: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
});
