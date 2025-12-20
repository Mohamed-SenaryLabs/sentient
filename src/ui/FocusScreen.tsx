import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { OperatorDailyStats } from '../data/schema';
import { getReadableState, getDirectiveLabel } from './DisplayTranslator';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FocusScreenProps {
  stats: OperatorDailyStats | null;
  status: string;
  onRefresh: () => void;
  refreshing: boolean;
}

export function FocusScreen({ stats, status, onRefresh, refreshing }: FocusScreenProps) {
  const [showContext, setShowContext] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState(false);

  // Safe access to nested data
  const directive = stats?.logicContract?.directive;
  const sysStatus = stats?.stats?.systemStatus;
  
  // Use Translator for State Label
  const stateLabel = sysStatus 
    ? getReadableState(sysStatus.current_state)
    : "System Initializing...";

  if (!stats || !directive) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{stateLabel}</Text>
      </View>
    );
  }

  const { systemStatus } = stats.stats;
  const { session_focus } = stats.logicContract || { session_focus: '' };

  // 1. Primary Hero Label (Category — Stimulus)
  const primaryLabel = getDirectiveLabel(directive.category, directive.stimulus_type);
  
  // 2. Secondary Hero Label (Session Focus or Title)
  const secondaryLabel = session_focus || stats.activeSession?.display.title || "Daily Focus";

  // 3. Determine CONSTRAINTS
  const avoid = getConstraints(systemStatus.current_state, directive.category);

  // 4. Analyst Context
  const analystNote = stats.activeSession?.analyst_insight;

  const toggleContext = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowContext(!showContext);
  };
  
  const toggleInsight = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedInsight(!expandedInsight);
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40, paddingTop: 10 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E2E8F0" />}
    >
      {/* HERO SECTION */}
      <View style={styles.heroSection}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.intentTitle}>{primaryLabel}</Text>
        <Text style={styles.intentSub}>{secondaryLabel}</Text>
      </View>

      <View style={styles.divider} />

      {/* ACTIONABLE ADVICE */}
      {/* Removed "PRIORITY" section as it was often redundant with Secondary Label. 
          If strictly needed, we can re-add, but PRD prefers focus on Hero. 
          The 'session_focus' is now in the hero. 
      */}

      <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: '#F87171' }]}>AVOID</Text>
          <Text style={styles.avoidText}>{avoid}</Text>
      </View>

      <View style={styles.spacer} />

      {/* HIDDEN CONTEXT (Tap to Reveal) */}
      <TouchableOpacity activeOpacity={0.8} onPress={toggleContext} style={styles.contextButton}>
           <Text style={styles.contextButtonText}>
               {showContext ? "Hide context" : "Why this directive?"}
           </Text>
      </TouchableOpacity>

      {showContext && (
          <View style={styles.contextCard}>
              <Text style={styles.contextLabel}>ANALYST INSIGHT</Text>
              <Text 
                style={styles.contextText} 
                numberOfLines={expandedInsight ? undefined : 3}
                ellipsizeMode="tail"
              >
                  "{analystNote || "Updating Intelligence..."}"
              </Text>
              
              {analystNote && analystNote.length > 100 && (
                  <TouchableOpacity onPress={toggleInsight} style={{ marginTop: 8 }}>
                      <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '600' }}>
                          {expandedInsight ? "Show less" : "Read complete analysis"}
                      </Text>
                  </TouchableOpacity>
              )}

              
              <View style={styles.metaContainer}>
                  <Text style={styles.metaText}>
                      STATE: {getReadableState(systemStatus.current_state)}
                  </Text>
                  <Text style={styles.metaText}>
                      VITALITY: {stats.stats.vitality > 0 ? `${stats.stats.vitality}%` : "Estimating..."}
                  </Text>
              </View>
          </View>
      )}

    </ScrollView>
  );
}

// --- LOGIC MAPPING ---

function getConstraints(state: string, category: string): string {
    if (state === 'RECOVERY_MODE') return "High intensity efforts. Accumulated fatigue is high.";
    if (state === 'PHYSICAL_STRAIN') return "Impact loading. Neural system requires downtime.";
    
    if (category === 'STRENGTH') return "Glycolytic burnout. Keep reps low, quality high.";
    if (category === 'ENDURANCE') return "Anaerobic spikes. Stay within aerobic threshold.";
    
    return "Excessive volume beyond limits.";
}

const extractAnalystNote = (text?: string) => {
    if (!text) return '';
    const parts = text.split('Analyst Insight:');
    return parts.length > 1 ? parts[1].trim() : null;
};

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 24,
  },
  loadingContainer: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  loadingText: { 
    color: '#64748B', 
    letterSpacing: 2 
  },
  heroSection: {
      marginTop: 0,
      marginBottom: 30,
  },
  greeting: {
      color: '#94A3B8', // Lighter for better readability
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 2,
      marginBottom: 16,
  },
  intentTitle: {
      color: '#E2E8F0',
      fontSize: 32, // Reduced from 36 to fit better
      fontWeight: '900', // Heavy impact
      letterSpacing: -0.5,
      lineHeight: 40,
  },
  intentSub: {
      color: '#10B981', // Emerald
      fontSize: 24,
      fontWeight: '500',
      marginTop: 8,
  },
  divider: {
      height: 1,
      backgroundColor: '#334155',
      marginBottom: 30,
  },
  section: {
      marginBottom: 8,
  },
  sectionHeader: {
      color: '#94A3B8',
      fontSize: 12,
      fontWeight: 'bold',
      letterSpacing: 1,
      marginBottom: 12,
  },
  actionText: {
      color: '#E2E8F0',
      fontSize: 22,
      lineHeight: 32,
      fontWeight: '400',
  },
  avoidText: {
      color: '#FCA5A5', // Soft Red
      fontSize: 20,
      lineHeight: 30,
      fontWeight: '400',
  },
  spacer: {
      height: 40,
  },
  contextButton: {
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: '#334155',
      marginTop: 20,
      alignItems: 'flex-start',
  },
  contextButtonText: {
      color: '#64748B',
      fontSize: 14, // Slightly larger for readability
      fontWeight: '500',
  },
  contextCard: {
      backgroundColor: '#1E293B',
      padding: 20,
      borderRadius: 4,
      marginTop: 0,
  },
  contextLabel: {
      color: '#64748B',
      fontSize: 10,
      fontWeight: 'bold',
      marginBottom: 8,
  },
  contextText: {
      color: '#94A3B8',
      fontSize: 14,
      lineHeight: 22,
      fontStyle: 'italic',
  },
    sessionFocus: {
        fontSize: 24, // Hero size
        fontFamily: 'System', // Use system font for bold weight
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'left',
        marginBottom: 20,
        lineHeight: 32,
    },
    metaContainer: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: '#334155',
      flexDirection: 'row',
      flexWrap: 'wrap', // Fix: Allow wrapping
      gap: 16,
  },
  metaText: {
      color: '#475569',
      fontSize: 10,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      flexShrink: 1, // Fix: Prevent overflow
  }
});
