
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView } from 'react-native';
import { OperatorDailyStats } from '../data/schema';

interface DataViewerModalProps {
  visible: boolean;
  onClose: () => void;
  data: OperatorDailyStats[];
}

export function DataViewerModal({ visible, onClose, data }: DataViewerModalProps) {
  const renderHeader = () => (
    <View style={styles.row}>
      <Text style={[styles.cell, styles.headerCell, { flex: 2 }]}>Date</Text>
      <Text style={[styles.cell, styles.headerCell]}>HRV</Text>
      <Text style={[styles.cell, styles.headerCell]}>Steps</Text>
      <Text style={[styles.cell, styles.headerCell]}>Sleep</Text>
      <Text style={[styles.cell, styles.headerCell, { flex: 1.5 }]}>Status</Text>
    </View>
  );

  const renderItem = ({ item }: { item: OperatorDailyStats }) => (
    <View style={styles.row}>
      <Text style={[styles.cell, { flex: 2 }]}>{item.date.slice(5)}</Text>
      <Text style={styles.cell}>{item.biometrics.hrv || '-'}</Text>
      <Text style={styles.cell}>{item.activity.steps > 0 ? (item.activity.steps / 1000).toFixed(1) + 'k' : '-'}</Text>
      <Text style={styles.cell}>{Math.round(item.sleep.totalDurationSeconds / 3600)}h</Text>
      <Text style={[styles.cell, { flex: 1.5, fontSize: 10, color: item.stats.alignmentStatus === 'ALIGNED' ? '#10B981' : '#64748B' }]}>
        {item.stats.alignmentStatus || '-'}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>History Log</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tableContainer}>
          {renderHeader()}
          <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
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
  header: {
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
  },
  closeText: {
    color: '#3B82F6', // Blue-500
    fontSize: 16,
    fontWeight: '600',
  },
  tableContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    backgroundColor: '#1E293B', // Slate-800
  },
  row: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    color: '#94A3B8', // Slate-400
    fontSize: 12,
    textAlign: 'center',
  },
  headerCell: {
    color: '#E2E8F0',
    fontWeight: 'bold',
    fontSize: 11,
    textTransform: 'uppercase',
  },
});
