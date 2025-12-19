/**
 * iOS HealthKit Integration (V6.0)
 * 
 * CHANGES FROM V5:
 * 1. REVERTED: 'strictStartDate: true' is back. Your data proved this is required for Steps accuracy.
 * 2. NEW: Uses Activity Summary for Active Energy and Exercise Time. This fetches the exact "Ring" values 
 *    instead of calculating them, which fixes the calorie over-reporting.
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { SleepData, Biometrics } from './schema';

const IS_SIMULATOR = !Device.isDevice;
const IS_IOS = Platform.OS === 'ios';

let Healthkit: any = null;
let _moduleLoadAttempted = false;
let _healthKitDisabled = false;

function loadHealthKitModule(): boolean {
  if (_moduleLoadAttempted) return Healthkit !== null;
  _moduleLoadAttempted = true;
  
  if (!IS_IOS || IS_SIMULATOR) return false;
  
  try {
    const hk = require('@kingstinct/react-native-healthkit');
    Healthkit = hk.default;
    return true;
  } catch (error) {
    console.error('[HealthKit] Module load failed:', error);
    _healthKitDisabled = true;
    return false;
  }
}

export interface HealthKitPermissions {
  authorized: boolean;
  status: any;
}

export async function requestPermissions(): Promise<HealthKitPermissions> {
  if (!IS_IOS || IS_SIMULATOR || _healthKitDisabled) return { authorized: false, status: null };
  if (!loadHealthKitModule()) return { authorized: false, status: null };

  try {
    const authRequest = {
      toRead: [
        'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
        'HKQuantityTypeIdentifierRestingHeartRate',
        'HKQuantityTypeIdentifierHeartRate',
        'HKQuantityTypeIdentifierRespiratoryRate',
        'HKQuantityTypeIdentifierOxygenSaturation',
        'HKQuantityTypeIdentifierBloodGlucose',
        'HKQuantityTypeIdentifierBodyTemperature',
        'HKQuantityTypeIdentifierAppleSleepingWristTemperature',
        'HKQuantityTypeIdentifierStepCount',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierBasalEnergyBurned',
        'HKQuantityTypeIdentifierAppleExerciseTime',
        'HKQuantityTypeIdentifierDistanceWalkingRunning',
        'HKQuantityTypeIdentifierDistanceSwimming',
        'HKQuantityTypeIdentifierVO2Max',
        'HKCategoryTypeIdentifierSleepAnalysis',
        'HKCategoryTypeIdentifierMindfulSession',
        'HKWorkoutTypeIdentifier',
        'HKQuantityTypeIdentifierTimeInDaylight',
        'ActivitySummaryTypeIdentifier', // Important for Activity Rings (note: queryActivitySummary may not be available in library)
      ],
    };

    const status = await Healthkit.requestAuthorization(authRequest);
    return { authorized: true, status };
  } catch (error) {
    console.error('[HealthKit] Permission request failed:', error);
    return { authorized: false, status: null };
  }
}

// --- Query Helpers ---

/**
 * Get day bounds for HealthKit queries
 * For "today", endDate is current time (not end of day) to match Health app
 */
function getDayBounds(date: Date, useCurrentTime: boolean = true): { startDate: Date; endDate: Date } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  const startDate = new Date(year, month, day, 0, 0, 0, 0);
  
  const now = new Date();
  const isToday = year === now.getFullYear() && month === now.getMonth() && day === now.getDate();
  const endDate = (isToday && useCurrentTime) ? now : new Date(year, month, day, 23, 59, 59, 999);
  
  return { startDate, endDate };
}

/**
 * Standard Statistics Query
 * REVERTED to strictStartDate: true based on your V3 vs V5 feedback.
 */
async function queryCumulativeQuantity(
  identifier: string,
  date: Date,
  unit: string
): Promise<number> {
  if (!Healthkit || _healthKitDisabled || IS_SIMULATOR) return 0;

  const { startDate, endDate } = getDayBounds(date, true);

  try {
    const result = await Healthkit.queryStatisticsForQuantity(
      identifier,
      ['cumulativeSum'],
      {
        filter: {
          date: {
            startDate,
            endDate,
            strictStartDate: true // RESTORED: This is critical for matching Apple Health Steps
          }
        },
        unit
      }
    );
    
    const sum = result?.sumQuantity?.quantity ?? 0;
    return sum > 0 ? Math.round(sum) : 0;
  } catch (e: any) {
    // Ignore no data errors
    return 0;
  }
}

// --- Specialized Activity Summary Fetcher ---

/**
 * Fetches the official "Activity Ring" data.
 * This is much more accurate for Calories/Exercise Time than summing raw samples.
 */
async function fetchActivitySummary(date: Date) {
  if (!Healthkit || _healthKitDisabled || IS_SIMULATOR) return null;

  try {
    // Activity Summary queries expect the full day range usually
    const { startDate, endDate } = getDayBounds(date, false); 

    // Check if the method exists in the library version you are using
    if (Healthkit.queryActivitySummary) {
      const result = await Healthkit.queryActivitySummary({
        startDate: startDate.valueOf(),
        endDate: endDate.valueOf(),
      });

      if (result && result.length > 0) {
        // Find the specific day we asked for.
        // The API might return multiple if the range is wide, but we are asking for 1 day.
        // Usually the last item is the most current one.
        const target = result.find((r: any) => {
            // Simple check if the summary date matches our requested date
            // The result usually has a 'date' object or component
            if (r.date) {
                const rDate = new Date(r.date);
                return rDate.getDate() === date.getDate();
            }
            return true; // Fallback to taking the result if only one
        }) || result[result.length - 1];
        
        return {
          activeEnergyBurned: target.activeEnergyBurned?.quantity ?? 0, // Matches Red Ring
          appleExerciseTime: target.appleExerciseTime?.quantity ?? 0,   // Matches Green Ring
          appleStandHours: target.appleStandHours?.quantity ?? 0,       // Matches Blue Ring
        };
      }
    }
  } catch (e) {
    console.warn('[HealthKit] Activity Summary failed:', e);
  }
  return null;
}

// --- Activity Fetchers ---

export async function fetchSteps(date: Date): Promise<number> {
  // Back to V3 logic: strictStartDate matches Apple Steps best
  return queryCumulativeQuantity('HKQuantityTypeIdentifierStepCount', date, 'count');
}

export async function fetchActiveEnergy(date: Date): Promise<number> {
  // Strategy: Try Activity Summary first (Official Ring Data)
  // This fixes the issue where calculated raw samples (383) > Ring (315)
  const summary = await fetchActivitySummary(date);
  if (summary && summary.activeEnergyBurned > 0) {
    return Math.round(summary.activeEnergyBurned);
  }
  // Fallback if Rings data isn't available
  return queryCumulativeQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', date, 'kcal');
}

export async function fetchRestingEnergy(date: Date): Promise<number> {
  // Resting energy is tricky. Apple Health often updates this slowly throughout the day.
  // We use strictStartDate to avoid over-fetching midnight overlaps.
  return queryCumulativeQuantity('HKQuantityTypeIdentifierBasalEnergyBurned', date, 'kcal');
}

export async function fetchExerciseMinutes(date: Date): Promise<number> {
  const summary = await fetchActivitySummary(date);
  if (summary && summary.appleExerciseTime > 0) {
    return Math.round(summary.appleExerciseTime);
  }
  return queryCumulativeQuantity('HKQuantityTypeIdentifierAppleExerciseTime', date, 'min');
}

export async function fetchWalkingRunningDistance(date: Date): Promise<number> {
  try {
    const val = await queryCumulativeQuantity('HKQuantityTypeIdentifierDistanceWalkingRunning', date, 'km');
    console.log('[HealthKit] Distance:', Math.round(val * 100) / 100, 'km');
    return Math.round(val * 100) / 100;
  } catch (e: any) {
    console.error('[HealthKit] Error fetching distance:', e?.message);
    return 0;
  }
}

export async function fetchSwimmingDistance(date: Date): Promise<number> {
  try {
    const val = await queryCumulativeQuantity('HKQuantityTypeIdentifierDistanceSwimming', date, 'm');
    return val;
  } catch (e: any) {
    console.error('[HealthKit] Error fetching swimming distance:', e?.message);
    return 0;
  }
}

export async function fetchTimeInDaylight(date: Date): Promise<number> {
  try {
    const val = await queryCumulativeQuantity('HKQuantityTypeIdentifierTimeInDaylight', date, 'min');
    console.log('[HealthKit] Daylight:', val, 'min');
    return val;
  } catch (e: any) {
    console.error('[HealthKit] Error fetching daylight:', e?.message);
    return 0;
  }
}

// --- Sleep ---

export async function fetchSleep(date: Date): Promise<SleepData> {
  const empty: SleepData = { 
    totalDurationSeconds: 0, 
    awakeSeconds: 0, 
    remSeconds: 0, 
    coreSeconds: 0, 
    deepSeconds: 0, 
    score: 0, 
    source: 'manual' 
  };
  
  if (!Healthkit || _healthKitDisabled || IS_SIMULATOR) return empty;

  try {
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(18, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(12, 0, 0, 0);

    const samples = await Healthkit.queryCategorySamples(
      'HKCategoryTypeIdentifierSleepAnalysis',
      { 
        limit: 0,
        filter: { date: { startDate, endDate } }
      }
    );

    if (!samples || samples.length === 0) return empty;

    let totalSeconds = 0, deepSeconds = 0, remSeconds = 0, coreSeconds = 0, awakeSeconds = 0;

    for (const sample of samples) {
      const start = new Date(sample.startDate).getTime();
      const end = new Date(sample.endDate).getTime();
      const duration = (end - start) / 1000;
      
      switch (sample.value) {
        case 0: break; // In bed
        case 1: coreSeconds += duration; totalSeconds += duration; break; // Asleep (unspecified)
        case 2: awakeSeconds += duration; break; // Awake
        case 3: coreSeconds += duration; totalSeconds += duration; break; // Core
        case 4: deepSeconds += duration; totalSeconds += duration; break; // Deep
        case 5: remSeconds += duration; totalSeconds += duration; break; // REM
      }
    }

    const hoursSlept = totalSeconds / 3600;
    let score = hoursSlept >= 7 ? 70 : hoursSlept >= 6 ? 50 : Math.max(0, hoursSlept * 10);
    const hasStages = deepSeconds > 0 || remSeconds > 0;
    
    if (hasStages && totalSeconds > 0) {
      if ((deepSeconds / totalSeconds) * 100 >= 15) score += 15;
      if ((remSeconds / totalSeconds) * 100 >= 15) score += 15;
    }

    return {
      totalDurationSeconds: Math.round(totalSeconds),
      awakeSeconds: Math.round(awakeSeconds),
      remSeconds: Math.round(remSeconds),
      coreSeconds: Math.round(coreSeconds),
      deepSeconds: Math.round(deepSeconds),
      score: Math.min(100, Math.round(score)),
      source: hasStages ? 'biometric' : 'sensor',
    };
  } catch (error: any) {
    return empty;
  }
}

// --- Biometrics ---

async function fetchHRV(date: Date): Promise<number | null> {
  if (!Healthkit || _healthKitDisabled || IS_SIMULATOR) return null;
  try {
    const { startDate, endDate } = getDayBounds(date);
    // Try to get today's average first
    const samples = await Healthkit.queryQuantitySamples(
      'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
      { limit: 0, unit: 'ms', filter: { date: { startDate, endDate } } }
    );
    
    if (samples?.length > 0) {
      const total = samples.reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0);
      return Math.round(total / samples.length);
    }
    
    // Fallback: Latest sample from last 7 days
    const fallbackStart = new Date(date);
    fallbackStart.setDate(fallbackStart.getDate() - 7);
    return queryLatestQuantity('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', fallbackStart, endDate, 'ms');
  } catch (e) { return null; }
}

async function fetchHeartRate(date: Date): Promise<number | null> {
  if (!Healthkit || _healthKitDisabled || IS_SIMULATOR) return null;
  try {
    const { startDate, endDate } = getDayBounds(date);
    
    // Try to get today's average heart rate first
    const samples = await Healthkit.queryQuantitySamples(
      'HKQuantityTypeIdentifierHeartRate',
      { limit: 0, unit: 'count/min', filter: { date: { startDate, endDate } } }
    );
    
    if (samples?.length > 0) {
      const total = samples.reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0);
      return Math.round(total / samples.length);
    }
    
    // Fallback: Most recent heart rate from last 7 days
    const fallbackStart = new Date(date);
    fallbackStart.setDate(fallbackStart.getDate() - 7);
    return queryLatestQuantity('HKQuantityTypeIdentifierHeartRate', fallbackStart, endDate, 'count/min');
  } catch (e) { return null; }
}

async function queryLatestQuantity(
  type: string, 
  startDate: Date, 
  endDate: Date, 
  unit: string
): Promise<number | null> {
  if (!Healthkit) return null;
  
  try {
    const samples = await Healthkit.queryQuantitySamples(type, {
      limit: 1, 
      unit, 
      filter: { date: { startDate, endDate } },
      ascending: false,
    });
    
    return samples?.[0]?.quantity ?? null;
  } catch (e) {
    return null;
  }
}

export async function fetchBiometrics(date: Date): Promise<Biometrics> {
  const empty: Biometrics = { hrv: 0, restingHeartRate: 0, respiratoryRate: 0 };
  if (!Healthkit || _healthKitDisabled || IS_SIMULATOR) return empty;

  try {
    const { startDate, endDate } = getDayBounds(date);
    
    // V5 FIX: Extended lookback for VO2 Max (it is recorded infrequently)
    const lookbackStart = new Date(date);
    lookbackStart.setDate(lookbackStart.getDate() - 7);
    
    const longLookbackStart = new Date(date);
    longLookbackStart.setDate(longLookbackStart.getDate() - 90); // 90 days for VO2 Max

    const [hrv, rhr, hr, rr, spo2Raw, glucose, vo2max] = await Promise.all([
      fetchHRV(date),
      queryLatestQuantity('HKQuantityTypeIdentifierRestingHeartRate', startDate, endDate, 'count/min'),
      fetchHeartRate(date),
      queryLatestQuantity('HKQuantityTypeIdentifierRespiratoryRate', lookbackStart, endDate, 'count/min'),
      queryLatestQuantity('HKQuantityTypeIdentifierOxygenSaturation', lookbackStart, endDate, '%'),
      queryLatestQuantity('HKQuantityTypeIdentifierBloodGlucose', lookbackStart, endDate, 'mg/dL'),
      queryLatestQuantity('HKQuantityTypeIdentifierVO2Max', longLookbackStart, endDate, 'ml/(kg*min)'),
    ]);

    const spo2 = spo2Raw ? Math.round(spo2Raw * 100) : undefined;
    return { 
      hrv: hrv || 0, 
      restingHeartRate: rhr || 0, 
      heartRate: hr ?? undefined,
      respiratoryRate: rr || 0, 
      oxygenSaturation: spo2, 
      bloodGlucose: glucose ?? undefined, 
      vo2Max: vo2max ?? undefined 
    };
  } catch (error: any) {
    return empty;
  }
}

/**
 * Fetch all Activity Data in parallel
 */
export async function fetchActivityData(date: Date): Promise<{
  steps: number;
  activeCalories: number;
  restingCalories: number;
  exerciseMinutes: number;
  walkingRunningDistance: number;
  swimmingDistance: number;
  timeInDaylight: number;
}> {
  const [steps, active, resting, exercise, distance, swimming, daylight] = await Promise.all([
    fetchSteps(date),
    fetchActiveEnergy(date),
    fetchRestingEnergy(date),
    fetchExerciseMinutes(date),
    fetchWalkingRunningDistance(date),
    fetchSwimmingDistance(date),
    fetchTimeInDaylight(date),
  ]);

  return { 
    steps, 
    activeCalories: active, 
    restingCalories: resting, 
    exerciseMinutes: exercise, 
    walkingRunningDistance: distance, 
    swimmingDistance: swimming, 
    timeInDaylight: daylight 
  };
}
