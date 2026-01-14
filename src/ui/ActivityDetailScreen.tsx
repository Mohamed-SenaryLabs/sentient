/**
 * ActivityDetailScreen - Shows detailed view of a workout/activity
 * 
 * Incremental build - Step 2: Added HR panel structure
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Workout } from '../data/schema';
import { colors, typography, spacing, radius } from './theme/tokens';
import { Screen } from './components/Screen';

interface ActivityDetailScreenProps {
  visible: boolean;
  workout: Workout | null;
  onClose: () => void;
}

export function ActivityDetailScreen({ visible, workout, onClose }: ActivityDetailScreenProps) {
  if (!workout) return null;

  // Determine if this is a "Training" category workout
  const isTrainingCategory = useMemo(() => {
    try {
      if (!workout?.type) return false;
      const regulationTypes = ['Yoga', 'Meditation', 'Mindful Movement', 'Stretching', 'Flexibility'];
      return !regulationTypes.some(type => workout.type?.toLowerCase().includes(type.toLowerCase()));
    } catch (error) {
      console.error('[ActivityDetail] Error determining training category:', error);
      return false;
    }
  }, [workout?.type]);

  // Calculate workout time window (safely)
  const workoutTimeWindow = useMemo(() => {
    try {
      if (!workout?.startDate) return null;
      const start = new Date(workout.startDate);
      if (isNaN(start.getTime())) {
        console.warn('[ActivityDetail] Invalid startDate:', workout.startDate);
        return null;
      }
      const durationMs = (workout.durationSeconds || 0) * 1000;
      const end = new Date(start.getTime() + durationMs);
      if (isNaN(end.getTime())) {
        console.warn('[ActivityDetail] Invalid end date calculated');
        return null;
      }
      return { start, end };
    } catch (error) {
      console.error('[ActivityDetail] Error calculating workout time window:', error);
      return null;
    }
  }, [workout?.startDate, workout?.durationSeconds]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Screen preset="scroll" safeAreaEdges={['top']}>
        <View style={styles.container}>
          {/* Header with close button */}
          <View style={styles.modalHeader}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{workout.type || 'Workout'}</Text>
              <Text style={styles.headerSubtitle}>
                {workout.durationSeconds ? `${Math.round(workout.durationSeconds / 60)} min` : ''}
                {workout.activeCalories ? ` • ${workout.activeCalories} kcal` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Heart Rate Panel - Only for Training category */}
          {isTrainingCategory && (
            <View style={styles.hrPanel}>
              <Text style={styles.panelTitle}>Heart rate</Text>
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Heart rate data will be loaded here</Text>
              </View>
              {/* Summary Row */}
              {(workout.avgHeartRate || workout.maxHeartRate) && (
                <View style={styles.summaryRow}>
                  {workout.avgHeartRate && <Text style={styles.summaryText}>Avg: {workout.avgHeartRate}</Text>}
                  {workout.avgHeartRate && workout.maxHeartRate && <Text style={styles.summaryText}> • </Text>}
                  {workout.maxHeartRate && <Text style={styles.summaryText}>Max: {workout.maxHeartRate}</Text>}
                </View>
              )}
            </View>
          )}

          {/* Basic workout info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Workout Details</Text>
            {workout.startDate && workoutTimeWindow && (
              <Text style={styles.infoText}>
                Started: {workoutTimeWindow.start.toLocaleString()}
              </Text>
            )}
            {workout.durationSeconds && (
              <Text style={styles.infoText}>
                Duration: {Math.round(workout.durationSeconds / 60)} minutes
              </Text>
            )}
            {workout.activeCalories && (
              <Text style={styles.infoText}>
                Calories: {workout.activeCalories} kcal
              </Text>
            )}
            {workout.distance && (
              <Text style={styles.infoText}>
                Distance: {(workout.distance / 1000).toFixed(2)} km
              </Text>
            )}
          </View>
        </View>
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing[4],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  header: {
    flex: 1,
    marginRight: spacing[2],
  },
  closeButton: {
    padding: spacing[2],
    marginTop: -spacing[1],
  },
  headerTitle: {
    ...typography.cardTitle,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[4],
  },
  infoTitle: {
    ...typography.cardTitle,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  hrPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  panelTitle: {
    ...typography.cardTitle,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  emptyContainer: {
    paddingVertical: spacing[6],
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  summaryText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
});
