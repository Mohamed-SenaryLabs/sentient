/**
 * Local Database Layer (V3.0)
 * Uses SQLite for on-device storage of health data
 */

import * as SQLite from 'expo-sqlite';
import { 
  OperatorDailyStats, 
  SystemStatus,
  SmartCard, 
  SmartCardType, 
  SmartCardStatus, 
  SmartCardPayload,
  WorkoutLog,
  OperatorGoals 
} from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<void> {
  try {
    db = await SQLite.openDatabaseAsync('sentient_v3.db'); // New DB name for V3
    await createTables();
    await initSmartCardsTables();
    console.log('[Database] V3 Initialized successfully');
  } catch (error) {
    console.error('[Database] Initialization error:', error);
    throw error;
  }
}

async function createTables(): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS daily_stats (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      mission_variables TEXT, -- Renamed from journal_entries
      
      -- Sleep
      sleep_total_duration_seconds INTEGER,
      sleep_awake_seconds INTEGER,
      sleep_rem_seconds INTEGER,
      sleep_core_seconds INTEGER,
      sleep_deep_seconds INTEGER,
      sleep_score INTEGER,
      sleep_source TEXT,
      
      -- Activity
      activity_steps INTEGER,
      activity_active_calories INTEGER,

      activity_resting_calories INTEGER,
      activity_active_minutes INTEGER,
      activity_mindful_minutes INTEGER,
      activity_workouts TEXT,
      
      -- Biometrics
      biometrics_hrv REAL,
      biometrics_resting_heart_rate INTEGER,
      biometrics_respiratory_rate INTEGER,
      biometrics_skin_temperature REAL,
      biometrics_body_temperature REAL,
      biometrics_sleeping_wrist_temperature REAL,
      biometrics_vo2_max REAL,
      biometrics_oxygen_saturation REAL, -- New V3
      biometrics_blood_glucose REAL,     -- New V3
      
      -- Stats (Presentation-only projections)
      stats_vitality INTEGER,
      stats_vitality_z_score REAL,
      stats_is_vitality_estimated INTEGER,
      stats_vitality_confidence TEXT, -- 'HIGH' | 'MEDIUM' | 'LOW'
      stats_vitality_availability TEXT, -- PRD §4.X.2: 'AVAILABLE' | 'UNAVAILABLE'
      stats_vitality_unavailable_reason TEXT, -- PRD §4.X.2
      stats_evidence_summary TEXT, -- PRD §4.X.6: JSON array of evidence bullets
      stats_adaptive_capacity_current INTEGER, -- Renamed from mana
      stats_adaptive_capacity_max INTEGER,
      stats_physiological_load INTEGER,
      stats_load_density REAL, -- New V3.1
      stats_alignment_score INTEGER,
      stats_consistency INTEGER,
      stats_shields_breached INTEGER,
      
      -- SystemStatus (THE SINGLE SOURCE OF TRUTH)
      axis_metabolic INTEGER,
      axis_mechanical INTEGER,
      axis_neural INTEGER,
      axis_recovery INTEGER,
      axis_regulation INTEGER,
      system_state TEXT,
      active_lens TEXT,
      state_confidence INTEGER,
      reason_code TEXT, -- New V3.1
      archetype_confidence INTEGER,
      valid_from TEXT,
      valid_to TEXT,
      
      -- Trends
      recovery_trend TEXT,
      load_trend TEXT,
      
      -- AI Insights
      daily_summary TEXT,
      active_session TEXT, 
      logic_contract TEXT,
      oracle_state TEXT,
      
      -- Metadata
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_date ON daily_stats(date);

    CREATE TABLE IF NOT EXISTS system_storage (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      directive_id TEXT,
      type TEXT, -- STRENGTH, ENDURANCE, etc
      status TEXT, -- PENDING, COMPLETED, MISSED
      data TEXT, -- JSON blob of session details
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    );

  `);
  
  // Migrations for new columns
  try {
    await db.runAsync('ALTER TABLE daily_stats ADD COLUMN activity_resting_calories INTEGER');
  } catch (e) {} // Ignore if exists
  
  try {
    await db.runAsync('ALTER TABLE daily_stats ADD COLUMN activity_workouts TEXT');
  } catch (e) {}
  
  // First check if alignment_status column exists, adding if not (from previous code)
  try {
    await db.runAsync(
      `ALTER TABLE daily_stats ADD COLUMN alignment_status TEXT`,
    );
  } catch (e) {} 

  // V3.1 Migration: Load Density
  try {
    await db.runAsync('ALTER TABLE daily_stats ADD COLUMN stats_load_density REAL');
  } catch (e) {} // Ignore 
  // V3.1 Migration: Load Density
  try {
    await db.runAsync('ALTER TABLE daily_stats ADD COLUMN stats_load_density REAL');
  } catch (e) {} 

  // V3.2 Migration: Robustness (Reason Code & Confidence)
  try {
    await db.runAsync('ALTER TABLE daily_stats ADD COLUMN reason_code TEXT');
  } catch (e) {}

  try {
    await db.runAsync('ALTER TABLE daily_stats ADD COLUMN stats_vitality_confidence TEXT');
  } catch (e) {}

  // V3.3 Migration: PRD §4.X (Availability & Evidence)
  try {
    await db.runAsync('ALTER TABLE daily_stats ADD COLUMN stats_vitality_availability TEXT');
  } catch (e) {}
  try {
    await db.runAsync('ALTER TABLE daily_stats ADD COLUMN stats_vitality_unavailable_reason TEXT');
  } catch (e) {}
  try {
    await db.runAsync('ALTER TABLE daily_stats ADD COLUMN stats_evidence_summary TEXT');
  } catch (e) {}
}

export async function saveDailyStats(stats: OperatorDailyStats): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const systemStatus = stats.stats.systemStatus;
    
    await db.runAsync(
      `INSERT OR REPLACE INTO daily_stats (
        id, date, mission_variables,
        sleep_total_duration_seconds, sleep_awake_seconds, sleep_rem_seconds,
        sleep_core_seconds, sleep_deep_seconds, sleep_score, sleep_source,
        activity_steps, activity_active_calories, activity_resting_calories, activity_active_minutes, activity_mindful_minutes, activity_workouts,
        biometrics_hrv, biometrics_resting_heart_rate, biometrics_respiratory_rate,
        biometrics_skin_temperature, biometrics_body_temperature, biometrics_sleeping_wrist_temperature,
        biometrics_vo2_max, biometrics_oxygen_saturation, biometrics_blood_glucose,
        stats_vitality, stats_vitality_z_score, stats_is_vitality_estimated, stats_vitality_confidence,
        stats_vitality_availability, stats_vitality_unavailable_reason, stats_evidence_summary,
        stats_adaptive_capacity_current, stats_adaptive_capacity_max,
        stats_physiological_load, stats_load_density, stats_alignment_score, stats_consistency,
        stats_shields_breached,
        axis_metabolic, axis_mechanical, axis_neural, axis_recovery, axis_regulation,
        system_state, active_lens,
        state_confidence, reason_code, archetype_confidence, valid_from, valid_to,
        recovery_trend, load_trend,
        daily_summary, active_session, logic_contract, oracle_state,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        stats.id,
        stats.date,
        JSON.stringify(stats.missionVariables),
        stats.sleep.totalDurationSeconds,
        stats.sleep.awakeSeconds,
        stats.sleep.remSeconds,
        stats.sleep.coreSeconds,
        stats.sleep.deepSeconds,
        stats.sleep.score,
        stats.sleep.source || null,
        stats.activity.steps,
        stats.activity.activeCalories,
        stats.activity.restingCalories,
        stats.activity.activeMinutes,
        stats.mindfulMinutes || 0,
        JSON.stringify(stats.activity.workouts || []),
        stats.biometrics.hrv,
        stats.biometrics.restingHeartRate,
        stats.biometrics.respiratoryRate,
        stats.biometrics.skinTemperatureCelsius || null,
        stats.biometrics.bodyTemperatureCelsius || null,
        stats.biometrics.sleepingWristTemperatureCelsius || null,
        stats.biometrics.vo2Max || null,
        stats.biometrics.oxygenSaturation || null,
        stats.biometrics.bloodGlucose || null,
        stats.stats.vitality,
        stats.stats.vitalityZScore,
        stats.stats.isVitalityEstimated ? 1 : 0,
        stats.stats.vitalityConfidence || 'HIGH',
        stats.stats.vitalityAvailability || 'AVAILABLE',
        stats.stats.vitalityUnavailableReason || null,
        stats.stats.evidenceSummary ? JSON.stringify(stats.stats.evidenceSummary) : null,
        stats.stats.adaptiveCapacity.current,
        stats.stats.adaptiveCapacity.max,
        stats.stats.physiologicalLoad,
        stats.stats.loadDensity || 0,
        stats.stats.alignmentScore,
        stats.stats.consistency,
        stats.stats.shieldsBreached ? 1 : 0,
        systemStatus.axes.metabolic,
        systemStatus.axes.mechanical,
        systemStatus.axes.neural,
        systemStatus.axes.recovery,
        systemStatus.axes.regulation,
        systemStatus.current_state,
        systemStatus.active_lens,
        systemStatus.state_confidence || null,
        systemStatus.reason_code || null,
        systemStatus.archetype_confidence || null,
        systemStatus.valid_from || null,
        systemStatus.valid_to || null,
        stats.stats.trends?.recovery_trend || null,
        stats.stats.trends?.load_trend || null,
        stats.dailySummary || null,
        stats.activeSession ? JSON.stringify(stats.activeSession) : null,
        stats.logicContract ? JSON.stringify(stats.logicContract) : null,
        stats.oracleState ? JSON.stringify(stats.oracleState) : null,
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
  } catch (error) {
    console.error('[Database] Error saving daily stats:', error);
    throw error;
  }
}

export async function getDailyStats(date: string): Promise<OperatorDailyStats | null> {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const result = await db.getFirstAsync<any>('SELECT * FROM daily_stats WHERE date = ?', [date]);
    if (!result) return null;
    
    // Map result to OperatorDailyStats
    return {
      id: result.id,
      date: result.date,
      missionVariables: JSON.parse(result.mission_variables || '[]'),
      sleep: {
        totalDurationSeconds: result.sleep_total_duration_seconds,
        awakeSeconds: result.sleep_awake_seconds,
        remSeconds: result.sleep_rem_seconds,
        coreSeconds: result.sleep_core_seconds,
        deepSeconds: result.sleep_deep_seconds,
        score: result.sleep_score,
        source: result.sleep_source,
      },
      activity: {
        steps: result.activity_steps,
        activeCalories: result.activity_active_calories,
        activeMinutes: result.activity_active_minutes,
        restingCalories: result.activity_resting_calories || 1500,
        workouts: result.activity_workouts ? JSON.parse(result.activity_workouts) : [],
      },
      biometrics: {
        hrv: result.biometrics_hrv,
        restingHeartRate: result.biometrics_resting_heart_rate,
        respiratoryRate: result.biometrics_respiratory_rate,
        skinTemperatureCelsius: result.biometrics_skin_temperature,
        bodyTemperatureCelsius: result.biometrics_body_temperature,
        sleepingWristTemperatureCelsius: result.biometrics_sleeping_wrist_temperature,
        vo2Max: result.biometrics_vo2_max,
        oxygenSaturation: result.biometrics_oxygen_saturation,
        bloodGlucose: result.biometrics_blood_glucose,
      },
      stats: {
        vitality: result.stats_vitality,
        vitalityZScore: result.stats_vitality_z_score,
        isVitalityEstimated: !!result.stats_is_vitality_estimated,
        vitalityConfidence: result.stats_vitality_confidence as 'HIGH' | 'MEDIUM' | 'LOW' || 'HIGH',
        adaptiveCapacity: {
            current: result.stats_adaptive_capacity_current,
            max: result.stats_adaptive_capacity_max,
        },
        physiologicalLoad: result.stats_physiological_load,
        loadDensity: result.stats_load_density || 0, // Map back
        alignmentScore: result.stats_alignment_score,
        consistency: result.stats_consistency,
        shieldsBreached: !!result.stats_shields_breached,
        systemStatus: {
          axes: {
            metabolic: result.axis_metabolic,
            mechanical: result.axis_mechanical,
            neural: result.axis_neural,
            recovery: result.axis_recovery,
            regulation: result.axis_regulation,
          },
          current_state: result.system_state,
          active_lens: result.active_lens,
          state_confidence: result.state_confidence,
          reason_code: result.reason_code,
          archetype_confidence: result.archetype_confidence,
          valid_from: result.valid_from,
          valid_to: result.valid_to,
        },
        trends: result.recovery_trend ? {
          recovery_trend: result.recovery_trend,
          load_trend: result.load_trend,
        } : undefined,
      },
      dailySummary: result.daily_summary,
      activeSession: result.active_session ? JSON.parse(result.active_session) : undefined,
      logicContract: result.logic_contract ? JSON.parse(result.logic_contract) : undefined,
      oracleState: result.oracle_state ? JSON.parse(result.oracle_state) : undefined,
    };
  } catch (error) {
    console.error('[Database] Error reading daily stats:', error);
    return null;
  }
}

// Helper to get historical data for Day Zero protocol
export async function getHistoricalData(days: number = 30): Promise<{
    hrv: number[];
    restingHeartRate: number[];
    activeEnergy: number[];
    dates: string[];
}> {
    if (!db) throw new Error('Database not initialized');
    
    // Logic to query historical data (Simulated or Real if permissions allow reading past data that was saved)
    // Note: HealthKit data lives in HealthKit, this DB only stores what we've previously synced.
    // For 'Day Zero' protocol, we might need a direct HealthKit query, not DB query. 
    // This DB function is for *our* stored history.
    
    const results = await db.getAllAsync<{
        date: string;
        biometrics_hrv: number;
        biometrics_resting_heart_rate: number;
        activity_active_calories: number;
    }>(
        `SELECT date, biometrics_hrv, biometrics_resting_heart_rate, activity_active_calories
         FROM daily_stats
         ORDER BY date DESC
         LIMIT ?`,
        [days]
    );

    return {
        hrv: results.map(r => r.biometrics_hrv).filter(v => v > 0),
        restingHeartRate: results.map(r => r.biometrics_resting_heart_rate).filter(v => v > 0),
        activeEnergy: results.map(r => r.activity_active_calories),
        dates: results.map(r => r.date),
    };
}

// --- Day Zero Protocol Functions ---

/**
 * Check if this is the first launch (no baseline data)
 */
export async function isFirstLaunch(): Promise<boolean> {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM system_storage WHERE key = ?',
      ['first_launch_complete']
    );
    return !result || result.value !== 'true';
  } catch (error) {
    return true;
  }
}

/**
 * Mark first launch as complete
 */
export async function setFirstLaunchComplete(): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  await db.runAsync(
    'INSERT OR REPLACE INTO system_storage (key, value) VALUES (?, ?)',
    ['first_launch_complete', 'true']
  );
  console.log('[Database] First launch marked as complete');
}

/**
 * Save calculated baselines from Day Zero protocol
 */
export async function saveBaselines(baselines: {
  hrv: number;
  stdDevHrv?: number;
  sampleCountHrv?: number;
  coverageHrv?: number;  // PRD §4.X.1
  rhr: number;
  stdDevRhr?: number;
  sampleCountRhr?: number;
  coverageRhr?: number;
  steps: number;
  activeCalories: number;
  sleepSeconds: number;
  stdDevSleep?: number;
  sampleCountSleep?: number;
  coverageSleep?: number;
  sleepUserEntered?: boolean;  // Smart Cards: user confirmed this value
  workoutMinutes: number; 
  vo2Max: number;         
  calculatedAt: string;
}): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  await db.runAsync(
    'INSERT OR REPLACE INTO system_storage (key, value) VALUES (?, ?)',
    ['baselines', JSON.stringify(baselines)]
  );
  console.log('[Database] Baselines saved:', baselines);
}

/**
 * Get stored baselines
 */
export async function getBaselines(): Promise<{
  hrv: number;
  stdDevHrv?: number;
  sampleCountHrv?: number;
  coverageHrv?: number;  // PRD §4.X.1
  rhr: number;
  stdDevRhr?: number;
  sampleCountRhr?: number;
  coverageRhr?: number;
  steps: number;
  activeCalories: number;
  sleepSeconds: number;
  stdDevSleep?: number;
  sampleCountSleep?: number;
  coverageSleep?: number;
  sleepUserEntered?: boolean;  // Smart Cards: user confirmed this value
  workoutMinutes: number; 
  vo2Max: number;         
  calculatedAt: string;
} | null> {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM system_storage WHERE key = ?',
      ['baselines']
    );
    return result ? JSON.parse(result.value) : null;
  } catch (error) {
    return null;
  }
}

/**
 * Update sleep baseline with user-confirmed value (Smart Cards)
 */
export async function updateSleepBaseline(sleepSeconds: number): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  const baselines = await getBaselines();
  if (!baselines) {
    console.error('[Database] Cannot update sleep baseline - no baselines found');
    return;
  }
  
  baselines.sleepSeconds = sleepSeconds;
  baselines.sleepUserEntered = true;
  baselines.calculatedAt = new Date().toISOString();
  
  await db.runAsync(
    'INSERT OR REPLACE INTO system_storage (key, value) VALUES (?, ?)',
    ['baselines', JSON.stringify(baselines)]
  );
  console.log('[Database] Sleep baseline updated:', (sleepSeconds / 3600).toFixed(1), 'h (user entered)');
}

/**
 * Get last 30 days of stored OperatorDailyStats for progression calculation
 */
export async function get30DayHistory(): Promise<OperatorDailyStats[]> {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const results = await db.getAllAsync<any>(
      `SELECT * FROM daily_stats ORDER BY date DESC LIMIT 30`
    );
    
    return results.map(result => ({
      id: result.id,
      date: result.date,
      missionVariables: JSON.parse(result.mission_variables || '[]'),
      sleep: {
        totalDurationSeconds: result.sleep_total_duration_seconds,
        awakeSeconds: result.sleep_awake_seconds,
        remSeconds: result.sleep_rem_seconds,
        coreSeconds: result.sleep_core_seconds,
        deepSeconds: result.sleep_deep_seconds,
        score: result.sleep_score,
        source: result.sleep_source,
      },
      activity: {
        steps: result.activity_steps,
        activeCalories: result.activity_active_calories,
        activeMinutes: result.activity_active_minutes,
        restingCalories: result.activity_resting_calories || 1500,
        workouts: result.activity_workouts ? JSON.parse(result.activity_workouts) : [],
      },
      biometrics: {
        hrv: result.biometrics_hrv,
        restingHeartRate: result.biometrics_resting_heart_rate,
        respiratoryRate: result.biometrics_respiratory_rate,
        vo2Max: result.biometrics_vo2_max,
        oxygenSaturation: result.biometrics_oxygen_saturation,
        bloodGlucose: result.biometrics_blood_glucose,
      },
      stats: {
        vitality: result.stats_vitality,
        vitalityZScore: result.stats_vitality_z_score,
        isVitalityEstimated: !!result.stats_is_vitality_estimated,
        adaptiveCapacity: {
          current: result.stats_adaptive_capacity_current,
          max: result.stats_adaptive_capacity_max,
        },
        physiologicalLoad: result.stats_physiological_load,
        alignmentScore: result.stats_alignment_score,
        alignmentStatus: result.alignment_status as 'ALIGNED' | 'MISALIGNED' | undefined,
        consistency: result.stats_consistency,
        shieldsBreached: !!result.stats_shields_breached,
        systemStatus: {
          axes: {
            metabolic: result.axis_metabolic,
            mechanical: result.axis_mechanical,
            neural: result.axis_neural,
            recovery: result.axis_recovery,
            regulation: result.axis_regulation,
          },
          current_state: result.system_state,
          active_lens: result.active_lens,
          state_confidence: result.state_confidence,
          archetype_confidence: result.archetype_confidence,
          valid_from: result.valid_from,
          valid_to: result.valid_to,
        },
        trends: result.recovery_trend ? {
          recovery_trend: result.recovery_trend,
          load_trend: result.load_trend,
        } : undefined,
      },
      dailySummary: result.daily_summary,
      activeSession: result.active_session ? JSON.parse(result.active_session) : undefined,
      logicContract: result.logic_contract ? JSON.parse(result.logic_contract) : undefined,
      oracleState: result.oracle_state ? JSON.parse(result.oracle_state) : undefined,
    }));
  } catch (error) {
    console.error('[Database] Error getting 30-day history:', error);
    return [];
  }
}

/**
 * Update alignment status for a day
 */
export async function updateAlignmentStatus(
  date: string, 
  status: 'ALIGNED' | 'MISALIGNED'
): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  // First check if alignment_status column exists, add it if not
  try {
    await db.runAsync(
      `ALTER TABLE daily_stats ADD COLUMN alignment_status TEXT`,
    );
  } catch (e) {
    // Column already exists
  }
  
  await db.runAsync(
    `UPDATE daily_stats SET alignment_status = ? WHERE date = ?`,
    [status, date]
  );
  console.log(`[Database] Alignment status updated: ${date} = ${status}`);
}

/**
 * Reset the entire database (Danger Zone)
 * Clears all data and flags to simulate a fresh install
 */
export async function resetDatabase(): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  try {
    // Drop all tables to force recreation on next init
    await db.execAsync(`
      DROP TABLE IF EXISTS daily_stats;
      DROP TABLE IF EXISTS system_storage;
      DROP TABLE IF EXISTS sessions;
      DROP TABLE IF EXISTS smart_cards;
      DROP TABLE IF EXISTS workout_logs;
    `);
    
    console.log('[Database] System Reset Complete - All Tables Dropped');
    
    // Verify tables are gone
    const result = await db.getAllAsync(`
      SELECT name FROM sqlite_master WHERE type='table' AND name IN ('daily_stats', 'system_storage', 'sessions', 'smart_cards', 'workout_logs');
    `);
    console.log('[Database] Remaining tables after reset:', result);
    
  } catch (error) {
    console.error('[Database] Reset Failed:', error);
    throw error;
  }
}

// ============================================
// SMART CARDS PERSISTENCE (PRD Addendum)
// ============================================

/**
 * Initialize Smart Cards tables
 */
export async function initSmartCardsTables(): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  await db.execAsync(`
    -- Smart Cards Ledger
    CREATE TABLE IF NOT EXISTS smart_cards (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      priority INTEGER DEFAULT 50,
      payload TEXT,
      dismiss_policy TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      dismissed_at TEXT,
      completed_at TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_smart_cards_date ON smart_cards(date);
    CREATE INDEX IF NOT EXISTS idx_smart_cards_status ON smart_cards(status);
    
    -- Workout Logs
    CREATE TABLE IF NOT EXISTS workout_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      workout_id TEXT,
      note TEXT,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON workout_logs(date);
  `);
  
  console.log('[Database] Smart Cards tables initialized');
}

/**
 * Save or update a Smart Card
 */
export async function saveSmartCard(card: SmartCard): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  await db.runAsync(
    `INSERT OR REPLACE INTO smart_cards (
      id, date, type, status, priority, payload, dismiss_policy,
      created_at, updated_at, dismissed_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      card.id,
      card.date,
      card.type,
      card.status,
      card.priority,
      JSON.stringify(card.payload),
      card.dismissPolicy || null,
      card.created_at,
      new Date().toISOString(),
      card.dismissed_at || null,
      card.completed_at || null
    ]
  );
}

/**
 * Get Smart Card by ID
 */
export async function getSmartCard(id: string): Promise<SmartCard | null> {
  if (!db) throw new Error('Database not initialized');
  
  const result = await db.getFirstAsync<any>(
    'SELECT * FROM smart_cards WHERE id = ?',
    [id]
  );
  
  if (!result) return null;
  
  return {
    id: result.id,
    date: result.date,
    type: result.type as SmartCardType,
    status: result.status as SmartCardStatus,
    priority: result.priority,
    payload: JSON.parse(result.payload),
    dismissPolicy: result.dismiss_policy,
    created_at: result.created_at,
    updated_at: result.updated_at,
    dismissed_at: result.dismissed_at,
    completed_at: result.completed_at
  };
}

/**
 * Get all Smart Cards for a date
 */
export async function getSmartCardsForDate(date: string): Promise<SmartCard[]> {
  if (!db) throw new Error('Database not initialized');
  
  const results = await db.getAllAsync<any>(
    'SELECT * FROM smart_cards WHERE date = ? ORDER BY priority DESC, created_at ASC',
    [date]
  );
  
  return results.map(result => ({
    id: result.id,
    date: result.date,
    type: result.type as SmartCardType,
    status: result.status as SmartCardStatus,
    priority: result.priority,
    payload: JSON.parse(result.payload),
    dismissPolicy: result.dismiss_policy,
    created_at: result.created_at,
    updated_at: result.updated_at,
    dismissed_at: result.dismissed_at,
    completed_at: result.completed_at
  }));
}

/**
 * Get active Smart Cards (not completed, respecting dismiss policy)
 */
export async function getActiveSmartCards(date: string): Promise<SmartCard[]> {
  if (!db) throw new Error('Database not initialized');
  
  // Get all cards that are ACTIVE or DISMISSED with resurface policy
  const results = await db.getAllAsync<any>(
    `SELECT * FROM smart_cards 
     WHERE (date = ? AND status = 'ACTIVE')
        OR (status = 'DISMISSED' AND dismiss_policy = 'RESURFACE_DAILY' AND date < ?)
     ORDER BY priority DESC, created_at ASC`,
    [date, date]
  );
  
  return results.map(result => ({
    id: result.id,
    date: result.date,
    type: result.type as SmartCardType,
    status: result.status as SmartCardStatus,
    priority: result.priority,
    payload: JSON.parse(result.payload),
    dismissPolicy: result.dismiss_policy,
    created_at: result.created_at,
    updated_at: result.updated_at,
    dismissed_at: result.dismissed_at,
    completed_at: result.completed_at
  }));
}

/**
 * Update Smart Card status
 */
export async function updateSmartCardStatus(
  id: string, 
  status: SmartCardStatus,
  payload?: SmartCardPayload
): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  const now = new Date().toISOString();
  const statusTimestamp = status === 'DISMISSED' ? 'dismissed_at' : 
                          status === 'COMPLETED' ? 'completed_at' : null;
  
  if (payload) {
    await db.runAsync(
      `UPDATE smart_cards SET status = ?, payload = ?, updated_at = ?${statusTimestamp ? `, ${statusTimestamp} = ?` : ''} WHERE id = ?`,
      statusTimestamp 
        ? [status, JSON.stringify(payload), now, now, id]
        : [status, JSON.stringify(payload), now, id]
    );
  } else {
    await db.runAsync(
      `UPDATE smart_cards SET status = ?, updated_at = ?${statusTimestamp ? `, ${statusTimestamp} = ?` : ''} WHERE id = ?`,
      statusTimestamp
        ? [status, now, now, id]
        : [status, now, id]
    );
  }
}

/**
 * Check if a card of type exists for today (not completed)
 */
export async function hasActiveCardOfType(date: string, type: SmartCardType): Promise<boolean> {
  if (!db) throw new Error('Database not initialized');
  
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM smart_cards 
     WHERE date = ? AND type = ? AND status != 'COMPLETED'`,
    [date, type]
  );
  
  return (result?.count || 0) > 0;
}

/**
 * Check if a card was completed today
 */
export async function wasCardCompletedToday(date: string, type: SmartCardType): Promise<boolean> {
  if (!db) throw new Error('Database not initialized');
  
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM smart_cards 
     WHERE date = ? AND type = ? AND status = 'COMPLETED'`,
    [date, type]
  );
  
  return (result?.count || 0) > 0;
}

// ============================================
// WORKOUT LOGS
// ============================================

/**
 * Save a workout log
 */
export async function saveWorkoutLog(log: WorkoutLog): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  await db.runAsync(
    `INSERT OR REPLACE INTO workout_logs (id, date, workout_id, note, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      log.id,
      log.date,
      log.workoutId || null,
      log.note,
      log.details ? JSON.stringify(log.details) : null,
      log.created_at
    ]
  );
}

/**
 * Get workout logs for a date
 */
export async function getWorkoutLogsForDate(date: string): Promise<WorkoutLog[]> {
  if (!db) throw new Error('Database not initialized');
  
  const results = await db.getAllAsync<any>(
    'SELECT * FROM workout_logs WHERE date = ? ORDER BY created_at DESC',
    [date]
  );
  
  return results.map(r => ({
    id: r.id,
    date: r.date,
    workoutId: r.workout_id,
    note: r.note,
    details: r.details ? JSON.parse(r.details) : undefined,
    created_at: r.created_at
  }));
}

/**
 * Check if workout has been logged
 */
export async function isWorkoutLogged(workoutId: string): Promise<boolean> {
  if (!db) throw new Error('Database not initialized');
  
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM workout_logs WHERE workout_id = ?',
    [workoutId]
  );
  
  return (result?.count || 0) > 0;
}

// ============================================
// OPERATOR GOALS
// ============================================

/**
 * Save operator goals
 */
export async function saveOperatorGoals(goals: OperatorGoals): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  await db.runAsync(
    `INSERT OR REPLACE INTO system_storage (key, value) VALUES (?, ?)`,
    ['operator_goals', JSON.stringify(goals)]
  );
}

/**
 * Get operator goals
 */
export async function getOperatorGoals(): Promise<OperatorGoals | null> {
  if (!db) throw new Error('Database not initialized');
  
  const result = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM system_storage WHERE key = ?',
    ['operator_goals']
  );
  
  return result ? JSON.parse(result.value) : null;
}

/**
 * Get count of recent workout logs (for suggestion eligibility)
 */
export async function getRecentWorkoutLogCount(days: number = 7): Promise<number> {
  if (!db) throw new Error('Database not initialized');
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoff = cutoffDate.toISOString().split('T')[0];
  
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM workout_logs WHERE date >= ?',
    [cutoff]
  );
  
  return result?.count || 0;
}
