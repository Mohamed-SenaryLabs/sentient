import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { OperatorDailyStats } from '../data/schema';

interface BiologyScreenProps {
  stats: OperatorDailyStats | null;
  history: OperatorDailyStats[];
  onRefresh: () => void;
  refreshing: boolean;
}

export function BiologyScreen({ stats, history, onRefresh, refreshing }: BiologyScreenProps) {
  if (!stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>ACCESSING BIOLOGY...</Text>
      </View>
    );
  }

  const trends = stats.stats.biometric_trends;
  
  // 1. HRV Signal (Raw Z: High is Good)
  const getHrvSignal = (z: number) => {
      if (z > 0.5) return { label: 'PRIMED', color: '#10B981' }; 
      if (z < -0.5) return { label: 'DRAINED', color: '#EF4444' };
      return { label: 'STABLE', color: '#64748B' };
  };

  // 2. RHR Signal (Vitality Z is Inverted: High Z means Low RHR/Good)
  const getRhrSignal = (z: number) => {
       if (z > 0.5) return { label: 'RESTED', color: '#10B981' };
       if (z < -0.5) return { label: 'STRAINED', color: '#EF4444' };
       return { label: 'STABLE', color: '#64748B' };
  };

  // 3. Sleep Signal (Delta Hours)
  const getSleepSignal = (delta: number) => {
      if (delta > 0.5) return { label: 'RECHARGED', color: '#10B981' };
      if (delta < -0.5) return { label: 'DEPRIVED', color: '#EF4444' }; // Was 'DEBT'
      return { label: 'STABLE', color: '#64748B' };
  };

  const hasHrvBaseline = trends?.hrv.baseline && trends.hrv.baseline > 0;
  const hasRhrBaseline = trends?.rhr.baseline && trends.rhr.baseline > 0;
  
  // Calculate Sleep Delta
  const sleepBaseline = trends?.sleep.baseline_duration || 25200;
  const sleepToday = stats.sleep.totalDurationSeconds;
  const sleepDelta = (sleepToday - sleepBaseline) / 3600;

  const hrvSignal = hasHrvBaseline ? getHrvSignal(trends!.hrv.today_z_score) : { label: 'CALCULATING', color: '#94A3B8'};
  const rhrSignal = hasRhrBaseline ? getRhrSignal(trends!.rhr.today_z_score) : { label: 'CALCULATING', color: '#94A3B8'};
  const sleepSignal = getSleepSignal(sleepDelta);


  const formatWorkoutType = (type: string) => {
      if (type.includes('High Intensity')) return 'HIIT';
      if (type.includes('Functional')) return 'Functional';
      if (type.includes('Traditional')) return 'Strength';
      if (type.includes('Running')) return 'Run';
      if (type.includes('Walking')) return 'Walk';
      return type.replace('Traditional ', '').replace('Training', '');
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>BIOLOGY</Text>
      </View>

      {/* 1. BASELINES (30-DAY) */}
      <Text style={styles.sectionHeader}>BASELINES (30-DAY AVG)</Text>
      
      {/* HRV Module */}
      <View style={styles.biologyCard}>
          <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>HRV STATUS</Text>
              <View style={[styles.signalBadge, { backgroundColor: hrvSignal.color + '20' }]}>
                  <Text style={[styles.signalText, { color: hrvSignal.color }]}>{hrvSignal.label}</Text>
              </View>
          </View>
          
          <View style={styles.metricsRow}>
              <View>
                  <Text style={styles.metricLabel}>BASELINE</Text>
                  <Text style={styles.metricValue}>{trends?.hrv.baseline ? Math.round(trends.hrv.baseline) : '-'} <Text style={styles.unit}>ms</Text></Text>
              </View>
              <View style={styles.dividerVertical} />
              <View>
                  <Text style={styles.metricLabel}>TODAY</Text>
                  <Text style={[styles.metricValue, { color: hrvSignal.color === '#64748B' ? '#E2E8F0' : hrvSignal.color }]}>
                      {Math.round(stats.biometrics.hrv)} <Text style={styles.unit}>ms</Text>
                  </Text>
              </View>
              <View style={styles.dividerVertical} />
               <View>
                  <Text style={styles.metricLabel}>Z-SCORE</Text>
                  <Text style={styles.metricValue}>{trends?.hrv.today_z_score?.toFixed(1) || '-'}</Text>
              </View>
          </View>
      </View>

      <View style={styles.columns}>
        {/* RHR Module */}
        <View style={[styles.biologyCard, { flex: 1 }]}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>RHR</Text>
                <Text style={[styles.signalText, { color: rhrSignal.color }]}>{rhrSignal.label}</Text>
            </View>
            <View style={{ marginTop: 8 }}>
                <Text style={styles.metricValue}>
                    {stats.biometrics.restingHeartRate > 0 ? Math.round(stats.biometrics.restingHeartRate) : '-'} <Text style={styles.unit}>bpm</Text>
                </Text>
                <Text style={styles.subMetric}>Avg: {trends?.rhr.baseline ? Math.round(trends.rhr.baseline) : '-'}</Text>
            </View>
        </View>

        {/* Sleep Module */}
        <View style={[styles.biologyCard, { flex: 1 }]}>
             <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>SLEEP</Text>
                <Text style={[styles.signalText, { color: sleepSignal.color }]}>{sleepSignal.label}</Text>
            </View>
             <View style={{ marginTop: 8 }}>
                <Text style={styles.metricValue}>{(stats.sleep.totalDurationSeconds / 3600).toFixed(1)} <Text style={styles.unit}>hrs</Text></Text>
                 <Text style={styles.subMetric}>Avg: {(sleepBaseline / 3600).toFixed(1)}h</Text>
            </View>
        </View>
      </View>


      {/* 2. CONSTITUTION */}
      <Text style={styles.sectionHeader}>CONSTITUTION</Text>
      <View style={styles.biologyCard}>
           <View style={styles.metricsRow}>
               <View>
                  <Text style={styles.metricLabel}>VO₂ MAX</Text>
                  <Text style={styles.metricValue}>{stats.biometrics.vo2Max?.toFixed(1) || '-'} <Text style={styles.unit}>ml/kg</Text></Text>
               </View>
               <View style={styles.dividerVertical} />
                <View>
                  <Text style={styles.metricLabel}>WEIGHT</Text>
                  <Text style={styles.metricValue}>- <Text style={styles.unit}>kg</Text></Text>
               </View>
                <View style={styles.dividerVertical} />
                <View>
                  <Text style={styles.metricLabel}>LEAN MASS</Text>
                  <Text style={styles.metricValue}>- <Text style={styles.unit}>%</Text></Text>
               </View>
           </View>
      </View>


      {/* 3. THE LOG */}
      <View style={styles.listContainer}>
        {(() => {
            // Merge Today (stats) with History
            // We use a Map to deduplicate by ID to prevent "Today" appearing twice (Live + History)
            const allDays = stats ? [stats, ...history] : history;
            
            // Flatten to items
            const allItems = allDays.flatMap(day => {
                if (day.activity.workouts.length > 0) {
                    return day.activity.workouts.map(workout => ({
                        type: 'WORKOUT',
                        label: formatWorkoutType(workout.type),
                        date: day.date,
                        value: workout.activeCalories,
                        id: workout.id
                    }));
                }
                return [{
                    type: 'RECOVERY',
                    label: 'Recovery',
                    date: day.date,
                    value: day.activity.activeCalories,
                    id: day.date + '_rec'
                }];
            });

            // Deduplicate by ID and slice
            const uniqueItems = Array.from(new Map(allItems.map(item => [item.id, item])).values());

            return uniqueItems
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Ensure descended sort
                .slice(0, 10)
                .map((item, i) => (
                    <View key={item.id} style={styles.compactRow}>
                        <View style={[
                              styles.iconDot, 
                              { backgroundColor: item.type === 'WORKOUT' ? '#10B981' : '#334155' }
                            ]} 
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.rowTitle}>{item.label}</Text>
                            <Text style={styles.rowDate}>{new Date(item.date).toLocaleDateString(undefined, {weekday:'short', day:'numeric'})}</Text>
                        </View>
                        <Text style={styles.rowValue}>{Math.round(item.value)} kcal</Text>
                    </View>
                ));
        })()}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate 900
    padding: 16,
  },
  loadingContainer: {
     flex: 1, 
     justifyContent: 'center', 
     alignItems: 'center',
     backgroundColor: '#0F172A',
  },
  loadingText: { color: '#64748B', fontFamily: 'Courier' },
  
  // Headers
  headerRow: {
      marginBottom: 24,
      marginTop: 8,
  },
  headerTitle: {
      color: '#E2E8F0',
      fontSize: 28,
      fontWeight: '900',
      letterSpacing: 1,
  },
  subHeader: {
      color: '#64748B',
      fontSize: 10,
      letterSpacing: 2,
      fontWeight: '600',
      marginTop: 4,
  },
  sectionHeader: {
      color: '#475569',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.5,
      marginBottom: 12,
      marginTop: 12,
  },

  // Vault Cards
  columns: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
  },
  biologyCard: {
      backgroundColor: '#1E293B', // Slate 800
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#334155',
  },
  cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
  },
  cardTitle: {
      color: '#94A3B8',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
  },
  signalBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
  },
  signalText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
  },

  // Metrics
  metricsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  metricLabel: {
      color: '#64748B',
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 0.5,
      marginBottom: 2,
  },
  metricValue: {
      color: '#F8FAFC',
      fontSize: 20,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
  },
  subMetric: {
      color: '#64748B',
      fontSize: 12,
      marginTop: 2,
  },
  unit: {
      fontSize: 12,
      color: '#64748B',
      fontWeight: '500',
  },
  dividerVertical: {
      width: 1,
      height: 24,
      backgroundColor: '#334155',
  },

  // List
  listContainer: {
      backgroundColor: '#1E293B',
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#334155',
  },
  compactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#334155',
  },
  iconDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
  },
  rowTitle: {
      color: '#E2E8F0',
      fontSize: 13,
      fontWeight: '600',
  },
  rowDate: {
      color: '#64748B',
      fontSize: 10,
      marginTop: 2,
  },
  rowValue: {
      color: '#94A3B8',
      fontSize: 12,
      fontFamily: 'Courier',
  }
});
