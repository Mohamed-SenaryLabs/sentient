/**
 * Smart Cards UI Component (PRD §3.3.1)
 * 
 * Renders interactive cards on Home screen.
 * Max 2 cards visible, calm design, one action per card.
 * Uses design tokens for consistent styling.
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';
import { 
  SmartCard as SmartCardType,
  SleepConfirmPayload,
  WorkoutLogPayload,
  WorkoutSuggestionPayload,
  GoalsIntakePayload
} from '../data/schema';
import { 
  colors, 
  typography, 
  spacing, 
  radius 
} from './theme/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SmartCardProps {
  card: SmartCardType;
  onComplete: (cardId: string, payload?: any) => void;
  onDismiss: (cardId: string) => void;
}

export function SmartCardComponent({ card, onComplete, onDismiss }: SmartCardProps) {
  switch (card.type) {
    case 'SLEEP_CONFIRM':
      return <SleepConfirmCard card={card} onComplete={onComplete} onDismiss={onDismiss} />;
    case 'WORKOUT_LOG':
      return <WorkoutLogCard card={card} onComplete={onComplete} onDismiss={onDismiss} />;
    case 'WORKOUT_SUGGESTION':
      return <WorkoutSuggestionCard card={card} onComplete={onComplete} onDismiss={onDismiss} />;
    case 'GOALS_INTAKE':
      return <GoalsIntakeCard card={card} onComplete={onComplete} onDismiss={onDismiss} />;
    default:
      return null;
  }
}

// ============================================
// SLEEP CONFIRM CARD
// ============================================

function SleepConfirmCard({ card, onComplete, onDismiss }: SmartCardProps) {
  const payload = card.payload as SleepConfirmPayload;
  const estimatedHours = (payload.estimatedSleepSeconds / 3600).toFixed(1);
  const [customHours, setCustomHours] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  const handleConfirm = () => {
    onComplete(card.id, {
      ...payload,
      confirmedValue: payload.estimatedSleepSeconds
    });
  };
  
  const handleSetCustom = () => {
    if (showCustomInput && customHours) {
      const hours = parseFloat(customHours);
      if (!isNaN(hours) && hours > 0 && hours < 24) {
        onComplete(card.id, {
          ...payload,
          confirmedValue: hours * 3600
        });
      }
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowCustomInput(true);
    }
  };
  
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Confirm sleep estimate</Text>
      <Text style={styles.cardBody}>
        No recent sleep data. Is ~{estimatedHours}h close to your sleep last night?
      </Text>
      
      {showCustomInput && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., 7.5"
            placeholderTextColor={colors.text.secondary}
            keyboardType="decimal-pad"
            value={customHours}
            onChangeText={setCustomHours}
            autoFocus
          />
          <Text style={styles.inputLabel}>hours</Text>
        </View>
      )}
      
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleConfirm}>
          <Text style={styles.primaryButtonText}>Confirm</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleSetCustom}>
          <Text style={styles.secondaryButtonText}>
            {showCustomInput ? 'Save' : 'Set my average'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismissButton} onPress={() => onDismiss(card.id)}>
          <Text style={styles.dismissButtonText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================
// WORKOUT LOG CARD
// ============================================

function WorkoutLogCard({ card, onComplete, onDismiss }: SmartCardProps) {
  const payload = card.payload as WorkoutLogPayload;
  const [note, setNote] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  
  const handleSave = () => {
    if (note.trim()) {
      onComplete(card.id, {
        ...payload,
        logEntry: note.trim()
      });
    }
  };
  
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Log today's session</Text>
      <Text style={styles.cardBody}>
        {payload.workoutType ? `${payload.workoutType} detected. ` : ''}
        Want to add a quick note?
      </Text>
      
      <TextInput
        style={styles.noteInput}
        placeholder="e.g., Norwegian 4x4 @ 14 km/h"
        placeholderTextColor={colors.text.secondary}
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={2}
      />
      
      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={[styles.primaryButton, !note.trim() && styles.disabledButton]} 
          onPress={handleSave}
          disabled={!note.trim()}
        >
          <Text style={styles.primaryButtonText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowDetails(!showDetails)}>
          <Text style={styles.secondaryButtonText}>Add details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismissButton} onPress={() => onDismiss(card.id)}>
          <Text style={styles.dismissButtonText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================
// WORKOUT SUGGESTION CARD
// ============================================

function WorkoutSuggestionCard({ card, onComplete, onDismiss }: SmartCardProps) {
  const payload = card.payload as WorkoutSuggestionPayload;
  const { suggestion } = payload;
  
  const handleAddToToday = () => {
    onComplete(card.id, {
      ...payload,
      accepted: true
    });
  };
  
  const handleSaveForLater = () => {
    onComplete(card.id, {
      ...payload,
      savedForLater: true
    });
  };
  
  return (
    <View style={styles.card}>
      <View style={styles.suggestionHeader}>
        <Text style={styles.cardTitle}>{suggestion.title}</Text>
        {suggestion.duration && (
          <Text style={styles.durationBadge}>{suggestion.duration} min</Text>
        )}
      </View>
      <Text style={styles.cardBody}>{suggestion.summary}</Text>
      {suggestion.why && (
        <Text style={styles.whyText}>{suggestion.why}</Text>
      )}
      
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleAddToToday}>
          <Text style={styles.primaryButtonText}>Add to today</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleSaveForLater}>
          <Text style={styles.secondaryButtonText}>Save for later</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismissButton} onPress={() => onDismiss(card.id)}>
          <Text style={styles.dismissButtonText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================
// GOALS INTAKE CARD
// ============================================

function GoalsIntakeCard({ card, onComplete, onDismiss }: SmartCardProps) {
  const payload = card.payload as GoalsIntakePayload;
  const [goal, setGoal] = useState(payload.currentGoals?.primary || '');
  
  const handleSave = () => {
    if (goal.trim()) {
      onComplete(card.id, {
        ...payload,
        currentGoals: {
          primary: goal.trim(),
          tags: inferGoalTags(goal.trim()),
          updatedAt: new Date().toISOString()
        }
      });
    }
  };
  
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>What are you optimizing for?</Text>
      <Text style={styles.cardBody}>
        {payload.currentGoals 
          ? 'Update your training focus.' 
          : 'Set your primary goal to personalize guidance.'}
      </Text>
      
      <TextInput
        style={styles.noteInput}
        placeholder="e.g., Build endurance for a marathon, Gain strength..."
        placeholderTextColor={colors.text.secondary}
        value={goal}
        onChangeText={setGoal}
        multiline
        numberOfLines={2}
      />
      
      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={[styles.primaryButton, !goal.trim() && styles.disabledButton]} 
          onPress={handleSave}
          disabled={!goal.trim()}
        >
          <Text style={styles.primaryButtonText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismissButton} onPress={() => onDismiss(card.id)}>
          <Text style={styles.dismissButtonText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Helper: infer goal tags from text
function inferGoalTags(text: string): string[] {
  const tags: string[] = [];
  const lower = text.toLowerCase();
  
  if (lower.includes('strength') || lower.includes('strong') || lower.includes('lift')) {
    tags.push('STRENGTH');
  }
  if (lower.includes('endurance') || lower.includes('cardio') || lower.includes('run') || lower.includes('marathon')) {
    tags.push('ENDURANCE');
  }
  if (lower.includes('weight') || lower.includes('lean') || lower.includes('fat')) {
    tags.push('BODY_COMP');
  }
  if (lower.includes('health') || lower.includes('longevity') || lower.includes('recovery')) {
    tags.push('HEALTH');
  }
  if (lower.includes('performance') || lower.includes('compete') || lower.includes('race')) {
    tags.push('PERFORMANCE');
  }
  
  return tags.length > 0 ? tags : ['GENERAL'];
}

// ============================================
// CONTAINER FOR MULTIPLE CARDS
// ============================================

interface SmartCardsContainerProps {
  cards: SmartCardType[];
  onComplete: (cardId: string, payload?: any) => void;
  onDismiss: (cardId: string) => void;
}

export function SmartCardsContainer({ cards, onComplete, onDismiss }: SmartCardsContainerProps) {
  if (!cards || cards.length === 0) {
    return null;
  }
  
  // Max 2 cards
  const visibleCards = cards.slice(0, 2);
  
  return (
    <View style={styles.container}>
      {visibleCards.map((card, index) => (
        <SmartCardComponent
          key={card.id}
          card={card}
          onComplete={onComplete}
          onDismiss={onDismiss}
        />
      ))}
    </View>
  );
}

// ============================================
// STYLES (Using tokens)
// ============================================

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[5],
    gap: spacing[4],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing[4],
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.primary,
  },
  cardTitle: {
    color: colors.text.primary,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  cardBody: {
    color: colors.text.secondary,
    fontSize: typography.body.fontSize - 2,
    lineHeight: 20,
    marginBottom: spacing[3],
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  durationBadge: {
    color: colors.accent.primary,
    fontSize: typography.meta.fontSize,
    fontWeight: '600',
    backgroundColor: `${colors.accent.primary}15`,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.subtle,
  },
  whyText: {
    color: colors.text.secondary,
    fontSize: typography.meta.fontSize,
    fontStyle: 'italic',
    marginBottom: spacing[3],
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  primaryButton: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.input,
  },
  primaryButtonText: {
    color: colors.text.primary,
    fontSize: typography.body.fontSize - 2,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: `${colors.accent.primary}15`,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.input,
  },
  secondaryButtonText: {
    color: colors.accent.primary,
    fontSize: typography.body.fontSize - 2,
    fontWeight: '500',
  },
  dismissButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  dismissButtonText: {
    color: colors.text.secondary,
    fontSize: typography.body.fontSize - 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.input,
    padding: spacing[3],
    color: colors.text.primary,
    fontSize: typography.body.fontSize,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  inputLabel: {
    color: colors.text.secondary,
    fontSize: typography.body.fontSize - 2,
  },
  noteInput: {
    backgroundColor: colors.bg,
    borderRadius: radius.input,
    padding: spacing[3],
    color: colors.text.primary,
    fontSize: typography.body.fontSize - 2,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing[3],
    minHeight: 60,
    textAlignVertical: 'top',
  },
});
