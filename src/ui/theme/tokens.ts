/**
 * Design Tokens (PRD Appendix C — Single Source of Truth)
 * 
 * Purpose: Lock Sentient's visual identity as calm, restrained, instrument-like.
 * Typography is the primary voice; color is a functional signal; motion is confirmation; space is intentional.
 * 
 * Rule: No hardcoded hex values in UI components. All colors must come from this module.
 * Rule: These tokens are the single source of truth for core UI styling.
 */

// ============================================
// C.1 COLOR TOKENS (Option 1 — Sentient / Night Signal)
// ============================================

export const colors = {
  // Base / Background
  bg: '#0F1422',
  
  // Surface / Cards
  surface: '#1A2236',
  
  // Text
  text: {
    primary: '#F2F4F7',
    secondary: '#9AA4B2',
  },
  
  // Accent (Functional only — no decorative use)
  accent: {
    // Positive/ready signals (Focus cue, "Monitoring/Updated", readiness labels)
    primary: '#2FAF8F',
    // Caution/constraint signals (tightened bounds, warnings that are not critical)
    caution: '#E6B566',
    // Protection/critical strain signals (low vitality, high risk states)
    strain: '#C85C5C',
  },
  
  // Borders / Dividers
  border: {
    default: '#334155',
    subtle: '#1E293B',
  },
  
  // Transparency helpers (for overlays, disabled states)
  overlay: {
    dark: 'rgba(15, 20, 34, 0.9)',
    light: 'rgba(242, 244, 247, 0.1)',
  },
} as const;

// ============================================
// C.2 TYPOGRAPHY TOKENS
// ============================================

export const typography = {
  // Directive label (e.g., "Endurance — Maintenance") — Highest emphasis
  hero: {
    fontSize: 32,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
    lineHeight: 40,
    color: colors.text.primary,
  },
  
  // Focus cue (1 sentence) — Uses accent.primary when appropriate
  subhero: {
    fontSize: 22,
    fontWeight: '500' as const,
    lineHeight: 30,
    color: colors.accent.primary,
  },
  
  // Small labels (e.g., "AVOID", "ANALYST INSIGHT") — Low-contrast, restrained
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: colors.text.secondary,
  },
  
  // Insight summary/detail, card body — Plain language, no shouting
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: colors.text.primary,
  },
  
  // Status lines, timestamps, confidence — Secondary text
  meta: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    color: colors.text.secondary,
  },
  
  // Avoid line text — constraint styling
  avoid: {
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 26,
    color: colors.accent.strain,
  },
} as const;

// ============================================
// C.3 SPACING & LAYOUT TOKENS
// ============================================

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 40,
  8: 48,
} as const;

// ============================================
// C.4 RADIUS & ELEVATION TOKENS
// ============================================

export const radius = {
  // Cards / Panels
  card: 12,
  // Small status chips if used
  pill: 999,
  // Subtle rounding for inputs
  input: 6,
  // Very subtle for internal elements
  subtle: 4,
} as const;

export const elevation = {
  // Minimal shadow; rely on contrast, not depth
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  // For modals / overlays
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// ============================================
// C.5 MOTION TOKENS (Confirmation-only)
// ============================================

export const motion = {
  // For expand/collapse, content appearance
  easeInOut: {
    duration: 200,
    type: 'easeInOut' as const,
  },
  // For subtle crossfade on refresh
  crossfade: {
    duration: 150,
    type: 'linear' as const,
  },
} as const;

// ============================================
// C.6 FUNCTIONAL COLOR MAPPINGS
// ============================================

/**
 * Color mapping by system state
 * Use these to determine accent colors based on state
 */
export const stateColors = {
  READY_FOR_LOAD: colors.accent.primary,
  BUILDING_CAPACITY: colors.accent.primary,
  NEEDS_STIMULATION: colors.accent.caution,
  HIGH_STRAIN: colors.accent.caution,
  PHYSICAL_STRAIN: colors.accent.strain,
  RECOVERY_MODE: colors.accent.strain,
} as const;

/**
 * Vitality-based color
 */
export function getVitalityColor(vitality: number): string {
  if (vitality < 30) return colors.accent.strain;
  if (vitality < 60) return colors.accent.caution;
  return colors.accent.primary;
}

/**
 * Confidence badge styling
 */
export const confidenceStyles = {
  HIGH: {
    backgroundColor: `${colors.accent.primary}20`,
    borderColor: colors.accent.primary,
    textColor: colors.accent.primary,
  },
  MEDIUM: {
    backgroundColor: `${colors.accent.caution}20`,
    borderColor: colors.accent.caution,
    textColor: colors.accent.caution,
  },
  LOW: {
    backgroundColor: `${colors.accent.strain}20`,
    borderColor: colors.accent.strain,
    textColor: colors.accent.strain,
  },
} as const;

// ============================================
// COMPONENT PRESETS
// ============================================

/**
 * Common component style presets using tokens
 */
export const componentPresets = {
  // Screen container
  screenContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing[5],
  },
  
  // Surface card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing[4],
    ...elevation.card,
  },
  
  // Divider line
  divider: {
    height: 1,
    backgroundColor: colors.border.default,
  },
  
  // Primary button
  primaryButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.input,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  
  // Text input
  textInput: {
    backgroundColor: colors.bg,
    borderRadius: radius.input,
    padding: spacing[3],
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
} as const;

// Type exports for TypeScript consumers
export type ColorToken = typeof colors;
export type TypographyToken = typeof typography;
export type SpacingToken = typeof spacing;
export type RadiusToken = typeof radius;
