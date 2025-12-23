import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '../theme/tokens';

interface RecalModalProps {
  visible: boolean;
  onClose: () => void;
  recalTime: string | null;
  recalReason: string | null;
  directiveSnapshot: any | null;
  constraintsSnapshot: any | null;
  currentDirective: any | null;
  currentConstraints: any | null;
}

export function RecalModal({
  visible,
  onClose,
  recalTime,
  recalReason,
  directiveSnapshot,
  constraintsSnapshot,
  currentDirective,
  currentConstraints,
}: RecalModalProps) {
  // Determine what changed
  const directiveChanged = directiveSnapshot && currentDirective && (
    directiveSnapshot.category !== currentDirective.category ||
    directiveSnapshot.stimulus_type !== currentDirective.stimulus_type
  );

  const constraintsChanged = constraintsSnapshot && currentConstraints && (
    JSON.stringify(constraintsSnapshot) !== JSON.stringify(currentConstraints)
  );

  const getConstraintChanges = () => {
    if (!constraintsSnapshot || !currentConstraints) return [];
    const changes: string[] = [];
    
    if (constraintsSnapshot.allow_impact !== currentConstraints.allow_impact) {
      changes.push(`Impact allowed: ${constraintsSnapshot.allow_impact} → ${currentConstraints.allow_impact}`);
    }
    
    const oldHrCap = constraintsSnapshot.heart_rate_cap ?? null;
    const newHrCap = currentConstraints.heart_rate_cap ?? null;
    if (oldHrCap !== newHrCap) {
      changes.push(`Heart rate cap: ${oldHrCap || 'None'} → ${newHrCap || 'None'}`);
    }
    
    const oldEq = (constraintsSnapshot.required_equipment || []).sort().join(', ');
    const newEq = (currentConstraints.required_equipment || []).sort().join(', ');
    if (oldEq !== newEq) {
      changes.push(`Equipment: [${oldEq || 'None'}] → [${newEq || 'None'}]`);
    }
    
    return changes;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Course Correction</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {recalTime && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>When</Text>
                <Text style={styles.sectionValue}>{recalTime}</Text>
              </View>
            )}

            {recalReason && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Why</Text>
                <Text style={styles.sectionValue}>{recalReason}</Text>
              </View>
            )}

            {(directiveChanged || constraintsChanged) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>What Changed</Text>
                
                {directiveChanged && directiveSnapshot && currentDirective && (
                  <View style={styles.changeItem}>
                    <Text style={styles.changeLabel}>Directive:</Text>
                    <Text style={styles.changeValue}>
                      {directiveSnapshot.category}/{directiveSnapshot.stimulus_type} → {currentDirective.category}/{currentDirective.stimulus_type}
                    </Text>
                  </View>
                )}

                {constraintsChanged && getConstraintChanges().length > 0 && (
                  <View style={styles.changeItem}>
                    <Text style={styles.changeLabel}>Constraints:</Text>
                    {getConstraintChanges().map((change, i) => (
                      <Text key={i} style={styles.changeValue}>{change}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  title: {
    ...typography.screenTitle,
    fontSize: 20,
  },
  closeButton: {
    padding: spacing[1],
  },
  content: {
    padding: spacing[4],
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    ...typography.sectionLabel,
    marginBottom: spacing[2],
  },
  sectionValue: {
    ...typography.body,
    color: colors.text.primary,
  },
  changeItem: {
    marginTop: spacing[2],
  },
  changeLabel: {
    ...typography.meta,
    color: colors.text.secondary,
    marginBottom: spacing[1],
    fontWeight: '600',
  },
  changeValue: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
});

