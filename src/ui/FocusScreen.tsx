import React, { useState, useEffect } from 'react';
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

  // Animate on load
  useEffect(() => {
    if (stats) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [stats]);

  // Safe access to nested data
  const directive = stats?.logicContract?.directive;
  const sysStatus = stats?.stats?.systemStatus;
  
  // PRD §4.X.5: Check availability status
  const isUnavailable = stats?.stats?.vitalityAvailability === 'UNAVAILABLE';
  const unavailableReason = stats?.stats?.vitalityUnavailableReason;
  
  // Use Translator for State Label
  const stateLabel = sysStatus 
    ? getReadableState(sysStatus.current_state)
    : "System Initializing...";



  if (!stats || !directive) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingTitle}>Sentient</Text>
        <Text style={styles.loadingText}>{status || stateLabel}</Text>
        {status.includes('...') && (
          <View style={styles.loadingDots}>
            <Text style={styles.dot}>●</Text>
            <Text style={styles.dot}>●</Text>
            <Text style={styles.dot}>●</Text>
          </View>
        )}
      </View>
    );
  }

  const { systemStatus } = stats.stats;
  const { session_focus, session_focus_llm, avoid_cue, analyst_insight } = stats.logicContract || {};

  // 1. Primary Hero Label (Category — Stimulus)
  const primaryLabel = getDirectiveLabel(directive.category, directive.stimulus_type);
  
  // 2. Secondary Hero Label (Session Focus or Title)
  const secondaryLabel = session_focus_llm || session_focus || stats.activeSession?.display.title || "Daily Focus";

  // 3. Determine CONSTRAINTS
  const avoid = avoid_cue || getConstraints(systemStatus.current_state, directive.category);

  // 4. Analyst Context
  const analystNote = analyst_insight?.summary || stats.activeSession?.analyst_insight;
  const analystDetail = analyst_insight?.detail;
  const contentSource = stats.logicContract?.content_source;
  
  // PRD §4.X.5: Visual treatment for Low Vitality (< 30) vs normal
  const isLowVitality = stats.stats.vitality < 30;
  const vitalityColor = isLowVitality ? '#F87171' : '#10B981'; // Red vs Emerald

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
        
        {/* INTRA_DAY_RECAL: Status Indicator */}
        {stats.logicContract?.last_recal_at ? (
          <Text style={styles.recalStatus}>
            Updated {new Date(stats.logicContract.last_recal_at).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit' 
            })}
          </Text>
        ) : (
          <Text style={styles.recalStatus}>Monitoring</Text>
        )}
        
        <Text style={styles.intentTitle}>{primaryLabel}</Text>
        <Text style={[styles.intentSub, { color: vitalityColor }]}>{secondaryLabel}</Text>
      </View>

      <View style={styles.divider} />

      {/* Low Vitality Warning Banner */}
      {isLowVitality && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ Vitality is low ({stats.stats.vitality}%). Recovery is recommended.
          </Text>
        </View>
      )}

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
              
              {!!(analystNote && analystNote.length > 100) && (
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
                  <Text style={[styles.metaText, { color: isLowVitality ? '#F87171' : '#475569' }]}>
                      VITALITY: {stats.stats.vitality > 0 ? `${stats.stats.vitality}%` : "Estimating..."}
                  </Text>
                  <Text style={styles.metaText}>
                      CONFIDENCE: {stats.stats.vitalityConfidence || 'HIGH'}
                  </Text>
                  
                  {/* INTRA_DAY_RECAL: Metadata Row */}
                  <View style={{ width: '100%', marginTop: 8, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 8 }}>
                    <Text style={styles.metaText}>
                        LAST UPDATE: {stats.logicContract?.last_recal_at 
                            ? new Date(stats.logicContract.last_recal_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                            : 'Initial Generation'}
                    </Text>
                     {!!stats.logicContract?.last_recal_reason && (
                        <Text style={[styles.metaText, { marginTop: 4, color: '#94A3B8' }]}>
                            REASON: {stats.logicContract.last_recal_reason}
                        </Text>
                    )}
                    {stats.logicContract?.recal_count !== undefined && (
                        <Text style={[styles.metaText, { marginTop: 4 }]}>
                            RECAL COUNT: {stats.logicContract.recal_count}
                        </Text>
                    )}
                  </View>
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

// PRD §4.X.5: User-friendly unavailable messages
function getUnavailableMessage(reason?: string): string {
    switch (reason) {
        case 'INSUFFICIENT_BASELINE':
            return "Building your baseline...";
        case 'SLEEP_DATA_MISSING':
            return "No sleep data today";
        case 'HRV_MISSING':
            return "HRV data unavailable";
        case 'INSUFFICIENT_DATA':
            return "Not enough data";
        default:
            return "Collecting more data...";
    }
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
    recalStatus: {
        fontSize: 10,
        color: '#64748B', // Muted slate
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
        fontFamily: 'System',
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
      flexShrink: 1,
  },
  // PRD §4.X.5: Unavailable state styles
  unavailableCard: {
      backgroundColor: '#1E293B',
      padding: 24,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 20,
  },
  unavailableIcon: {
      fontSize: 48,
      marginBottom: 16,
  },
  unavailableTitle: {
      color: '#94A3B8',
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 8,
  },
  unavailableText: {
      color: '#64748B',
      fontSize: 14,
      lineHeight: 22,
      textAlign: 'center',
  },
  // PRD §4.X.5: Low vitality warning banner
  warningBanner: {
      backgroundColor: 'rgba(248, 113, 113, 0.15)',
      padding: 12,
      borderRadius: 6,
      marginBottom: 20,
      borderLeftWidth: 3,
      borderLeftColor: '#F87171',
  },
  warningText: {
      color: '#F87171',
      fontSize: 14,
      lineHeight: 20,
  },
  // Loading screen styles
  loadingTitle: {
      color: '#10B981',
      fontSize: 32,
      fontWeight: 'bold',
      letterSpacing: 2,
      marginBottom: 20,
  },
  loadingDots: {
      flexDirection: 'row',
      marginTop: 16,
      gap: 8,
  },
  dot: {
      color: '#10B981',
      fontSize: 24,
      opacity: 0.6,
  },
});
