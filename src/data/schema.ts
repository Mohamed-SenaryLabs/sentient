/**
 * Core data schemas for Sentient V3.0 (Performance Intelligence)
 * Defines the structure of OperatorDailyStats and SystemStatus
 */

export interface SleepData {
  totalDurationSeconds: number;
  awakeSeconds: number;
  remSeconds: number;
  coreSeconds: number;
  deepSeconds: number;
  score: number; // 0-100
  source?: 'biometric' | 'sensor' | 'manual' | 'average';
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
}

export interface SystemStatus {
  axes: {
    metabolic: number;   // 0-100
    mechanical: number;  // 0-100
    neural: number;      // 0-100
    recovery: number;    // 0-100
    regulation: number;  // 0-100
  };
  current_state: string; 
  active_lens: string;   // Operator Class / Archetype
  state_confidence?: number; // 0-100
  archetype_confidence?: number; // 0-100
  valid_from?: string; // ISO timestamp
  valid_to?: string; // ISO timestamp
}

export interface AdherenceLog {
  date: string; // YYYY-MM-DD
  status: 'ALIGNED' | 'MISALIGNED' | 'SKIPPED' | 'REST_DAY';
}

// Replaces Quest
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
  
  validation: {
    type: 'DURATION' | 'CALORIES' | 'HEART_RATE' | 'STEPS';
    target_value: number;
    min_hr: number | null;
    max_hr: number | null;
  };

  impact: {
    primary_axis: 'METABOLIC' | 'MECHANICAL' | 'NEURAL' | 'RECOVERY';
    load_score: number; // 1-10 scale. Canonical Term: "Physiological Load"
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
  quest_type: string;
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
    vitality: number; // 0-100 (Homeostatic Integrity)
    vitalityZScore: number;
    isVitalityEstimated?: boolean;
    
    adaptiveCapacity: { // Renamed from mana for V3
        current: number; 
        max: number;
    };

    // Canonical Metrics
    physiologicalLoad: number; // Cost
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
  };

  // AI Insights
  dailySummary?: string;
  activeSession?: Session; 
  
  logicContract?: LogicChainContract;
  completedSessions?: string[]; 
  
  oracleState?: OracleState;
  
  workoutFingerprints?: string[];
}
