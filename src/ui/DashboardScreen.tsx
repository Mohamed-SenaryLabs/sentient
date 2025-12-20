import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { OperatorDailyStats } from '../data/schema';

interface DashboardScreenProps {
  stats: OperatorDailyStats | null;
  status: string;
  onRefresh: () => void;
  refreshing: boolean;
}

export function DashboardScreen({ stats, status, onRefresh, refreshing }: DashboardScreenProps) {
  if (!stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>INITIALIZING...</Text>
        <Text style={styles.statusText}>{status}</Text>
      </View>
    );
  }

  const { systemStatus, alignmentStatus } = stats.stats;
  const { directive, session_focus } = stats.logicContract || { directive: { category: '-', stimulus_type: '-' }, session_focus: '-' };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
    >
      {/* 1. STATUS HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateText}>{new Date().toDateString().toUpperCase()}</Text>
          <Text style={styles.greetingText}>OPERATOR ONLINE</Text>
        </View>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: alignmentStatus === 'ALIGNED' ? '#10B981' : '#EF4444' }]} />
          <Text style={styles.statusLabel}>{alignmentStatus || 'CALIBRATING'}</Text>
        </View>
      </View>

      {/* 2. MAIN DIRECTIVE CARD */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>CURRENT DIRECTIVE</Text>
        <View style={styles.directiveRow}>
          <Text style={styles.directiveLarge}>{directive.category}</Text>
          <Text style={styles.directiveSub}>{directive.stimulus_type}</Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.cardLabel}>SESSION FOCUS</Text>
        <Text style={styles.focusText}>{session_focus}</Text>
        
        {/* Analyst Note */}
        {startWithAnalystNote(stats.activeSession?.instructions || '') && (
           <View style={styles.analystBox}>
               <Text style={styles.analystLabel}>ANALYST NOTE</Text>
               <Text style={styles.analystText}>{extractAnalystNote(stats.activeSession?.instructions)}</Text>
           </View>
        )}
      </View>

      {/* 3. BIOMETRICS STRIPE */}
      <View style={styles.stripe}>
        <View style={styles.metric}>
           <Text style={styles.metricLabel}>HRV</Text>
           <Text style={styles.metricValue}>{stats.biometrics.hrv} ms</Text>
        </View>
        <View style={styles.metric}>
           <Text style={styles.metricLabel}>SLEEP</Text>
           <Text style={styles.metricValue}>{Math.round(stats.sleep.totalDurationSeconds / 3600)} hr</Text>
        </View>
        <View style={styles.metric}>
           <Text style={styles.metricLabel}>RHR</Text>
           <Text style={styles.metricValue}>{stats.biometrics.restingHeartRate} bpm</Text>
        </View>
      </View>

       {/* 4. SYSTEM STATE */}
       <View style={styles.card}>
          <Text style={styles.cardLabel}>SYSTEM STATE</Text>
          <Text style={styles.stateLarge}>{systemStatus.current_state}</Text>
          <Text style={styles.lensText}>LENS: {systemStatus.active_lens}</Text>
       </View>

    </ScrollView>
  );
}

// Helpers
const startWithAnalystNote = (text: string) => text.includes('Analyst Note:');
const extractAnalystNote = (text?: string) => {
    if (!text) return '';
    const parts = text.split('Analyst Note:');
    return parts.length > 1 ? parts[1].trim() : text;
};


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
  loadingText: {
    color: '#10B981',
    fontFamily: 'Courier',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusText: {
    color: '#64748B',
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  dateText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  greetingText: {
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusLabel: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  directiveRow: {
    marginBottom: 8,
  },
  directiveLarge: {
    color: '#F59E0B', // Amber
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  directiveSub: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 0,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 16,
  },
  focusText: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 22,
  },
  analystBox: {
      marginTop: 16,
      backgroundColor: '#0F172A',
      padding: 12,
      borderRadius: 8,
      borderLeftWidth: 2,
      borderLeftColor: '#10B981',
  },
  analystLabel: {
      color: '#10B981',
      fontSize: 10,
      fontWeight: 'bold',
      marginBottom: 4,
  },
  analystText: {
      color: '#94A3B8',
      fontSize: 13,
      fontStyle: 'italic',
  },
  stripe: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metric: {
    backgroundColor: '#1E293B',
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricValue: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stateLarge: {
      color: '#E2E8F0',
      fontSize: 24,
      fontWeight: 'bold',
      marginTop: 4,
  },
  lensText: {
      color: '#3B82F6',
      fontSize: 12,
      marginTop: 4,
      fontWeight: '600',
      letterSpacing: 1,
  }
});
