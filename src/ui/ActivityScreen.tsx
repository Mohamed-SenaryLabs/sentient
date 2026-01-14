/**
 * ActivityScreen - Shows activity log with workout history
 * 
 * Displays workouts and recovery days grouped by date.
 * Tapping a workout opens ActivityDetailScreen with HR histogram.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from './components/Screen';
import { OperatorDailyStats, Workout } from '../data/schema';
import { colors, typography, spacing, radius } from './theme/tokens';
import { ActivityDetailScreen } from './ActivityDetailScreen';

interface ActivityScreenProps {
  stats: OperatorDailyStats | null;
  history: OperatorDailyStats[];
  onRefresh: () => void;
  refreshing: boolean;
}

export function ActivityScreen({ stats, history, onRefresh, refreshing }: ActivityScreenProps) {
  const [logExpanded, setLogExpanded] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [showActivityDetail, setShowActivityDetail] = useState(false);

  if (!stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>LOADING ACTIVITIES...</Text>
      </View>
    );
  }

  // Format workout type
  const formatWorkoutType = (type: string) => {
    if (!type) return 'Workout';
    // Capitalize first letter of each word
    return type.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  // Get activity icon
  const getActivityIcon = (item: { type: string; label: string }) => {
    if (item.type === 'WORKOUT') {
      const label = item.label.toLowerCase();
      if (label.includes('run')) return 'walk-outline';
      if (label.includes('cycle') || label.includes('bike')) return 'bicycle-outline';
      if (label.includes('swim')) return 'water-outline';
      if (label.includes('strength') || label.includes('weight')) return 'barbell-outline';
      return 'fitness-outline';
    }
    return 'leaf-outline';
  };

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
  
  const daysToShow = logExpanded ? sortedDays : sortedDays.slice(0, 10);

  // Normalize dates to YYYY-MM-DD for comparison (handles timezone issues)
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
    <Screen preset="scroll" safeAreaEdges={['top']}>
      <View style={styles.container}>
        <Text style={styles.sectionHeader}>ACTIVITY LOG</Text>
        
        {sortedDays.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No activities recorded yet.</Text>
          </View>
        ) : (
          <>
            {daysToShow.map((dayGroup) => {
              const dayDateStr = normalizeDate(dayGroup.date);
              const dayDate = new Date(dayGroup.date + 'T00:00:00');
              
              let dayLabel: string;
              if (dayDateStr === today) dayLabel = 'Today';
              else if (dayDateStr === yesterday) dayLabel = 'Yesterday';
              else dayLabel = dayDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

              return (
                <View key={dayGroup.date} style={styles.logDayGroup}>
                  <Text style={styles.logDayHeader}>{dayLabel.toUpperCase()}</Text>
                  {dayGroup.activities.map((item) => {
                    // Find the workout object from stats/history
                    const workout: Workout | null = item.type === 'WORKOUT' 
                      ? (() => {
                          // Search through all days to find the workout
                          for (const day of allDays) {
                            const found = day?.activity?.workouts?.find(w => w.id === item.id);
                            if (found) return found;
                          }
                          // If not found, create a minimal workout object from item data
                          return {
                            id: item.id,
                            type: item.label,
                            durationSeconds: item.duration || 0,
                            activeCalories: item.value,
                            avgHeartRate: item.minHr && item.maxHr ? Math.round((item.minHr + item.maxHr) / 2) : undefined,
                            maxHeartRate: item.maxHr,
                            minHeartRate: item.minHr,
                            startDate: item.date ? new Date(item.date + 'T12:00:00').toISOString() : undefined,
                          };
                        })()
                      : null;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.logRow}
                        onPress={() => {
                          if (workout && item.type === 'WORKOUT') {
                            setSelectedWorkout(workout);
                            setShowActivityDetail(true);
                          }
                        }}
                        disabled={item.type !== 'WORKOUT'}
                        activeOpacity={item.type === 'WORKOUT' ? 0.7 : 1}
                      >
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
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
            
            {sortedDays.length > 10 && (
              <TouchableOpacity 
                style={styles.logExpandButton}
                onPress={() => setLogExpanded(!logExpanded)}
                activeOpacity={0.7}
              >
                <Text style={styles.logExpandText}>
                  {logExpanded ? 'Show Less' : `Show ${sortedDays.length - 10} More Days`}
                </Text>
                <Ionicons 
                  name={logExpanded ? 'chevron-up-outline' : 'chevron-down-outline'} 
                  size={16} 
                  color={colors.accent.vitality} 
                />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Activity Detail Modal */}
      <ActivityDetailScreen
        visible={showActivityDetail}
        workout={selectedWorkout}
        onClose={() => {
          setShowActivityDetail(false);
          setSelectedWorkout(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.meta,
    color: colors.text.secondary,
    letterSpacing: 1,
  },
  sectionHeader: {
    ...typography.meta,
    color: colors.text.tertiary,
    marginBottom: spacing[3],
    letterSpacing: 1,
  },
  emptyContainer: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  logDayGroup: {
    marginBottom: spacing[4],
  },
  logDayHeader: {
    ...typography.meta,
    color: colors.text.tertiary,
    marginBottom: spacing[2],
    letterSpacing: 0.5,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginBottom: spacing[2],
  },
  logIconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.subtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  logContent: {
    flex: 1,
  },
  logTitle: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  logMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logDetail: {
    ...typography.meta,
    color: colors.text.secondary,
  },
  logValueContainer: {
    alignItems: 'flex-end',
  },
  logValue: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  logUnit: {
    ...typography.meta,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  logExpandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  logExpandText: {
    ...typography.bodySmall,
    color: colors.accent.vitality,
  },
});

