import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '../theme/tokens';


interface DirectiveCardProps {
  title: string;
  subtitle: string;
  description: string;
  avoidText: string;
  isHighRisk?: boolean;
}

export function DirectiveCard({ title, subtitle, description, avoidText, isHighRisk = false }: DirectiveCardProps) {
  const avoidColor = isHighRisk ? colors.accent.strain : colors.text.secondary;
  return (
    <View style={styles.container}>
      {/* Header Label */}
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>DAILY DIRECTIVE</Text>
        <Ionicons name="sparkles" size={16} color={colors.text.secondary} />
      </View>

      {/* Main Title Area */}
      <View style={styles.titleSection}>
        <Text style={styles.heroTitle}>{title} <Text style={{ color: colors.text.tertiary }}>—</Text></Text>
        <Text style={styles.subTitle}>{subtitle}</Text>
      </View>

      {/* Description - REMOVED to avoid competition with Analyst Insight */}
      
      {/* Spacer */}
      <View style={{ height: spacing[2] }} />

      {/* Avoid Section */}
      <View style={styles.avoidSection}>
        <View style={styles.avoidHeader}>
           <Ionicons name="ban-outline" size={16} color={avoidColor} style={{ marginRight: spacing[2] }} />
           <Text style={[styles.avoidLabel, { color: avoidColor }]}>AVOID</Text>
        </View>
        <Text style={styles.avoidText} numberOfLines={2}>{avoidText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing[5],
    marginBottom: spacing[6],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  headerLabel: {
    ...typography.sectionLabel,
    color: colors.accent.vitality, // Cyan match
  },
  titleSection: {
    marginBottom: spacing[3],
  },
  heroTitle: {
    ...typography.hero,
    color: colors.text.primary,
    fontSize: 28, // Slightly smaller than token default to fit
    marginBottom: spacing[1],
  },
  subTitle: {
    ...typography.subhero,
    color: colors.accent.primary,
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
  },
  avoidSection: {
    backgroundColor: 'rgba(0,0,0,0.2)', // Darker background for constraint
    borderRadius: radius.subtle,
    padding: 0, // No padding helper, standard view
    marginTop: spacing[2],
  },
  avoidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  avoidLabel: {
    ...typography.sectionLabel,
    color: colors.accent.strain,
    marginBottom: 0, // Reset margin since we are in a row
  },
  avoidText: {
    ...typography.avoid,
    color: colors.text.primary, // Or keep strain color if desired, but usually text is primary/secondary
    fontSize: 15,
  },
});
