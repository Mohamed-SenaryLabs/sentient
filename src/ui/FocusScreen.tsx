/**
 * FocusScreen (Home) — PRD Compliant
 * 
 * Directive-First Hierarchy (PRD §C.6):
 * 1) Directive (hero) — type.hero, color.text.primary
 * 2) Focus cue (subhero) — type.subhero, color.accent.primary
 * 3) Avoid cue — section label uses color.accent.strain, body uses type.avoid
 * 4) Smart Cards (max 2) — use color.surface, radius.card
 * 5) Contextual Intel ("Why this directive?") — surface card with expandable insight
 * 
 * Motion rules: expand/collapse only, no looping animations
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  TouchableOpacity, 
  LayoutAnimation, 
  Platform, 
  UIManager 
} from 'react-native';
import { OperatorDailyStats, SmartCard } from '../data/schema';
import { getReadableState, getDirectiveLabel } from './DisplayTranslator';
import { SmartCardsContainer } from './SmartCard';
import { 
  colors, 
  typography, 
  spacing, 
  radius, 
  getVitalityColor,
  stateColors 
} from './theme/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FocusScreenProps {
  stats: OperatorDailyStats | null;
  status: string;
  onRefresh: () => void;
  refreshing: boolean;
  smartCards?: SmartCard[];
  onCardComplete?: (cardId: string, payload?: any) => void;
  onCardDismiss?: (cardId: string) => void;
}

export function FocusScreen({ 
  stats, 
  status, 
  onRefresh, 
  refreshing,
  smartCards,
  onCardComplete,
  onCardDismiss 
}: FocusScreenProps) {
  const [showContext, setShowContext] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState(false);

  // Animate on content changes (confirmation-only motion)
  useEffect(() => {
    if (stats) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [stats]);

  // Safe access to nested data
  const directive = stats?.logicContract?.directive;
  const sysStatus = stats?.stats?.systemStatus;
  
  // Use Translator for State Label
  const stateLabel = sysStatus 
    ? getReadableState(sysStatus.current_state)
    : "System Initializing...";

  // Loading state
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

  // 1. DIRECTIVE (Hero) — Category — Stimulus
  const directiveLabel = getDirectiveLabel(directive.category, directive.stimulus_type);
  
  // 2. FOCUS CUE (Subhero) — Session Focus or Title
  const focusCue = session_focus_llm || session_focus || stats.activeSession?.display.title || "Daily Focus";

  // 3. AVOID CUE — Constraint line
  const avoidCue = avoid_cue || getDefaultConstraint(systemStatus.current_state, directive.category);

  // 4. ANALYST INSIGHT — For Context panel
  const analystSummary = analyst_insight?.summary || stats.activeSession?.analyst_insight;
  const analystDetail = analyst_insight?.detail;
  
  // State-based accent color (functional color only)
  const currentState = systemStatus.current_state as keyof typeof stateColors;
  const stateAccent = stateColors[currentState] || colors.accent.primary;
  
  // Vitality-based color (for low vitality warning)
  const isLowVitality = stats.stats.vitality < 30;
  const vitalityColor = getVitalityColor(stats.stats.vitality);

  const toggleContext = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowContext(!showContext);
  };
  
  const toggleInsight = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedInsight(!expandedInsight);
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          tintColor={colors.text.primary} 
        />
      }
    >
      {/* ===== HERO SECTION ===== */}
      <View style={styles.heroSection}>
        {/* Greeting (meta) */}
        <Text style={styles.greeting}>{getGreeting()}</Text>
        
        {/* Status indicator (meta) */}
        {stats.logicContract?.last_recal_at ? (
          <Text style={styles.statusMeta}>
            Updated {new Date(stats.logicContract.last_recal_at).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit' 
            })}
          </Text>
        ) : (
          <Text style={styles.statusMeta}>Monitoring</Text>
        )}
        
        {/* 1) DIRECTIVE (hero) */}
        <Text style={styles.directiveHero}>{directiveLabel}</Text>
        
        {/* 2) FOCUS CUE (subhero) */}
        <Text style={[styles.focusSubhero, { color: stateAccent }]}>{focusCue}</Text>
      </View>

      <View style={styles.divider} />

      {/* Low Vitality Warning (only when vitality < 30) */}
      {isLowVitality && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Vitality is low ({stats.stats.vitality}%). Recovery is recommended.
          </Text>
        </View>
      )}

      {/* 3) AVOID CUE */}
      <View style={styles.avoidSection}>
        <Text style={styles.avoidLabel}>AVOID</Text>
        <Text style={styles.avoidText}>{avoidCue}</Text>
      </View>

      {/* 4) SMART CARDS (max 2) */}
      {smartCards && smartCards.length > 0 && onCardComplete && onCardDismiss && (
        <SmartCardsContainer
          cards={smartCards}
          onComplete={onCardComplete}
          onDismiss={onCardDismiss}
        />
      )}

      {/* 5) CONTEXTUAL INTEL ("Why this directive?") */}
      <TouchableOpacity 
        activeOpacity={0.7} 
        onPress={toggleContext} 
        style={styles.contextButton}
      >
        <Text style={styles.contextButtonText}>
          {showContext ? "Hide context" : "Why this directive?"}
        </Text>
      </TouchableOpacity>

      {showContext && (
        <View style={styles.contextCard}>
          <Text style={styles.contextLabel}>ANALYST INSIGHT</Text>
          
          {/* Summary (always visible when expanded) */}
          <Text 
            style={styles.contextSummary} 
            numberOfLines={expandedInsight ? undefined : 3}
            ellipsizeMode="tail"
          >
            "{analystSummary || "Updating Intelligence..."}"
          </Text>
          
          {/* Expand/collapse for detail */}
          {!!(analystSummary && analystSummary.length > 100) && (
            <TouchableOpacity onPress={toggleInsight} style={styles.moreContextButton}>
              <Text style={styles.moreContextText}>
                {expandedInsight ? "Show less" : "More context"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Detail (behind expansion) */}
          {expandedInsight && analystDetail && (
            <Text style={styles.contextDetail}>{analystDetail}</Text>
          )}
          
          {/* Meta information */}
          <View style={styles.metaContainer}>
            <Text style={styles.metaText}>
              STATE: {getReadableState(systemStatus.current_state)}
            </Text>
            <Text style={[styles.metaText, { color: vitalityColor }]}>
              VITALITY: {stats.stats.vitality > 0 ? `${stats.stats.vitality}%` : "Estimating..."}
            </Text>
            <Text style={styles.metaText}>
              CONFIDENCE: {stats.stats.vitalityConfidence || 'HIGH'}
            </Text>
            
            {/* Recal metadata */}
            {stats.logicContract?.last_recal_at && (
              <View style={styles.metaDivider}>
                <Text style={styles.metaText}>
                  LAST UPDATE: {new Date(stats.logicContract.last_recal_at).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })}
                </Text>
                {!!stats.logicContract?.last_recal_reason && (
                  <Text style={styles.metaText}>
                    REASON: {stats.logicContract.last_recal_reason}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDefaultConstraint(state: string, category: string): string {
  if (state === 'RECOVERY_MODE') return "High intensity efforts. Accumulated fatigue is high.";
  if (state === 'PHYSICAL_STRAIN') return "Impact loading. Neural system requires downtime.";
  if (state === 'HIGH_STRAIN') return "Glycolytic work. Reduce intensity and volatility.";
  
  if (category === 'STRENGTH') return "Glycolytic burnout. Keep reps low, quality high.";
  if (category === 'ENDURANCE') return "Anaerobic spikes. Stay within aerobic threshold.";
  if (category === 'REGULATION') return "Accumulated stress. Keep effort minimal.";
  
  return "Excessive volume beyond limits.";
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// ============================================
// STYLES (Using tokens)
// ============================================

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  contentContainer: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[7],
  },
  
  // Loading state
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    color: colors.accent.primary,
    fontSize: typography.hero.fontSize,
    fontWeight: typography.hero.fontWeight,
    letterSpacing: 2,
    marginBottom: spacing[5],
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: typography.meta.fontSize,
    letterSpacing: 2,
  },
  loadingDots: {
    flexDirection: 'row',
    marginTop: spacing[4],
    gap: spacing[2],
  },
  dot: {
    color: colors.accent.primary,
    fontSize: 24,
    opacity: 0.6,
  },
  
  // Hero section
  heroSection: {
    marginTop: spacing[4],
    marginBottom: spacing[6],
  },
  greeting: {
    color: colors.text.secondary,
    fontSize: typography.meta.fontSize,
    fontWeight: typography.meta.fontWeight,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing[4],
  },
  statusMeta: {
    fontSize: 10,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing[1],
  },
  directiveHero: {
    color: colors.text.primary,
    fontSize: typography.hero.fontSize,
    fontWeight: typography.hero.fontWeight,
    letterSpacing: typography.hero.letterSpacing,
    lineHeight: typography.hero.lineHeight,
    marginBottom: spacing[2],
  },
  focusSubhero: {
    fontSize: typography.subhero.fontSize,
    fontWeight: typography.subhero.fontWeight,
    lineHeight: typography.subhero.lineHeight,
    color: colors.accent.primary,
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginBottom: spacing[6],
  },
  
  // Warning banner (low vitality)
  warningBanner: {
    backgroundColor: `${colors.accent.strain}15`,
    padding: spacing[3],
    borderRadius: radius.subtle,
    marginBottom: spacing[5],
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.strain,
  },
  warningText: {
    color: colors.accent.strain,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  
  // Avoid section
  avoidSection: {
    marginBottom: spacing[5],
  },
  avoidLabel: {
    color: colors.accent.strain,
    fontSize: typography.sectionLabel.fontSize,
    fontWeight: typography.sectionLabel.fontWeight,
    letterSpacing: typography.sectionLabel.letterSpacing,
    textTransform: 'uppercase',
    marginBottom: spacing[3],
  },
  avoidText: {
    color: colors.accent.strain,
    fontSize: typography.avoid.fontSize,
    fontWeight: typography.avoid.fontWeight,
    lineHeight: typography.avoid.lineHeight,
  },
  
  // Context button
  contextButton: {
    paddingVertical: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    marginTop: spacing[5],
    alignItems: 'flex-start',
  },
  contextButtonText: {
    color: colors.text.secondary,
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  
  // Context card (Analyst Insight)
  contextCard: {
    backgroundColor: colors.surface,
    padding: spacing[5],
    borderRadius: radius.card,
    marginTop: spacing[2],
  },
  contextLabel: {
    color: colors.text.secondary,
    fontSize: typography.sectionLabel.fontSize,
    fontWeight: typography.sectionLabel.fontWeight,
    letterSpacing: typography.sectionLabel.letterSpacing,
    textTransform: 'uppercase',
    marginBottom: spacing[3],
  },
  contextSummary: {
    color: colors.text.secondary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    fontStyle: 'italic',
  },
  contextDetail: {
    color: colors.text.secondary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    marginTop: spacing[3],
  },
  moreContextButton: {
    marginTop: spacing[2],
  },
  moreContextText: {
    color: colors.accent.primary,
    fontSize: typography.meta.fontSize,
    fontWeight: '600',
  },
  
  // Meta container
  metaContainer: {
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    gap: spacing[2],
  },
  metaDivider: {
    width: '100%',
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    gap: spacing[1],
  },
  metaText: {
    color: colors.text.secondary,
    fontSize: typography.meta.fontSize,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
