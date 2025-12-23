/**
 * FocusScreen (Home) — PRD Compliant v3.0
 * 
 * Implements the "Sentient V3" dark instrument design.
 * Hierarchy: Header -> Metrics -> Directive Card -> Analyst Insight
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  RefreshControl, 
  TouchableOpacity,
  Platform,
  UIManager,
  LayoutAnimation
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from './components/Screen';
import { MetricTile } from './components/MetricTile';
import { DirectiveCard } from './components/DirectiveCard';
import { AnalystInsightCard } from './components/AnalystInsightCard';
import { SmartCardsContainer } from './SmartCard';

import { SmartCard } from '../data/schema';
import { HomeViewData } from './viewmodels/HomeViewModel';
import { colors, spacing, radius, typography } from './theme/tokens';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FocusScreenProps {
  viewData: HomeViewData;
  smartCards: SmartCard[];
  onCardComplete?: (cardId: string, result: any) => Promise<void>;
  onCardDismiss?: (cardId: string) => Promise<void>;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

export const FocusScreen: React.FC<FocusScreenProps> = ({
  viewData,
  smartCards = [],
  onCardComplete,
  onCardDismiss,
  refreshing,
  onRefresh,
}) => {
  const [isInsightExpanded, setIsInsightExpanded] = useState(false);

  // Layout Animation on mount or state change
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [isInsightExpanded]);

  // Derived history data (placeholders for now as they are not in HomeViewData yet)
  const vitalityHistory: number[] = [];
  const capacityHistory: number[] = [];
  const loadHistory: number[] = [];
  return (
    <Screen 
      preset="scroll" 
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          tintColor={colors.text.primary} 
        />
      }
    >
      {/* ... Header ... */}
      <View style={styles.headerSection}>
        {/* ... content remains same ... */}

          <View>
             <Text style={styles.greeting}>{viewData.greeting}</Text>
             <View style={styles.statusRow}>
               <View style={styles.statusDot} />
               <Text style={styles.statusText}>Monitoring</Text>
               <View style={styles.statusDivider} />
               <Text style={styles.statusText}>
                 Updated {viewData.lastUpdateTime || 'Just now'}
               </Text>
               <View style={styles.statusDivider} />
               <Text style={[styles.statusText, { color: colors.accent.vitality }]}>
                 Conf: {viewData.confidenceLabel}
               </Text>
             </View>
             
             {/* State Chip */}
             <TouchableOpacity 
               onPress={() => setIsInsightExpanded(!isInsightExpanded)}
               activeOpacity={0.7}
               style={styles.stateChip}
             >
               <Text style={styles.stateChipText}>
                 State · {viewData.stateValue}
               </Text>
             </TouchableOpacity>
          </View>
          
          {/* Avatar Placeholder */}
          <View style={styles.avatar}>
             <Ionicons name="person" size={20} color={colors.text.secondary} />
          </View>
        </View>

        {/* ===== METRICS ROW ===== */}
        <View style={styles.metricsRow}>
          <MetricTile 
            label="VITALITY"
            value={viewData.vitalityText}
            textColor={colors.accent.vitality}
            gradientColors={colors.gradients.vitality}
            history={vitalityHistory}
          />
          <MetricTile 
            label={viewData.capacityLabel}
            value={viewData.capacityValue}
            textColor={colors.accent.vitality}
            gradientColors={colors.gradients.vitality}
            history={capacityHistory}
          />
          <MetricTile 
            label={viewData.loadLabel}
            value={viewData.loadDisplayValue}
            textColor={colors.accent.vitality}
            gradientColors={colors.gradients.vitality}
            history={loadHistory}
          />
        </View>

        {/* ===== DAILY DIRECTIVE CARD ===== */}
        <DirectiveCard 
          title={viewData.directiveLabel.split('—')[0]?.trim() || viewData.directiveLabel}
          subtitle={viewData.focusCue}
          description={viewData.analystSummary || "Maintain steady effort."} // Fallback if no specific desc
          avoidText={viewData.avoidCue || "Avoid high intensity spikes."}
          isHighRisk={viewData.isHighRisk}
        />

        {/* ===== ANALYST INSIGHT ===== */}
        {(viewData.analystSummary || viewData.analystDetail) && (
           <AnalystInsightCard 
             summary={viewData.analystSummary || "No insight available."}
             detail={viewData.analystDetail}
             isExpanded={isInsightExpanded}
             onToggle={() => setIsInsightExpanded(!isInsightExpanded)}
           />
        )}

        {/* ===== SMART CARDS (Functionality preserved) ===== */}
        {smartCards && smartCards.length > 0 && onCardComplete && onCardDismiss && (
          <View style={styles.smartCardsWrapper}>
            <Text style={styles.sectionHeader}>PENDING ACTIONS</Text>
            <SmartCardsContainer
              cards={smartCards}
              onComplete={onCardComplete}
              onDismiss={onCardDismiss}
            />
          </View>
        )}

      {/* Bottom Padding for Nav - handled by Screen padding now but kept small for extra air if needed */}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    ...typography.hero,
    marginBottom: spacing[4],
  },
  loadingText: {
    ...typography.meta,
  },
  
  // Header
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[6],
  },
  greeting: {
    ...typography.header,
    marginBottom: spacing[2],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent.vitality,
    marginRight: spacing[2],
  },
  statusText: {
    ...typography.small,
  },
  statusDivider: {
    width: 1,
    height: 10,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing[3],
  },
  stateChip: {
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing[3],
    paddingVertical: 4, // Tighter padding
    borderRadius: radius.pill, // Higher radius (pill/badge)
    borderWidth: 1, // Hairline only
    borderColor: 'rgba(255,255,255,0.05)', // Very subtle hairline
    marginTop: spacing[3],
    alignSelf: 'flex-start',
  },
  stateChipText: {
    ...typography.meta,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[6],
    height: 100, // Explicit height for row
  },

  // Smart Cards
  smartCardsWrapper: {
    marginTop: spacing[4],
  },
  sectionHeader: {
    ...typography.sectionLabel,
    marginBottom: spacing[3],
  },
});

