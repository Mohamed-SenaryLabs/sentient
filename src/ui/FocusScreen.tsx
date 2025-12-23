/**
 * FocusScreen (Home) — PRD Compliant v3.0
 * 
 * Implements the "Sentient V3" dark instrument design.
 * Hierarchy: Header -> Metrics -> Directive Card -> Analyst Insight
 */

import { OperatorDailyStats, SmartCard, DailyStats } from '../data/schema';
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  LayoutAnimation, 
  Platform, 
  UIManager,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SmartCardsContainer } from './SmartCard';
// New Components
import { MetricTile } from './components/MetricTile';
import { DirectiveCard } from './components/DirectiveCard';
import { AnalystInsightCard } from './components/AnalystInsightCard';

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
  historicalData?: DailyStats[];
}

export function FocusScreen({ 
  stats, 
  status, 
  onRefresh, 
  refreshing,
  smartCards,
  onCardComplete,
  onCardDismiss,
  historicalData 
}: FocusScreenProps) {
  
  const viewData = createHomeViewModel(stats, status);
  const [isInsightExpanded, setIsInsightExpanded] = useState(false);

  // Animate on content changes
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
      </View>
    );
  }

  const last7Days = historicalData?.slice(0, 7).reverse() || [];
  const vitalityHistory = last7Days.map(d => d.stats.vitality);
  const capacityHistory = last7Days.map(d => d.stats.adaptiveCapacity?.current || 0);
  // Fallback to physiologicalLoad if loadDensity is 0 or missing in history (schema might vary, assuming stats structure)
  const loadHistory = last7Days.map(d => d.stats.loadDensity || d.stats.physiologicalLoad || 0);

  return (
    <View style={styles.screenWrapper}>
      {/* ... ScrollView ... */}
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
        {/* ... Header ... */}
        <View style={styles.headerSection}>
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

        {/* Bottom Padding for Nav */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6], // 32px top
    paddingBottom: 120, // ample space for bottom nav
  },
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
    ...typography.meta,
    fontSize: 10,
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
    borderRadius: radius.max, // Higher radius (pill/badge)
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

