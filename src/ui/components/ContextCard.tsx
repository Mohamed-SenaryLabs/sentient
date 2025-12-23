import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ContextCardProps {
  summary: string | null;
  detail: string | null;
  stateLabel: string;
  vitalityText: string;
  vitalityColor: string;
  confidenceLabel: string;
  recalTime: string | null;
  recalReason: string | null;
}

export function ContextCard({
  summary,
  detail,
  stateLabel,
  vitalityText,
  vitalityColor,
  confidenceLabel,
  recalTime,
  recalReason
}: ContextCardProps) {
  const [showContext, setShowContext] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState(false);

  const toggleContext = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowContext(!showContext);
  };
  
  const toggleInsight = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedInsight(!expandedInsight);
  };

  return (
    <>
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
            "{summary || "Updating Intelligence..."}"
          </Text>
          
          {/* Expand/collapse for detail */}
          {!!(summary && summary.length > 100) && (
            <TouchableOpacity onPress={toggleInsight} style={styles.moreContextButton}>
              <Text style={styles.moreContextText}>
                {expandedInsight ? "Show less" : "More context"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Detail (behind expansion) */}
          {expandedInsight && detail && (
            <Text style={styles.contextDetail}>{detail}</Text>
          )}
          
          {/* Meta information */}
          <View style={styles.metaContainer}>
            <Text style={styles.metaText}>
              STATE: {stateLabel}
            </Text>
            <Text style={[styles.metaText, { color: vitalityColor }]}>
              VITALITY: {vitalityText}
            </Text>
            <Text style={styles.metaText}>
              CONFIDENCE: {confidenceLabel}
            </Text>
            
            {/* Recal metadata */}
            {recalTime && (
              <View style={styles.metaDivider}>
                <Text style={styles.metaText}>
                  LAST UPDATE: {recalTime}
                </Text>
                {!!recalReason && (
                  <Text style={styles.metaText}>
                    REASON: {recalReason}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
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
