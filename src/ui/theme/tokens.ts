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
// C.1 COLOR TOKENS — Sentient V3 (Darker, High Contrast)
// ============================================

export const colors = {
  // Base / Background
  // Deep void black/blue
  bg: '#05050A',
  
  // Surface / Cards
  // Subtle instrument panels
  surface: '#0F1014',
  // Deeper surface (nested panels / input wells)
  surface2: '#0A0B0E',
  
  // Text
  text: {
    // "Perfect White"
    primary: '#FFFFFF',
    // "Muted Silver"
    secondary: '#9CA3AF',
    // "Dim"
    tertiary: '#4B5563',
  },
  
  // Accent (Functional signals)
  accent: {
    // Vitality (Cyan/Teal)
    vitality: '#06b6d4', // Cyan 500
    // State (Gold/Amber)
    peak: '#eab308',     // Yellow 500
    // Load (Violet/Purple)
    load: '#a855f7',     // Purple 500
    
    // Legacy mapping (keep for compatibility, but prefer specific above)
    primary: '#06b6d4',
    caution: '#eab308',
    strain: '#ef4444',   // Red 500
  },
  
  // Gradients (Start/End pairs for LinearGradient)
  gradients: {
    vitality: ['#06b6d4', '#0891b2'] as const,
    peak: ['#facc15', '#ca8a04'] as const,
    load: ['#c084fc', '#9333ea'] as const,
    strain: ['#f87171', '#dc2626'] as const,
    dark: ['#1f2937', '#030712'] as const, // For backgrounds
  },
  
  // Borders / Dividers
  border: {
    default: '#1f2937',
    subtle: '#111827',
  },
  
  // Transparency helpers (for overlays, disabled states)
  overlay: {
    dark: 'rgba(5, 5, 10, 0.92)',
    light: 'rgba(255, 255, 255, 0.10)',
  },
} as const;

// ============================================
// C.2 TYPOGRAPHY TOKENS
// ============================================

export const typography = {
  // Main Header ("Good evening")
  header: {
    fontSize: 28,
    fontWeight: '400' as const,
    letterSpacing: -0.5,
    color: colors.text.primary,
  },

  // Directive label (e.g., "Endurance") — Strongest
  hero: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 40,
    color: colors.text.primary,
  },
  
  // Focus cue ("Maintenance") — Elegant serif-like or italic
  subhero: {
    fontSize: 24,
    fontWeight: '400' as const,
    fontStyle: 'italic' as const,
    lineHeight: 32,
    color: colors.text.secondary,
  },
  
  // Small labels (e.g., "AVOID", "DAILY DIRECTIVE")
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: colors.accent.primary, // Often colored in new design
  },
  
  // Insight summary/detail, card body
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: colors.text.secondary,
  },
  
  // Metrics numbers
  metricValue: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: colors.text.primary,
  },
  
  // Metrics labels
  metricLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    color: colors.text.secondary,
  },
  
  // Status lines, timestamps
  meta: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    color: colors.text.secondary,
  },
  
  // Avoid line text
  avoid: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: colors.text.primary,
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
  card: 20, // Increased radius per screenshot
  
  // Small status chips
  pill: 999,
  
  // Very subtle for internal elements
  subtle: 6,
  
  // Input fields
  input: 12,
} as const;

export const elevation = {
  // Minimal shadow; rely on borders/glows
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

// ============================================
// C.5 MOTION TOKENS
// ============================================

export const motion = {
  // Standard ease
  easeInOut: {
    duration: 300,
    type: 'easeInEaseOut' as const,
  },
} as const;

// ============================================
// C.6 FUNCTIONAL COLOR MAPPINGS
// ============================================

export const stateColors = {
  READY_FOR_LOAD: colors.accent.vitality,
  BUILDING_CAPACITY: colors.accent.vitality,
  NEEDS_STIMULATION: colors.accent.peak,
  HIGH_STRAIN: colors.accent.peak,
  PHYSICAL_STRAIN: colors.accent.strain,
  RECOVERY_MODE: colors.accent.strain,
} as const;

export function getVitalityColor(vitality: number): string {
  if (vitality < 30) return colors.accent.strain;
  if (vitality < 60) return colors.accent.peak;
  return colors.accent.vitality;
}

/**
 * Confidence badge styling
 */
export const confidenceStyles = {
  HIGH: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)', // vitality with opacity
    borderColor: colors.accent.vitality,
    textColor: colors.accent.vitality,
  },
  MEDIUM: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)', // peak with opacity
    borderColor: colors.accent.peak,
    textColor: colors.accent.peak,
  },
  LOW: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)', // strain with opacity
    borderColor: colors.accent.strain,
    textColor: colors.accent.strain,
  },
} as const;

// Type exports

export type ColorToken = typeof colors;
export type TypographyToken = typeof typography;
export type SpacingToken = typeof spacing;
export type RadiusToken = typeof radius;
