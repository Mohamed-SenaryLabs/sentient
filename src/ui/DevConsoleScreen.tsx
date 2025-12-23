import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { colors, spacing, radius } from './theme/tokens';

interface DevConsoleScreenProps {
  logs: string[];
  onBack: () => void;
  onRecreateDb: () => void;
  visible: boolean;
}

export function DevConsoleScreen({ logs, onBack, onRecreateDb, visible }: DevConsoleScreenProps) {
  if (!visible) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SYSTEM CONSOLE</Text>
        <View style={styles.headerControls}>
            <TouchableOpacity onPress={onRecreateDb} style={styles.dangerButton}>
            <Text style={styles.dangerText}>RESET DB</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onBack} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.logContainer}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    marginBottom: spacing[2],
  },
  title: {
    color: colors.text.primary,
    fontFamily: 'Courier',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  dangerButton: {
    padding: spacing[2],
    backgroundColor: colors.accent.strain,
    borderRadius: radius.input,
  },
  dangerText: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radius.input,
  },
  closeText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  logContainer: {
    flex: 1,
  },
  logText: {
    fontFamily: 'Courier',
    color: colors.accent.primary,
    fontSize: 11,
    marginBottom: spacing[1],
  },
  headerControls: {
    flexDirection: 'row',
    gap: spacing[2],
  },
});
