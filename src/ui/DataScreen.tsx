import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { OperatorDailyStats } from '../data/schema';
import { getReadableState } from './DisplayTranslator';

interface DataScreenProps {
  stats: OperatorDailyStats | null;
  history: OperatorDailyStats[];
  onRefresh: () => void;
  refreshing: boolean;
}

export function DataScreen({ stats, history, onRefresh, refreshing }: DataScreenProps) {
  if (!stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>NO DATA</Text>
      </View>
    );
  }

  // Slice last 7 days for charts (reverse because history is Newest -> Oldest)
  const last7Days = history.slice(0, 7).reverse();

  const formatWorkoutType = (type: string) => {
      // Handle legacy/cached "Workout (ID)" strings
      if (type.includes('Workout (63)')) return 'HIIT';
      if (type.includes('Workout (20)')) return 'Functional Strength';
      if (type.includes('Workout (50)')) return 'Strength Training';
      if (type.includes('Workout (37)')) return 'Run';
      if (type.includes('Workout (52)')) return 'Walk';
      if (type.includes('Workout (13)')) return 'Cycle';
      
      // Handle standard strings
      if (type === 'High Intensity Interval Training') return 'HIIT';
      if (type === 'Functional Strength Training') return 'Functional Strength';
      if (type === 'Traditional Strength Training') return 'Strength Training';
      if (type === 'Core Training') return 'Core';
      if (type === 'Walking') return 'Walk';
      if (type === 'Running') return 'Run';
      if (type === 'Cycling') return 'Cycle';
      return type.replace('Traditional ', '');
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Biometrics</Text>
        <Text style={styles.subHeader}>Last 30 Days</Text>
      </View>

      {/* 1. KEY METRICS (Compact Grid) */}
      <View style={styles.grid}>
          <MetricSquare 
            label="VO₂ Max" 
            value={stats.biometrics.vo2Max?.toFixed(1) || '-'} 
            subValue="Fitness"
            color="#10B981"
            trend={last7Days.map(d => d.biometrics.vo2Max || 0)}
          />
           <MetricSquare 
            label="RHR" 
            value={stats.biometrics.restingHeartRate?.toString() || '-'} 
            subValue="bpm"
            color="#F59E0B"
            trend={last7Days.map(d => d.biometrics.restingHeartRate || 60)}
          />
           <MetricSquare 
            label="HRV" 
            value={stats.biometrics.hrv?.toString() || '-'} 
            subValue="ms"
            color="#3B82F6"
            trend={last7Days.map(d => d.biometrics.hrv || 40)}
          />
           <MetricSquare 
            label="Sleep" 
            value={(stats.sleep.totalDurationSeconds/3600).toFixed(1)} 
            subValue="hrs"
            color="#8B5CF6"
            trend={last7Days.map(d => d.sleep.totalDurationSeconds/3600)}
          />
      </View>

      {/* 2. DAILY LOAD (Strain) */}
      <View style={styles.card}>
         <View style={styles.cardHeaderRow}>
             <Text style={styles.cardTitle}>Daily Load</Text>
             <Text style={styles.cardStatus}>{getReadableState(stats.stats.systemStatus.current_state)}</Text>
         </View>
         
         <View style={styles.chartArea}>
             {/* Cardio -> Metabolic */}
             <CompactBar 
                value={stats.stats.systemStatus.axes.metabolic} 
                color="#3B82F6" 
                label="Cardio"
             />
             {/* Muscle -> Mechanical */}
             <CompactBar 
                value={stats.stats.systemStatus.axes.mechanical} 
                color="#F59E0B" 
                label="Muscle"
             />
             {/* CNS -> Neural */}
             <CompactBar 
                value={stats.stats.systemStatus.axes.neural} 
                color="#8B5CF6" 
                label="Neural"
             />
         </View>
      </View>

      {/* 3. RECENT ACTIVITY (Compact List) */}
      <Text style={styles.sectionHeader}>On The Log</Text>
      <View style={styles.listContainer}>
        {(() => {
            // Merge Today (stats) with History, ensuring no duplicate dates
            // If stats exists, filter it out of history to avoid double counting if it was already saved
            const historyExcludingToday = history.filter(d => d.date !== stats?.date);
            const fullLog = stats ? [stats, ...historyExcludingToday] : history;

            return fullLog.slice(0, 7).flatMap(day => {
                // Case A: Multiple Workouts
            if (day.activity.workouts.length > 0) {
                return day.activity.workouts.map(workout => ({
                    type: 'WORKOUT',
                    label: formatWorkoutType(workout.type),
                    date: day.date,
                    value: workout.activeCalories,
                    id: workout.id
                }));
            }
            // Case B: No Workouts (Recovery)
            return [{
                type: 'RECOVERY',
                label: 'Recovery',
                date: day.date,
                value: day.activity.activeCalories, // Total active cals for the day
                id: day.date + '_rec'
            }];
        }).slice(0, 7) // Show top 7 items (workouts or recovery days)
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

// --- SUB COMPONENTS ---

const MetricSquare = ({ label, value, subValue, color, trend }: any) => (
    <View style={styles.metricSquare}>
        <View style={{ justifyContent: 'space-between', height: '100%' }}>
            <View>
                 <Text style={styles.metricLabel}>{label}</Text>
                 <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                    <Text style={styles.mediumValue}>{value}</Text>
                    <Text style={styles.unitText}>{subValue}</Text>
                 </View>
            </View>
            
            <View style={{ height: 24, justifyContent: 'flex-end' }}>
                 <TrendLine data={trend} color={color} />
            </View>
        </View>
    </View>
);

const CompactBar = ({ value, color, label }: any) => (
    <View style={styles.barRow}>
        <Text style={styles.barLabel}>{label}</Text>
        <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(value, 100)}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.barValue}>{Math.round(value)}%</Text>
    </View>
);

const TrendLine = ({ data, color }: { data: number[], color: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flex: 1, gap: 2 }}>
        {data.map((val, i) => (
             <View 
                key={i} 
                style={{ 
                    flex: 1, 
                    backgroundColor: color, 
                    opacity: 0.3 + (i/data.length)*0.7,
                    borderRadius: 1,
                    height: `${(val / (Math.max(...data)||1)) * 100}%`,
                    minHeight: 4
                }} 
            />
        ))}
    </View>
);


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
  },
  loadingContainer: {
     flex: 1, 
     justifyContent: 'center', 
     alignItems: 'center',
     backgroundColor: '#0F172A',
  },
  loadingText: { color: '#64748B' },
  headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 16,
      marginTop: 8,
  },
  headerTitle: {
      color: '#E2E8F0',
      fontSize: 24,
      fontWeight: 'bold',
  },
  subHeader: {
      color: '#64748B',
      fontSize: 12,
  },
  sectionHeader: {
      color: '#94A3B8',
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 24,
      marginBottom: 12,
  },
  // Grid
  grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
  },
  metricSquare: {
      width: '48%',
      aspectRatio: 1.4,
      backgroundColor: '#1E293B',
      borderRadius: 16,
      padding: 16,
      // No border for cleaner look, just clear separation
  },
  metricLabel: {
      color: '#94A3B8',
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 4,
  },
  mediumValue: {
      color: '#E2E8F0',
      fontSize: 22,
      fontWeight: 'bold',
  },
  unitText: {
      color: '#64748B',
      fontSize: 12,
  },
  // Strain Card
  card: {
      backgroundColor: '#1E293B',
      borderRadius: 16,
      padding: 20,
      marginTop: 12,
  },
  cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
  },
  cardTitle: {
      color: '#E2E8F0',
      fontSize: 16,
      fontWeight: '600',
  },
  cardStatus: {
      color: '#10B981',
      fontSize: 12,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: 'hidden'
  },
  chartArea: {
      gap: 12,
  },
  barRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  barLabel: {
      width: 50,
      color: '#94A3B8',
      fontSize: 12,
      fontWeight: '500',
  },
  track: {
      flex: 1,
      height: 6,
      backgroundColor: '#0F172A',
      borderRadius: 3,
  },
  fill: {
      height: '100%',
      borderRadius: 3,
  },
  barValue: {
      width: 30,
      textAlign: 'right',
      color: '#64748B',
      fontSize: 11,
  },
  // List
  listContainer: {
      backgroundColor: '#1E293B',
      borderRadius: 16,
      padding: 4,
  },
  compactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#334155',
  },
  iconDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
  },
  rowTitle: {
      color: '#E2E8F0',
      fontSize: 14,
      fontWeight: '500',
  },
  rowDate: {
      color: '#64748B',
      fontSize: 11,
  },
  rowValue: {
      color: '#94A3B8',
      fontSize: 12,
      fontWeight: '500',
  }
});
