import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, SafeAreaView } from 'react-native';
import { OperatorDailyStats } from '../data/schema';
import { colors, typography, spacing, radius } from './theme/tokens';

interface DataViewerModalProps {
  visible: boolean;
  onClose: () => void;
  data: OperatorDailyStats[];
}

export function DataViewerModal({ visible, onClose, data }: DataViewerModalProps) {
  
  const getWorkoutsString = (item: OperatorDailyStats) => {
    if (!item.activity.workouts || item.activity.workouts.length === 0) return '-';
    // Return unique types e.g. "Run, Lift"
    const types = Array.from(new Set(item.activity.workouts.map(w => w.type)));
    return types.join(', ');
  };

  const getDirectiveString = (item: OperatorDailyStats) => {
    if (!item.logicContract) return '-';
    return `${item.logicContract.directive.category.charAt(0)}/${item.logicContract.directive.stimulus_type.substring(0,3)}`;
  };

  const getAlignmentColor = (status: string | undefined) => {
    if (status === 'ALIGNED') return colors.accent.primary;
    if (status === 'MISALIGNED') return colors.accent.strain;
    return colors.text.secondary;
  };

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <Text style={[styles.cell, styles.dateCell, styles.headerCell]}>Date</Text>
      <Text style={[styles.cell, styles.headerCell]}>HRV</Text>
      <Text style={[styles.cell, styles.headerCell]}>RHR</Text>
      <Text style={[styles.cell, styles.headerCell]}>VO2</Text>
      <Text style={[styles.cell, styles.wideCell, styles.headerCell]}>Workouts</Text>
      <Text style={[styles.cell, styles.wideCell, styles.headerCell]}>Directive</Text>
      <Text style={[styles.cell, styles.headerCell]}>Sleep</Text>
      <Text style={[styles.cell, styles.headerCell]}>Align</Text>
    </View>
  );

  const renderItem = ({ item }: { item: OperatorDailyStats }) => (
    <View style={styles.row}>
      <Text style={[styles.cell, styles.dateCell]}>{item.date.slice(5)}</Text> 
      <Text style={styles.cell}>{item.biometrics.hrv || '-'}</Text>
      <Text style={styles.cell}>{item.biometrics.restingHeartRate || '-'}</Text>
      <Text style={styles.cell}>{item.biometrics.vo2Max ? item.biometrics.vo2Max.toFixed(1) : '-'}</Text>
      <Text style={[styles.cell, styles.wideCell]} numberOfLines={1}>{getWorkoutsString(item)}</Text>
      <Text style={[styles.cell, styles.wideCell]} numberOfLines={1}>{getDirectiveString(item)}</Text>
      <Text style={styles.cell}>{Math.round(item.sleep.totalDurationSeconds / 3600)}h</Text>
      <Text style={[styles.cell, { color: getAlignmentColor(item.stats.alignmentStatus) }]}>
        {item.stats.alignmentStatus ? item.stats.alignmentStatus.charAt(0) : '-'}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.modalHeader}>
          <Text style={styles.title}>Data Inspector</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tableBorder}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              {renderHeader()}
              <FlatList
                data={data}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing[4],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[5],
    marginTop: spacing[3],
  },
  title: {
    ...typography.compactMetric,
    fontSize: 20, // Scaled for modal title
    letterSpacing: 1,
  },
  closeButton: {
    padding: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radius.input,
  },
  closeText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  tableBorder: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    paddingVertical: spacing[3],
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  cell: {
    width: 60,
    textAlign: 'center',
    ...typography.meta,
  },
  dateCell: {
    width: 50,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  wideCell: {
    width: 100,
  },
  headerCell: {
    ...typography.small,
    color: colors.text.secondary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  listContent: {
    paddingBottom: spacing[7],
  },
});
