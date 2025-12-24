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
  UIManager,
  ScrollView,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function getWorkoutIconName(workoutType?: string): IconName {
  const t = (workoutType || '').toLowerCase();
  if (!t) return 'pulse-outline';
  if (t.includes('run')) return 'walk-outline'; // closest “shoe” analog in Ionicons
  if (t.includes('walk') || t.includes('hike')) return 'footsteps-outline';
  if (t.includes('cycle') || t.includes('bike')) return 'bicycle-outline';
  if (t.includes('swim')) return 'water-outline';
  if (t.includes('row')) return 'boat-outline';
  if (t.includes('strength') || t.includes('traditional')) return 'barbell-outline';
  if (t.includes('functional') || t.includes('hiit') || t.includes('cross')) return 'fitness-outline';
  return 'pulse-outline';
}

function getSmartSignalIconName(card: SmartCardType): IconName {
  switch (card.type) {
    case 'SLEEP_CONFIRM':
      return 'moon-outline';
    case 'WORKOUT_LOG': {
      const payload = card.payload as WorkoutLogPayload;
      return getWorkoutIconName(payload.workoutType);
    }
    case 'WORKOUT_SUGGESTION':
      return 'compass-outline';
    case 'GOALS_INTAKE':
      return 'flag-outline';
    default:
      return 'sparkles-outline';
  }
}

function CardHeader({
  icon,
  title,
  right,
}: {
  icon: IconName;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerLeft}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={18} color={colors.text.secondary} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {!!right && <View style={styles.headerRight}>{right}</View>}
    </View>
  );
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
      <CardHeader icon={getSmartSignalIconName(card)} title="Confirm sleep estimate" />
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
      <CardHeader icon={getSmartSignalIconName(card)} title="Log today's session" />
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
          blurOnSubmit={false}
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
      operatorAction: 'ADDED'
    });
  };
  
  const handleSaveForLater = () => {
    onComplete(card.id, {
      ...payload,
      operatorAction: 'SAVED'
    });
  };
  
  const handleDismiss = () => {
    // Persist DISMISSED action before dismissing
    onComplete(card.id, {
      ...payload,
      operatorAction: 'DISMISSED'
    });
    onDismiss(card.id);
  };
  
  return (
    <View style={styles.card}>
      <View style={styles.suggestionHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <Ionicons name={getSmartSignalIconName(card)} size={18} color={colors.text.secondary} />
          </View>
          <Text style={styles.cardTitle}>{suggestion.title}</Text>
        </View>
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
  const existingGoals = payload.currentGoals;
  
  const [primaryGoal, setPrimaryGoal] = useState(existingGoals?.primary || '');
  const [isCustomGoal, setIsCustomGoal] = useState(!existingGoals?.primary || !GOAL_PRESETS.includes(existingGoals.primary));
  const [timeHorizon, setTimeHorizon] = useState(existingGoals?.time_horizon || '');
  const [constraints, setConstraints] = useState(existingGoals?.constraints || '');
  
  const handleGoalSelect = (goal: string) => {
    if (goal === 'custom') {
      setIsCustomGoal(true);
      setPrimaryGoal('');
    } else {
      setIsCustomGoal(false);
      setPrimaryGoal(goal);
    }
  };
  
  const handleSave = () => {
    if (primaryGoal.trim()) {
      onComplete(card.id, {
        ...payload,
        currentGoals: {
          primary: primaryGoal.trim(),
          secondary: undefined, // Not in quick intake
          time_horizon: timeHorizon.trim() || undefined,
          constraints: constraints.trim() || undefined,
          updated_at: new Date().toISOString()
        }
      });
    }
  };
  
  return (
    <View style={styles.card}>
      <CardHeader icon={getSmartSignalIconName(card)} title="What are you optimizing for?" />
      <Text style={styles.cardBody}>
        {existingGoals 
          ? 'Update your training focus.' 
          : 'Set your primary goal to personalize guidance.'}
      </Text>
      
      {/* Primary Goal - Pick List or Custom */}
      <View style={styles.goalsSection}>
        {!isCustomGoal ? (
          <View style={styles.goalPickList}>
            {GOAL_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.goalOption,
                  primaryGoal === preset && styles.goalOptionSelected
                ]}
                onPress={() => handleGoalSelect(preset)}
              >
                <Text style={[
                  styles.goalOptionText,
                  primaryGoal === preset && styles.goalOptionTextSelected
                ]}>
                  {preset}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.goalOption}
              onPress={() => handleGoalSelect('custom')}
            >
              <Text style={styles.goalOptionText}>Custom</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TextInput
            style={styles.noteInput}
            placeholder="Describe your primary goal in one sentence..."
            placeholderTextColor={colors.text.secondary}
            value={primaryGoal}
            onChangeText={setPrimaryGoal}
            multiline
            numberOfLines={2}
            blurOnSubmit={false}
          />
        )}
      </View>
      
      {/* Time Horizon (Optional) */}
      <View style={styles.optionalSection}>
        <Text style={styles.optionalLabel}>Time horizon (optional)</Text>
        <TextInput
          style={styles.optionalInput}
          placeholder="e.g., 3 months, 6 months, 1 year"
          placeholderTextColor={colors.text.secondary}
          value={timeHorizon}
          onChangeText={setTimeHorizon}
        />
      </View>
      
      {/* Constraints (Optional) */}
      <View style={styles.optionalSection}>
        <Text style={styles.optionalLabel}>Constraints or limitations (optional)</Text>
        <TextInput
          style={styles.optionalInput}
          placeholder="e.g., Knee injury, limited equipment, time constraints"
          placeholderTextColor={colors.text.secondary}
          value={constraints}
          onChangeText={setConstraints}
          multiline
          numberOfLines={2}
          blurOnSubmit={false}
        />
      </View>
      
      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={[styles.primaryButton, !primaryGoal.trim() && styles.disabledButton]} 
          onPress={handleSave}
          disabled={!primaryGoal.trim()}
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

// Goal presets for quick selection
const GOAL_PRESETS = [
  'Build strength and power',
  'Improve endurance and cardiovascular fitness',
  'Lose weight and improve body composition',
  'Maintain current fitness level',
  'Recover from injury',
  'Prepare for a specific event',
  'Improve overall health and longevity',
];


// ============================================
// EXPANDABLE SMART CARD WRAPPER
// ============================================

function ExpandableSmartCard({ card, onComplete, onDismiss }: SmartCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(true);
  };

  const handleClose = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(false);
  };

  if (expanded) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.expandedWrapper}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.expandedHeader}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.expandedScrollView}
          contentContainerStyle={styles.expandedScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          <SmartCardComponent 
            card={card} 
            onComplete={(id, payload) => {
              // Animate removal
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              onComplete(id, payload);
            }} 
            onDismiss={(id) => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              onDismiss(id);
            }} 
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <TouchableOpacity onPress={handleExpand} activeOpacity={0.7}>
      <CollapsedSmartSignalRow card={card} onReview={handleExpand} />
    </TouchableOpacity>
  );
}

// ============================================
// COLLAPSED ROW UI
// ============================================

function CollapsedSmartSignalRow({ card, onReview }: { card: SmartCardType; onReview: () => void }) {
  const icon = getSmartSignalIconName(card);
  let title = "Pending Action";
  let subtitle = "Tap to review";

  // Customize text based on type
  if (card.type === 'SLEEP_CONFIRM') {
    title = "Confirm sleep estimate";
    subtitle = "No recent data found.";
  } else if (card.type === 'WORKOUT_LOG') {
    const p = card.payload as WorkoutLogPayload;
    title = "Log Workout";
    subtitle = p.workoutType ? `${p.workoutType} detected` : "New session detected";
  } else if (card.type === 'WORKOUT_SUGGESTION') {
    title = "Workout Suggestion";
    subtitle = (card.payload as WorkoutSuggestionPayload).suggestion.title;
  } else if (card.type === 'GOALS_INTAKE') {
    title = "Goal Setting";
    subtitle = "Update your primary focus";
  }

  return (
    <View style={styles.collapsedRow}>
      <View style={styles.collapsedLeft}>
        <Ionicons name={icon} size={20} color={colors.text.secondary} />
        <View style={styles.collapsedText}>
          <Text style={styles.collapsedTitle}>{title}</Text>
          <Text style={styles.collapsedSubtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
      </View>
      
      <TouchableOpacity onPress={onReview}>
        <Text style={styles.reviewLink}>Review</Text>
      </TouchableOpacity>
    </View>
  );
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
      {visibleCards.map((card) => (
        <ExpandableSmartCard
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
    marginTop: spacing[2],
    gap: spacing[3],
  },
  // Collapsed Row
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  collapsedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  },
  collapsedText: {
    flex: 1,
  },
  collapsedTitle: {
    ...typography.cardTitle,
    color: colors.text.primary,
  },
  collapsedSubtitle: {
    ...typography.meta,
    color: colors.text.secondary,
  },
  reviewLink: {
    ...typography.meta,
    color: colors.accent.primary,
    fontWeight: '600',
  },
  
  // Expanded Wrapper
  expandedWrapper: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
    maxHeight: '80%', // Prevent card from taking full screen
  },
  expandedScrollView: {
    flex: 1,
  },
  expandedScrollContent: {
    flexGrow: 1,
    paddingBottom: spacing[4], // Extra padding at bottom for keyboard
  },
  expandedHeader: {
    alignItems: 'flex-end',
    paddingRight: spacing[2],
    paddingTop: spacing[2],
    marginBottom: -spacing[4], // Pull close button over card header if desired, or keep separate
    zIndex: 10,
  },
  closeButton: {
    padding: spacing[2],
  },

  // Existing Card Styles
  card: {
    padding: spacing[4],
    // Remove background/border here since wrapper handles it or we rely on composition.
    // Actually, SmartCardComponent renders specific cards which use styles.card.
    // We should keep styles.card but maybe remove the borderLeft which might look odd inside expanded view
    // Let's keep it for now as "Rich Card" look.
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexShrink: 1,
  },
  headerRight: {
    marginLeft: spacing[2],
  },
  iconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface2 ?? colors.bg,
  },
  cardTitle: {
    ...typography.cardTitle,
    color: colors.text.primary,
  },
  cardBody: {
    ...typography.bodySmall,
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
    ...typography.meta,
    color: colors.accent.primary,
    fontWeight: '600',
    backgroundColor: `${colors.accent.primary}15`,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.subtle,
  },
  whyText: {
    ...typography.meta,
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
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: `${colors.accent.primary}15`,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.input,
  },
  secondaryButtonText: {
    ...typography.bodySmall,
    color: colors.accent.primary,
    fontWeight: '500',
  },
  dismissButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  dismissButtonText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
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
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  inputLabel: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  noteInput: {
    backgroundColor: colors.bg,
    borderRadius: radius.input,
    padding: spacing[3],
    color: colors.text.primary,
    ...typography.bodySmall,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing[3],
    minHeight: 60,
    textAlignVertical: 'top',
  },
  goalsSection: {
    marginBottom: spacing[3],
  },
  goalPickList: {
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  goalOption: {
    padding: spacing[3],
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg,
  },
  goalOptionSelected: {
    borderColor: colors.accent.vitality,
    backgroundColor: `${colors.accent.vitality}15`,
  },
  goalOptionText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  goalOptionTextSelected: {
    color: colors.accent.vitality,
    fontWeight: '600',
  },
  optionalSection: {
    marginBottom: spacing[3],
  },
  optionalLabel: {
    ...typography.meta,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  optionalInput: {
    backgroundColor: colors.bg,
    borderRadius: radius.input,
    padding: spacing[3],
    color: colors.text.primary,
    ...typography.bodySmall,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
});
