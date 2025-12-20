import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';

interface DevConsoleScreenProps {
  logs: string[];
  onBack: () => void;
  visible: boolean;
}

export function DevConsoleScreen({ logs, onBack, visible }: DevConsoleScreenProps) {
  if (!visible) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SYSTEM CONSOLE</Text>
        <TouchableOpacity onPress={onBack} style={styles.closeButton}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
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
    backgroundColor: '#0F172A', // Slate-900
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    marginBottom: 8,
  },
  title: {
    color: '#E2E8F0',
    fontFamily: 'Courier',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 6,
  },
  closeText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  logContainer: {
    flex: 1,
  },
  logText: {
    fontFamily: 'Courier',
    color: '#10B981', // Emerald-500
    fontSize: 11,
    marginBottom: 4,
  },
});
