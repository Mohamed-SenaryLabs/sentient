import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '../theme/tokens';

interface AnalystInsightCardProps {
  summary: string;
  detail: string | null;
  isExpanded?: boolean;
  onToggle?: () => void;
}



export function AnalystInsightCard({ summary, detail, isExpanded = false, onToggle }: AnalystInsightCardProps) {
  // We rely on parent to handle state now, but if onToggle isn't provided we could fallback (not needed per spec)
  
  const handleToggle = () => {
     if (onToggle) {
       LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
       onToggle();
     }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Analyst Insight</Text>
        {detail && (
          <TouchableOpacity onPress={handleToggle}>
            <Text style={styles.moreContextText}>
              {isExpanded ? 'Less Context' : 'More Context >'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.contentRow}>
          {/* Icon */}
          <Ionicons name="headset" size={24} color={colors.accent.vitality} style={{ marginRight: spacing[4] }} />
          
          {/* Text */}
          <View style={styles.textContainer}>
            <Text 
              style={styles.insightText} 
              numberOfLines={isExpanded ? undefined : 3}
            >
              {summary}
            </Text>
            {isExpanded && detail && (
              <Text style={[styles.insightText, { marginTop: spacing[3] }]}>
                {detail}
              </Text>
            )}
          </View>
        </View>
        
        {/* Placeholder for Graph/Chart if needed later, for now just padding */}
        <View style={{ height: 20 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[6],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
    paddingHorizontal: spacing[1],
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  moreContextText: {
    color: colors.accent.vitality,
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing[4],
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  textContainer: {
    flex: 1,
  },
  insightText: {
    color: colors.text.secondary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
});
