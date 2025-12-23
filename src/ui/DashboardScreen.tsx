import React, { useState } from 'react';
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
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

// ============================================
// MICRO TREND STRIP (7-day)
// ============================================
function MiniBarStrip({
  data,
  color,
  height = 14,
  barWidth = 4,
}: {
  data: Array<number | null>;
  color: string;
  height?: number;
  barWidth?: number;
}) {
  const numeric = data.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const max = Math.max(...numeric, 1);

  return (
    <View style={[styles.barStrip, { height }]} pointerEvents="none">
      {data.map((val, i) => {
        const isToday = i === data.length - 1;
        const isMissing = val === null || !Number.isFinite(val);
        const heightPct = isMissing ? 0.12 : Math.max(0.12, (Math.max(0, val as number) / max));
        return (
          <View
            key={i}
            style={[
              styles.bar,
              {
                width: barWidth,
                height: `${heightPct * 100}%`,
                backgroundColor: isToday ? color : `${color}45`,
                opacity: isMissing ? 0.25 : 0.95,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

// ============================================
// TRENDS STRIP (14-day, with baseline line)
// ============================================
function TrendStrip({
  data,
  color,
  baseline,
  height = 18,
  barWidth = 3,
}: {
  data: Array<number | null>;
  color: string;
  baseline?: number | null;
  height?: number;
  barWidth?: number;
}) {
  const numeric = data.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const max = Math.max(...numeric, (typeof baseline === 'number' && Number.isFinite(baseline) ? baseline : 0), 1);

  const baselinePct =
    typeof baseline === 'number' && Number.isFinite(baseline) ? Math.min(1, Math.max(0, baseline / max)) : null;
  const baselineTop = baselinePct === null ? null : Math.round((1 - baselinePct) * height);

  return (
    <View style={[styles.trendStripWrap, { height }]} pointerEvents="none">
      {baselineTop !== null && (
        <View
          style={[
            styles.trendBaseline,
            {
              top: baselineTop,
            },
          ]}
        />
      )}
      <MiniBarStrip data={data} color={color} height={height} barWidth={barWidth} />
    </View>
  );
}

// ============================================
// LOAD TREND (7-day): Sessions + Active Minutes
// ============================================
function LoadDualStrip({
  sessions,
  minutes,
  color,
}: {
  sessions: Array<number | null>;
  minutes: Array<number | null>;
  color: string;
}) {
  // Two aligned strips: sessions (dim), minutes (bright)
  return (
    <View style={styles.loadDualWrap} pointerEvents="none">
      <MiniBarStrip data={sessions} color={`${color}75`} height={8} barWidth={3} />
      <View style={{ height: 2 }} />
      <MiniBarStrip data={minutes} color={color} height={10} barWidth={3} />
    </View>
  );
}

function DualStrip({
  a,
  b,
  colorA,
  colorB,
}: {
  a: Array<number | null>;
  b: Array<number | null>;
  colorA: string;
  colorB: string;
}) {
  return (
    <View style={styles.loadDualWrap} pointerEvents="none">
      <MiniBarStrip data={a} color={colorA} height={8} barWidth={3} />
      <View style={{ height: 2 }} />
      <MiniBarStrip data={b} color={colorB} height={10} barWidth={3} />
    </View>
  );
}

export function DashboardScreen({ stats, history, onRefresh, refreshing }: DashboardScreenProps) {
  const [logExpanded, setLogExpanded] = useState(false);

  if (!stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>ACCESSING BIOLOGY...</Text>
      </View>
    );
  }

  // ... (metrics calculation code suppressed for brevity, assume unchanged unless specified)
  const trends = stats.stats.biometric_trends;

  // --- Trend series ---
  const allDaysAsc = [stats, ...history]
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .filter(d => !!d);

  const lastDays7 = allDaysAsc.slice(-7);
  const lastDays14 = allDaysAsc.slice(-14);

  const seriesHRV = lastDays7.map((d): number | null => {
    const v = d.biometrics?.hrv;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  });
  const seriesRHR = lastDays7.map((d): number | null => {
    const v = d.biometrics?.restingHeartRate;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  });
  const seriesSleepHrs = lastDays7.map((d): number | null => {
    const v = d.sleep?.totalDurationSeconds;
    return typeof v === 'number' && Number.isFinite(v) ? v / 3600 : null;
  });
  const seriesSteps = lastDays7.map((d): number | null => {
    const v = d.activity?.steps;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  });
  const seriesActiveBurn = lastDays7.map((d): number | null => {
    const v = d.activity?.activeCalories;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  });
  const seriesLoadDensity = lastDays7.map((d): number | null => {
    const v = d.stats?.loadDensity;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  });

  // 14-day series for the Trends module
  const seriesHRV14 = lastDays14.map((d): number | null => {
    const v = d.biometrics?.hrv;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  });
  const seriesSleep14 = lastDays14.map((d): number | null => {
    const v = d.sleep?.totalDurationSeconds;
    return typeof v === 'number' && Number.isFinite(v) ? v / 3600 : null;
  });

  // 7-day load components for Trends: sessions + active minutes
  const seriesLoadSessions7 = lastDays7.map((d): number | null => {
    const v = d.activity?.workouts?.length;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  });
  const seriesLoadMinutes7 = lastDays7.map((d): number | null => {
    const v = d.activity?.activeMinutes;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  });

  // 7-day cadence (RPM) — average across workouts that contain RPM (e.g., cycling)
  const seriesRpm7 = lastDays7.map((d): number | null => {
    const rpms = (d.activity?.workouts || [])
      .map(w => w.rpm)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    if (rpms.length === 0) return null;
    return rpms.reduce((sum, v) => sum + v, 0) / rpms.length;
  });
  const rpmDataCount = seriesRpm7.filter(v => typeof v === 'number' && Number.isFinite(v)).length;
  const rpmToday = seriesRpm7[seriesRpm7.length - 1];
  

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

  // Get icon for activity type
  const getActivityIcon = (item: { type: string; label: string }) => {
    if (item.type === 'RECOVERY') {
      return 'leaf-outline';
    }
    const label = item.label.toLowerCase();
    if (label.includes('run') || label.includes('running')) return 'walk-outline';
    if (label.includes('strength') || label.includes('lift')) return 'barbell-outline';
    if (label.includes('hiit') || label.includes('interval')) return 'flash-outline';
    if (label.includes('cycle') || label.includes('bike')) return 'bicycle-outline';
    if (label.includes('swim')) return 'water-outline';
    if (label.includes('walk')) return 'footsteps-outline';
    if (label.includes('functional')) return 'fitness-outline';
    return 'fitness-outline';
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

      {/* Plan Update Meta (optional) */}
      {stats.logicContract?.last_recal_at && (() => {
        const recalDate = new Date(stats.logicContract.last_recal_at);
        const today = new Date();
        const recalDay = new Date(recalDate);
        recalDay.setHours(0, 0, 0, 0);
        const todayDay = new Date(today);
        todayDay.setHours(0, 0, 0, 0);
        const isToday = recalDay.getTime() === todayDay.getTime();
        
        if (isToday) {
          const recalTime = recalDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit' 
          });
          return (
            <Text style={styles.planUpdateMeta}>
              Plan updated · {recalTime}
            </Text>
          );
        }
        return null;
      })()}

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
          <MiniBarStrip data={seriesHRV} color={colors.accent.vitality} />
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
          <MiniBarStrip data={seriesRHR} color={colors.accent.peak} />
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
        <MiniBarStrip data={seriesSleepHrs} color={colors.accent.vitality} />
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
          <MiniBarStrip data={seriesSteps} color={colors.accent.vitality} />
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
          <MiniBarStrip data={seriesActiveBurn} color={colors.accent.vitality} />
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
        <MiniBarStrip data={seriesLoadDensity} color={colors.accent.load} />
      </View>

      {/* TRENDS (Instrument Charts) */}
      <Text style={styles.sectionHeader}>TRENDS</Text>
      <View style={styles.trendsCard}>
        {/* HRV */}
        <View style={styles.trendRow}>
          <View style={[styles.trendIcon, { backgroundColor: `${colors.accent.vitality}18` }]}>
            <Ionicons name="pulse-outline" size={16} color={colors.accent.vitality} />
          </View>
          <View style={styles.trendInfo}>
            <Text style={styles.trendLabel}>HRV (14d)</Text>
            <Text style={styles.trendMeta}>Baseline {trends?.hrv.baseline ? Math.round(trends.hrv.baseline) : '—'} ms</Text>
          </View>
          <View style={styles.trendRight}>
            <Text style={styles.trendValue}>{Math.round(stats.biometrics.hrv)} ms</Text>
            <TrendStrip
              data={seriesHRV14}
              color={colors.accent.vitality}
              baseline={trends?.hrv.baseline ?? null}
              height={18}
              barWidth={3}
            />
          </View>
        </View>

        <View style={styles.trendsDivider} />

        {/* Sleep */}
        <View style={styles.trendRow}>
          <View style={[styles.trendIcon, { backgroundColor: `${colors.accent.vitality}14` }]}>
            <Ionicons name="moon-outline" size={16} color={colors.accent.vitality} />
          </View>
          <View style={styles.trendInfo}>
            <Text style={styles.trendLabel}>Sleep (14d)</Text>
            <Text style={styles.trendMeta}>Baseline {(sleepBaseline / 3600).toFixed(1)}h</Text>
          </View>
          <View style={styles.trendRight}>
            <Text style={styles.trendValue}>{(sleepToday / 3600).toFixed(1)}h</Text>
            <TrendStrip
              data={seriesSleep14}
              color={colors.accent.vitality}
              baseline={sleepBaseline / 3600}
              height={18}
              barWidth={3}
            />
          </View>
        </View>

        <View style={styles.trendsDivider} />

        {/* Load */}
        <View style={styles.trendRow}>
          <View style={[styles.trendIcon, { backgroundColor: `${colors.accent.load}14` }]}>
            <Ionicons name="speedometer-outline" size={16} color={colors.accent.load} />
          </View>
          <View style={styles.trendInfo}>
            <Text style={styles.trendLabel}>Load (7d)</Text>
            <Text style={styles.trendMeta}>Sessions + Active min</Text>
          </View>
          <View style={styles.trendRight}>
            <Text style={styles.trendValue}>{loadLevel.label}</Text>
            <LoadDualStrip
              sessions={seriesLoadSessions7}
              minutes={seriesLoadMinutes7}
              color={colors.accent.load}
            />
          </View>
        </View>

        {/* Activity vs RPM (optional; only when cadence exists) */}
        {rpmDataCount >= 3 && (
          <>
            <View style={styles.trendsDivider} />
            <View style={styles.trendRow}>
              <View style={[styles.trendIcon, { backgroundColor: `${colors.accent.vitality}14` }]}>
                <Ionicons name="bicycle-outline" size={16} color={colors.accent.vitality} />
              </View>
              <View style={styles.trendInfo}>
                <Text style={styles.trendLabel}>Cadence (7d)</Text>
                <Text style={styles.trendMeta}>Active min vs RPM</Text>
              </View>
              <View style={styles.trendRight}>
                <Text style={styles.trendValue}>
                  {typeof rpmToday === 'number' && Number.isFinite(rpmToday) ? `${Math.round(rpmToday)} rpm` : '—'}
                </Text>
                <DualStrip
                  a={seriesLoadMinutes7}
                  b={seriesRpm7}
                  colorA={`${colors.accent.vitality}75`}
                  colorB={colors.accent.vitality}
                />
              </View>
            </View>
          </>
        )}
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
          
          // Group activities by unique date
          const daysMap = new Map<string, Array<{
            type: string;
            label: string;
            date: string;
            value: number;
            duration: number;
            rpm?: number;
            minHr?: number;
            maxHr?: number;
            id: string;
          }>>();
          
          allDays.forEach(day => {
            const dateKey = day.date;
            
            // Initialize activities array for this date if not exists
            if (!daysMap.has(dateKey)) {
              daysMap.set(dateKey, []);
            }
            
            const activities = daysMap.get(dateKey)!;
            
            // Add workouts
            if (day.activity.workouts.length > 0) {
              day.activity.workouts.forEach(workout => {
                // Only add if not already present (avoid duplicates)
                if (!activities.some(a => a.id === workout.id)) {
                  activities.push({
                    type: 'WORKOUT',
                    label: formatWorkoutType(workout.type),
                    date: day.date,
                    value: workout.activeCalories,
                    duration: workout.durationSeconds,
                    rpm: workout.rpm,
                    minHr: workout.minHeartRate,
                    maxHr: workout.maxHeartRate,
                    id: workout.id
                  });
                }
              });
            } else {
              // Only add recovery if no workouts exist for this date
              // Check if we already have workouts OR a recovery entry for this date
              const hasWorkouts = activities.some(a => a.type === 'WORKOUT');
              const recoveryId = day.date + '_rec';
              const hasRecovery = activities.some(a => a.id === recoveryId);
              
              if (!hasWorkouts && !hasRecovery) {
                activities.push({
                  type: 'RECOVERY',
                  label: 'Recovery',
                  date: day.date,
                  value: day.activity.activeCalories,
                  duration: 0,
                  id: recoveryId
                });
              }
            }
          });

          // Convert map to array and sort by date (newest first)
          const sortedDays = Array.from(daysMap.entries())
            .map(([date, activities]) => ({ date, activities }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          const daysToShow = logExpanded ? sortedDays : sortedDays.slice(0, 3);

          // Normalize dates to YYYY-MM-DD for comparison (handles timezone issues)
          // Define once outside map for efficiency
          const normalizeDate = (dateStr: string | Date): string => {
            // If already in YYYY-MM-DD format, return as-is
            if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              return dateStr;
            }
            const d = typeof dateStr === 'string' ? new Date(dateStr + 'T00:00:00') : dateStr;
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };
          
          const today = normalizeDate(new Date());
          const yesterdayDate = new Date();
          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
          const yesterday = normalizeDate(yesterdayDate);

          return (
            <>
              {daysToShow.map((dayGroup, dayIndex) => {
                const dayDateStr = normalizeDate(dayGroup.date);
                const dayDate = new Date(dayGroup.date + 'T00:00:00');
                
                let dayLabel: string;
                if (dayDateStr === today) dayLabel = 'Today';
                else if (dayDateStr === yesterday) dayLabel = 'Yesterday';
                else dayLabel = dayDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

                return (
                  <View key={dayGroup.date} style={styles.logDayGroup}>
                    <Text style={styles.logDayHeader}>{dayLabel.toUpperCase()}</Text>
                    {dayGroup.activities.map((item) => (
                      <View key={item.id} style={styles.logRow}>
                        <View style={[styles.logIconContainer, { backgroundColor: item.type === 'WORKOUT' ? `${colors.accent.vitality}20` : `${colors.border.default}20` }]}>
                          <Ionicons 
                            name={getActivityIcon(item) as any} 
                            size={18} 
                            color={item.type === 'WORKOUT' ? colors.accent.vitality : colors.text.secondary} 
                          />
                        </View>
                        <View style={styles.logContent}>
                          <Text style={styles.logTitle}>{item.label}</Text>
                          <View style={styles.logMetaRow}>
                            {!!item.duration && (
                              <Text style={styles.logDetail}>{Math.round(item.duration / 60)} min</Text>
                            )}
                            {item.minHr !== undefined && item.maxHr !== undefined && (
                              <Text style={styles.logDetail}>
                                {item.duration ? ' · ' : ''}{item.minHr}-{item.maxHr} bpm
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.logValueContainer}>
                          <Text style={styles.logValue}>{Math.round(item.value)}</Text>
                          <Text style={styles.logUnit}>kcal</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}
              
              {sortedDays.length > 3 && (
                <TouchableOpacity 
                  style={styles.logExpandButton}
                  onPress={() => setLogExpanded(!logExpanded)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.logExpandText}>
                    {logExpanded ? 'Show Less' : `Show ${sortedDays.length - 3} More Days`}
                  </Text>
                  <Ionicons 
                    name={logExpanded ? 'chevron-up-outline' : 'chevron-down-outline'} 
                    size={16} 
                    color={colors.accent.vitality} 
                  />
                </TouchableOpacity>
              )}
            </>
          );
        })()}
      </View>

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
  planUpdateMeta: {
    ...typography.meta,
    color: colors.text.tertiary,
    marginBottom: spacing[3],
    fontStyle: 'italic',
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
  logDayGroup: {
    marginBottom: spacing[4],
  },
  logDayHeader: {
    ...typography.meta,
    color: colors.text.tertiary,
    marginBottom: spacing[2],
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing[3],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  logIconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  logTitle: {
    ...typography.cardTitleSmall,
    color: colors.text.primary,
    marginBottom: 2,
  },
  logContent: {
    flex: 1,
  },
  logValueContainer: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  logValue: {
    ...typography.compactMetric,
    color: colors.text.primary,
    fontSize: 16,
  },
  logUnit: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: 2,
  },
  logMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  logExpandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    marginTop: spacing[2],
    gap: spacing[2],
  },
  logExpandText: {
    ...typography.meta,
    color: colors.accent.vitality,
    fontWeight: '600',
  },
  flex1: {
    flex: 1,
  },

  // Micro trend strip
  barStrip: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 14,
    marginTop: spacing[3],
    opacity: 0.9,
  },
  bar: {
    borderRadius: 1,
    minHeight: 2,
  },

  // Trends module
  trendsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  trendsDivider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing[3],
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  trendIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  trendInfo: {
    flex: 1,
    minWidth: 120,
  },
  trendLabel: {
    ...typography.cardTitleSmall,
    color: colors.text.primary,
  },
  trendMeta: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: 2,
  },
  trendRight: {
    alignItems: 'flex-end',
    gap: spacing[2],
    minWidth: 120,
  },
  trendValue: {
    ...typography.bodyStrong,
    color: colors.text.primary,
  },
  trendStripWrap: {
    width: 120,
    justifyContent: 'flex-end',
  },
  loadDualWrap: {
    width: 120,
    justifyContent: 'flex-end',
  },
  trendBaseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border.default,
    opacity: 0.9,
  },

});

