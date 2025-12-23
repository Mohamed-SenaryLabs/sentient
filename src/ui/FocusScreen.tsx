/**
 * FocusScreen (Home) — PRD Compliant
 * 
 * Directive-First Hierarchy (PRD §C.6):
 * 1) Directive (hero) — type.hero, color.text.primary
 * 2) Focus cue (subhero) — type.subhero, color.accent.primary
 * 3) Avoid cue — section label uses color.accent.strain, body uses type.avoid
 * 4) Smart Cards (max 2) — use color.surface, radius.card
 * 5) Contextual Intel ("Why this directive?") — ContextCard component
 * 
 * Motion rules: expand/collapse only, no looping animations
 */

import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  LayoutAnimation, 
  Platform, 
  UIManager 
} from 'react-native';
import { OperatorDailyStats, SmartCard } from '../data/schema';
import { SmartCardsContainer } from './SmartCard';
import { ContextCard } from './components/ContextCard';
import { createHomeViewModel } from './viewmodels/HomeViewModel';
import { 
  colors, 
  typography, 
  spacing, 
  radius 
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
  
  // Transform data using ViewModel (Single Source of Truth)
  const viewData = createHomeViewModel(stats, status);

  // Animate on content changes (confirmation-only motion)
  useEffect(() => {
    if (stats) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [stats]);

  // Loading state
  if (viewData.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingTitle}>Sentient</Text>
        <Text style={styles.loadingText}>{viewData.loadingText}</Text>
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
        <Text style={styles.greeting}>{viewData.greeting}</Text>
        
        {/* Status indicator (meta) */}
        {viewData.lastUpdateTime ? (
          <Text style={styles.statusMeta}>
            Updated {viewData.lastUpdateTime}
          </Text>
        ) : (
          <Text style={styles.statusMeta}>Monitoring</Text>
        )}
        
        {/* 1) DIRECTIVE (hero) */}
        <Text style={styles.directiveHero}>{viewData.directiveLabel}</Text>
        
        {/* 2) FOCUS CUE (subhero) */}
        <Text style={[styles.focusSubhero, { color: viewData.stateAccent }]}>
          {viewData.focusCue}
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Low Vitality Warning (only when vitality < 30) */}
      {viewData.isLowVitality && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Vitality is low ({viewData.vitalityPercent}%). Recovery is recommended.
          </Text>
        </View>
      )}

      {/* 3) AVOID CUE */}
      <View style={styles.avoidSection}>
        <Text style={styles.avoidLabel}>{viewData.avoidLabel}</Text>
        <Text style={styles.avoidText}>{viewData.avoidCue}</Text>
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
      <ContextCard 
        summary={viewData.analystSummary}
        detail={viewData.analystDetail}
        stateLabel={viewData.stateLabel}
        vitalityText={viewData.vitalityText}
        vitalityColor={viewData.vitalityColor}
        confidenceLabel={viewData.confidenceLabel}
        recalTime={viewData.recalTime}
        recalReason={viewData.recalReason}
      />
    </ScrollView>
  );
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
});
