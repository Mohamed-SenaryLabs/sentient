import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, SafeAreaView } from 'react-native';
import { OperatorDailyStats } from '../data/schema';

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
      <Text style={[
        styles.cell, 
        { color: item.stats.alignmentStatus === 'ALIGNED' ? '#10B981' : item.stats.alignmentStatus === 'MISALIGNED' ? '#EF4444' : '#64748B' }
      ]}>
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
                contentContainerStyle={{ paddingBottom: 40 }}
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
    backgroundColor: '#0F172A', // Slate-900
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    color: '#E2E8F0',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 6,
  },
  closeText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  tableBorder: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingVertical: 12,
    alignItems: 'center',
  },
  cell: {
    width: 60,
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
  },
  dateCell: {
    width: 50,
    fontWeight: 'bold',
    color: '#E2E8F0',
  },
  wideCell: {
    width: 100,
  },
  headerCell: {
    color: '#64748B',
    fontWeight: 'bold',
    fontSize: 11,
    textTransform: 'uppercase',
  },
});
