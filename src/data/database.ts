/**
 * Local Database Layer (V3.0)
 * Uses SQLite for on-device storage of health data
 */

import * as SQLite from 'expo-sqlite';
import { OperatorDailyStats, SystemStatus } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<void> {
  try {
    db = await SQLite.openDatabaseAsync('sentient_v3.db'); // New DB name for V3
    await createTables();
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
      activity_active_minutes INTEGER,
      activity_mindful_minutes INTEGER,
      
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
      stats_adaptive_capacity_current INTEGER, -- Renamed from mana
      stats_adaptive_capacity_max INTEGER,
      stats_physiological_load INTEGER,
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
  `);
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
        activity_steps, activity_active_calories, activity_active_minutes, activity_mindful_minutes,
        biometrics_hrv, biometrics_resting_heart_rate, biometrics_respiratory_rate,
        biometrics_skin_temperature, biometrics_body_temperature, biometrics_sleeping_wrist_temperature,
        biometrics_vo2_max, biometrics_oxygen_saturation, biometrics_blood_glucose,
        stats_vitality, stats_vitality_z_score, stats_is_vitality_estimated,
        stats_adaptive_capacity_current, stats_adaptive_capacity_max,
        stats_physiological_load, stats_alignment_score, stats_consistency,
        stats_shields_breached,
        axis_metabolic, axis_mechanical, axis_neural, axis_recovery, axis_regulation,
        system_state, active_lens,
        state_confidence, archetype_confidence, valid_from, valid_to,
        recovery_trend, load_trend,
        daily_summary, active_session, logic_contract, oracle_state,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        stats.activity.activeMinutes,
        stats.mindfulMinutes || 0,
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
        stats.stats.adaptiveCapacity.current,
        stats.stats.adaptiveCapacity.max,
        stats.stats.physiologicalLoad,
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
        restingCalories: 1500, // Default for now
        workouts: [],
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
        adaptiveCapacity: {
            current: result.stats_adaptive_capacity_current,
            max: result.stats_adaptive_capacity_max,
        },
        physiologicalLoad: result.stats_physiological_load,
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
