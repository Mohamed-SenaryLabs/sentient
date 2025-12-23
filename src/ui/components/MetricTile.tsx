import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, radius, spacing } from '../theme/tokens';

interface MetricTileProps {
  label: string;
  value: string | number;
  gradientColors: readonly [string, string, ...string[]];
  textColor?: string;
  history?: number[];
}

// ============================================
// MICRO GRAPH
// ============================================
function MiniBarStrip({ data, color }: { data: number[], color: string }) {
  const max = Math.max(...data, 1);
  return (
    <View style={styles.barStrip}>
      {data.map((val, i) => (
        <View 
          key={i} 
          style={[
            styles.bar, 
            { 
              height: `${(val / max) * 100}%`,
              backgroundColor: i === data.length - 1 ? color : `${color}50` 
            }
          ]} 
        />
      ))}
    </View>
  );
}

export function MetricTile({ 
  label, 
  value, 
  gradientColors,
  textColor,
  history 
}: MetricTileProps) {
  return (
    <View style={styles.container}>
      {/* Background Gradient (Subtle glow) */}
      <View style={styles.cardContent}>
        <Text style={styles.label}>{label}</Text>
        
        <View style={styles.valueContainer}>
           <Text 
             style={[styles.value, textColor ? { color: textColor } : null]}
             numberOfLines={1}
             adjustsFontSizeToFit
             minimumFontScale={0.5}
           >
            {value}
          </Text>
        </View>

        {history && history.length > 0 && (
          <MiniBarStrip data={history} color={gradientColors[0]} />
        )}
      </View>

      {/* Bottom Border (Solid fallback) */}
      <View
        style={[styles.bottomGradient, { backgroundColor: gradientColors[0] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    height: 80, // Compact height
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[1], // Reduced padding
  },
  label: {
    ...typography.metricLabel,
    marginBottom: 0, 
    fontSize: 9, 
  },
  valueContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 4,
  },
  value: {
    ...typography.metricValue,
    fontSize: 22, 
    textAlign: 'center',
  },
  // Bar Strip
  barStrip: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 16,
    marginTop: 4,
    opacity: 0.8,
  },
  bar: {
    width: 4,
    borderRadius: 1,
    minHeight: 2,
  },
  bottomGradient: {
    height: 2, // Hairline
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.8,
  },
});
