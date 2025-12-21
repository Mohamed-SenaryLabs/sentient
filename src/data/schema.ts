/**
 * Core data schemas for Sentient V3.0 (Performance Intelligence)
 * Defines the structure of OperatorDailyStats and SystemStatus
 */

// PRD §4.X.3 - Sleep Availability Policy
export interface SleepData {
  totalDurationSeconds: number;
  awakeSeconds: number;
  remSeconds: number;
  coreSeconds: number;
  deepSeconds: number;
  score: number; // 0-100
  source?: 'MEASURED' | 'ESTIMATED_7D' | 'DEFAULT_6H' | 'MANUAL';
}

export interface Workout {
  id: string;
  type: string;
  durationSeconds: number;
  activeCalories: number;
  distance?: number; // meters
  startDate?: string; // ISO String
  avgHeartRate?: number;
  maxHeartRate?: number;
  rpm?: number;
  minHeartRate?: number;
}

export interface ActivityData {
  steps: number;
  stepsSource?: 'today' | '24h' | 'yesterday';
  activeCalories: number;
  activeCaloriesSource?: 'today' | '24h' | 'yesterday';
  activeCaloriesDate?: string; // ISO date string
  restingCalories: number;
  activeMinutes: number;
  workouts: Workout[];
}

export interface StressMetrics {
    avg?: number;         // 0-100
    highest?: number;     // 0-100
    lowest?: number;      // 0-100
    time_elevated_pct?: number; // 0-100
}

export interface Biometrics {
  hrv: number; // SDNN in ms
  restingHeartRate: number;
  heartRate?: number; // Most recent or average heart rate (BPM)
  respiratoryRate: number;
  skinTemperatureCelsius?: number;
  bodyTemperatureCelsius?: number;
  sleepingWristTemperatureCelsius?: number;
  vo2Max?: number; // ml/kg/min
  
  // V3.0 New Metrics (Bevel Parity)
  oxygenSaturation?: number; // SpO2 (0-1.0 or %)
  bloodGlucose?: number; // mg/dL
  
  // PRD §2.1.E - Autonomic Stress
  stress?: StressMetrics;
}

// PRD §4.X.1 - Baseline Quality Gate (per metric)
export interface BaselineQuality {
  mean: number;
  stdDev: number;
  sampleCount: number;
  coverage: number; // sampleCount / 30
}

// PRD §4.X.2 - Availability (separate from Confidence)
export type Availability = 'AVAILABLE' | 'UNAVAILABLE';

export interface SystemStatus {
  axes: {
    metabolic: number;   // 0-100
    mechanical: number;  // 0-100
    neural: number;      // 0-100
    recovery: number;    // 0-100
    regulation: number;  // 0-100
  };
  current_state: string; 
  active_lens: string;   // Archetype (e.g. RANGER, OPERATOR)
  
  // PRD §4.X.2 - Availability & Confidence (Two Flags)
  availability?: Availability;
  unavailableReason?: string; // e.g. "INSUFFICIENT_BASELINE", "NO_HRV_TODAY"
  state_confidence?: number; // 0-100
  reason_code?: string; // e.g. "HRV_MISSING", "SLEEP_DEPRIVED"
  
  // PRD §4.X.6 - Evidence (Audit-Ready)
  dominantAxes?: string[]; // e.g. ["neural", "recovery"]
  
  archetype_confidence?: number; // 0-100
  valid_from?: string; // ISO timestamp
  valid_to?: string; // ISO timestamp
}

export interface AdherenceLog {
  date: string; // YYYY-MM-DD
  status: 'ALIGNED' | 'MISALIGNED' | 'SKIPPED' | 'REST_DAY';
}

// Core work unit (formerly Quest)
export interface Session {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'MISSED';
  
  display: {
    title: string;       
    subtitle: string;   
    icon: string;        
    color: string;       
    label: string;       
  };
  
  instructions: string; 
  session_focus?: string;
  avoid_cue?: string;
  analyst_insight?: string; 
  
  validation: {
    type: 'DURATION' | 'CALORIES' | 'HEART_RATE' | 'STEPS';
    target_value: number;
    min_hr: number | null;
    max_hr: number | null;
  };

  impact: {
    primary_axis: 'METABOLIC' | 'MECHANICAL' | 'NEURAL' | 'RECOVERY';
    physiological_load: number; // 1-10 scale
  };

  intensity: 'LOW' | 'MODERATE' | 'HIGH';
  
  created_at: string; // ISO
  expires_at: string; // ISO
}

export interface OracleState {
  content: string;
  timestamp: string; // ISO
  triggerEvent: 'DAWN' | 'QUEST_COMPLETE' | 'STATE_SHIFT' | 'MANUAL';
  isLocked?: boolean;
}

export interface DailyDirective {
  dayOffset: 0 | 1 | 2; // 0=Today, 1=Tomorrow, 2=Day+2
  state: string; // Projected state
  directive: {
    category: 'STRENGTH' | 'ENDURANCE' | 'NEURAL' | 'REGULATION';
    stimulus_type: 'OVERLOAD' | 'MAINTENANCE' | 'FLUSH' | 'TEST';
    target_rpe?: number;
  };
  constraints: {
    allow_impact: boolean;
    required_equipment: string[];
    heart_rate_cap?: number;
  };
}

// PRD §3.4.1.1: Analyst Insight (LLM-Generated, Day-Stable)
export interface AnalystInsight {
  summary: string;              // 1-2 sentences, required
  detail?: string;              // Optional long-form context
  generatedAt: string;          // ISO timestamp
  source: 'LLM' | 'FALLBACK' | 'TEMPLATE';
  validationPassed: boolean;
  retryCount?: number;
}

// [NEW] Partial session details from LLM
export interface SessionOverride {
  title?: string;
  subtitle?: string;
  instructions?: string;
  type?: 'DURATION' | 'CALORIES' | 'STEPS' | 'HEART_RATE';
  target_value?: number;
  focus_cue?: string;
  avoid_cue?: string;
  analyst_insight?: string;
}

export interface LogicChainContract {
  // v3.0 3-Day Strategic Arc
  horizon: DailyDirective[]; 
  
  // Legacy fields mapped to Day 0
  state: string;
  dominant_factors: string[];
  directive: { 
    category: 'STRENGTH' | 'ENDURANCE' | 'NEURAL' | 'REGULATION';
    stimulus_type: 'OVERLOAD' | 'MAINTENANCE' | 'FLUSH' | 'TEST';
    target_rpe?: number;
  };
  session_focus: string; // Legacy tactical cue (still used by SessionManager)
  
  
  // PRD §3.4.1.1: LLM-Generated Content (Day-Stable, Persistent)
  session_focus_llm?: string;          // Max 160 chars, LLM-generated tactical cue
  avoid_cue?: string;                  // Max 120 chars, constraint framing
  analyst_insight?: AnalystInsight;    // Structured insight with summary + detail
  evidence_summary?: string[];         // 3-5 bullets (deterministic)
  
  // Metadata for persistence validation
  content_generated_at?: string;       // ISO timestamp
  content_source?: 'LLM' | 'FALLBACK';
  
  // INTRA_DAY_RECAL: Snapshots for trigger detection
  directive_snapshot?: string;         // JSON of directive used for generation
  constraints_snapshot?: string;       // JSON of constraints used for generation
  
  // INTRA_DAY_RECAL: Observability metadata
  last_recal_at?: string;              // ISO timestamp of last recalibration
  last_recal_reason?: string;          // Human-readable reason for recal
  recal_count?: number;                // Number of recals today (for cooldown)
  
  // [NEW] LLM Session Details (passed through from Gemini)
  llm_generated_session?: SessionOverride;
  session_focus_refinement?: string;

  // [NEW] Decision Trace (for Engine Screen)
  trace?: {
      winner_score: number;
      rejected_alternatives: string[];
      constraints: string[];
  };

  constraints: {
    allow_impact: boolean;
    required_equipment: string[];
    heart_rate_cap?: number;
  };
}


/**
 * The core data object for a single day in the Operator's life.
 */
export interface OperatorDailyStats {
  id: string; // YYYY-MM-DD
  date: string;
  
  // v3.0 Mission Variables (Renamed from JournalEntries)
  missionVariables: string[]; // e.g. "Caffeine", "Alcohol", "Late Meal"
  
  // Aggregated Data
  sleep: SleepData;
  activity: ActivityData;
  biometrics: Biometrics;
  mindfulMinutes?: number;
  
  // Calculations
  stats: {
    vitality: number; // 1-100 (Homeostatic Integrity) - FLOOR IS 1
    vitalityZScore: number;
    isVitalityEstimated?: boolean;
    
    // PRD §4.X.2 - Availability & Confidence (Two Flags)
    vitalityAvailability?: Availability;
    vitalityUnavailableReason?: string;
    vitalityConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    
    // PRD §4.X.6 - Evidence Summary (3-5 bullets)
    evidenceSummary?: string[];
    
    adaptiveCapacity: { // Renamed from mana for V3
        current: number; 
        max: number;
    };

    // Canonical Metrics
    physiologicalLoad: number; // Cost
    loadDensity?: number; // 72h Load Volume (Sum of last 3 days load)
    alignmentScore: number; // 0-100
    alignmentStatus?: 'ALIGNED' | 'MISALIGNED'; // Added for Progression
    consistency: number; // Streak
    shieldsBreached: boolean;
    
    // System Status
    systemStatus: SystemStatus;
    
    // Insights
    trends?: {
      recovery_trend: 'RISING' | 'FALLING' | 'STABLE';
      load_trend: 'RISING' | 'FALLING' | 'STABLE';
    };

    // V3.0 Appendix B: Biometric Evidence (Biology)
    biometric_trends?: {
        hrv: {
            baseline: number; // 30-day avg
            stdDev?: number;
            sampleCount?: number;
            today_z_score: number; 
            trend: 'RISING' | 'FALLING' | 'STABLE';
        };
        rhr: {
            baseline: number;
            stdDev?: number;
            sampleCount?: number;
            today_z_score: number; 
            trend: 'RISING' | 'FALLING' | 'STABLE';
        };
        sleep: {
            baseline_duration: number; // seconds
            stdDev?: number;
            sampleCount?: number;
            trend: 'RISING' | 'FALLING' | 'STABLE';
        },
        steps: {
            baseline: number;
            trend: 'RISING' | 'FALLING' | 'STABLE';
        },
        active_calories: {
            baseline: number;
            trend: 'RISING' | 'FALLING' | 'STABLE';
        }
    };
  };

  // AI Insights
  dailySummary?: string;
  activeSession?: Session; 
  
  logicContract?: LogicChainContract;
  completedSessions?: string[]; 
  
  oracleState?: OracleState;
  
  workoutFingerprints?: string[];
}
