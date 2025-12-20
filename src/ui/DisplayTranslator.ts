/**
 * Display Translation Layer (Two-Layer Language System)
 * 
 * Purpose: Provides the SINGLE SOURCE OF TRUTH for translating Canonical Tokens (System Logic)
 * into Human-Readable Labels (UI).
 * 
 * Rules:
 * 1. UI must never invent new states.
 * 2. UI must never show raw tokens (except in Diagnostics/Engine).
 * 3. All mappings must match PRD Appendix A exactly.
 */

// --- A.1 System State ---
export const STATE_DISPLAY_MAP: Record<string, { label: string; description: string }> = {
    'READY_FOR_LOAD': { 
        label: 'Ready for Load', 
        description: 'Surplus capacity. Stress is appropriate today.' 
    },
    'BUILDING_CAPACITY': { 
        label: 'Building Capacity', 
        description: 'Adapting from recent load. Maintain consistency.' 
    },
    'NEEDS_STIMULATION': { 
        label: 'Needs Stimulation', 
        description: 'Under-loaded trend. A controlled stimulus is required.' 
    },
    'HIGH_STRAIN': { 
        label: 'High Strain', 
        description: 'Neural saturation risk. Reduce intensity and volatility.' 
    },
    'PHYSICAL_STRAIN': { 
        label: 'Physical Strain', 
        description: 'Structural tolerance compromised. Protect joints/tissues.' 
    },
    'RECOVERY_MODE': { 
        label: 'Recovery Mode', 
        description: 'Acute recovery priority.' 
    },
    // Fallback for unexpected states (Safety)
    'DEFAULT': {
        label: 'Calibrating...',
        description: 'System is establishing baseline metrics.'
    }
};

export function getReadableState(token: string): string {
    return STATE_DISPLAY_MAP[token]?.label || STATE_DISPLAY_MAP['DEFAULT'].label;
}

export function getStateDescription(token: string): string {
    return STATE_DISPLAY_MAP[token]?.description || STATE_DISPLAY_MAP['DEFAULT'].description;
}

// --- A.2 Directive Labels ---

const CATEGORY_MAP: Record<string, string> = {
    'STRENGTH': 'Strength',
    'ENDURANCE': 'Endurance',
    'NEURAL': 'Neural',
    'REGULATION': 'Regulation'
};

const STIMULUS_MAP: Record<string, string> = {
    'OVERLOAD': 'Overload',
    'MAINTENANCE': 'Maintenance',
    'FLUSH': 'Flush',
    'TEST': 'Test'
};

/**
 * Returns the primary formatted directive label: "<Category> — <Stimulus>"
 * Example: "Strength — Overload"
 */
export function getDirectiveLabel(category: string, stimulus: string): string {
    const catLabel = CATEGORY_MAP[category] || category; // Fallback to raw if unknown
    const stimLabel = STIMULUS_MAP[stimulus] || stimulus;
    return `${catLabel} — ${stimLabel}`;
}
