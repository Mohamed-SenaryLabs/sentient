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
import { SleepData, Biometrics, Workout } from './schema';

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

/**
 * Request HealthKit permissions
 * 
 * IMPORTANT: iOS does NOT re-prompt for new data types if permissions were already granted.
 * If workouts show 0 calories, manually check:
 * iOS Settings > Health > Data Access & Devices > [App Name] > Active Energy (must be ON)
 * 
 * Even though 'HKQuantityTypeIdentifierActiveEnergyBurned' is requested here, iOS may have
 * silently denied it if permissions were granted before this identifier was added.
 */
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
        'HKQuantityTypeIdentifierActiveEnergyBurned', // Required for workout calories
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

/**
 * Fetch sleep for a specific date (single day only)
 */
async function fetchSingleDaySleep(date: Date): Promise<SleepData> {
  const empty: SleepData = { 
    totalDurationSeconds: 0, 
    awakeSeconds: 0, 
    remSeconds: 0, 
    coreSeconds: 0, 
    deepSeconds: 0, 
    score: 0, 
    source: 'MANUAL', 
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
      source: 'MEASURED',
    };
  } catch (error: any) {
    return empty;
  }
}

/**
 * Fetch sleep data for today, falling back to 7-day average if unavailable
 */
export async function fetchSleep(date: Date): Promise<SleepData> {
  const data = await fetchSingleDaySleep(date);
  


  if (data.totalDurationSeconds > 0) {
      return data;
  }

  // Fallback to weekly average
  console.log('[HealthKit] No sleep data for today, fetching 7-day average...');
  return await fetchWeeklySleepAverage(date);
}

async function fetchWeeklySleepAverage(endDate: Date): Promise<SleepData> {
    const daysToLogin = 7;
    let totalDuration = 0;
    let totalScore = 0;
    let daysWithData = 0;
    
    // Scan last 7 days (skipping today since we already checked it)
    for (let i = 1; i <= daysToLogin; i++) {
        const d = new Date(endDate);
        d.setDate(d.getDate() - i);
        const daily = await fetchSingleDaySleep(d);
        if (daily.totalDurationSeconds > 0) {
            totalDuration += daily.totalDurationSeconds;
            totalScore += daily.score;
            daysWithData++;
        }
    }

    if (daysWithData === 0) {
        return { 
            totalDurationSeconds: 0, awakeSeconds: 0, remSeconds: 0, 
            coreSeconds: 0, deepSeconds: 0, score: 0, source: 'MANUAL' 
        };
    }

    return {
        totalDurationSeconds: Math.round(totalDuration / daysWithData),
        awakeSeconds: 0, // Averages don't preserve stages accurately
        remSeconds: 0,
        coreSeconds: 0,
        deepSeconds: 0,
        score: Math.round(totalScore / daysWithData),
        source: 'ESTIMATED_7D'
    };
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

export async function fetchStress(date: Date, baselineHrv: number): Promise<{ avg: number; highest: number; lowest: number; time_elevated_pct: number } | undefined> {
   if (!Healthkit || _healthKitDisabled || IS_SIMULATOR) return undefined;
   try {
     const { startDate, endDate } = getDayBounds(date);
     // Need granular HRV samples
     const samples = await Healthkit.queryQuantitySamples(
        'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
        { limit: 0, unit: 'ms', filter: { date: { startDate, endDate } } }
     );

     if (!samples || samples.length === 0) return undefined;

     // Extract values
     const values = samples.map((s: any) => s.quantity);
     
     // 1. Calculate Stats
     const sum = values.reduce((a: number, b: number) => a + b, 0);
     const avgHrv = sum / values.length;
     const maxHrv = Math.max(...values); // Lowest Stress
     const minHrv = Math.min(...values); // Highest Stress

     // 2. Calculate Elevation
     // Stress is Elevated when HRV is significantly LOWER than baseline.
     // Threshold: 10% below baseline (or use SD if available, but simple % is robust fallback)
     const stressThreshold = baselineHrv > 0 ? baselineHrv * 0.9 : 40; 
     const elevatedSamples = values.filter((v: number) => v < stressThreshold).length;
     const time_elevated_pct = Math.round((elevatedSamples / values.length) * 100);

     // Return Stress Metrics (Inverse of HRV)
     // For "Stress Level" generic mapping: 100 - HRV? No, stick to raw for now or defined range.
     // Accuracy Spec just asks for time_elevated_pct. 
     // We will pass the HRV values but interpreted as Stress context if needed.
     
     return {
         avg: Math.round(avgHrv),
         highest: Math.round(minHrv), // Low HRV = High Stress
         lowest: Math.round(maxHrv),  // High HRV = Low Stress
         time_elevated_pct
     };

   } catch (e) { console.error('Error fetching stress:', e); return undefined; }
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


// --- Workouts ---

// HealthKit Activity Type Enum Mapping
// HealthKit Activity Type Enum Mapping (Comprehensive)
const ActivityTypeMap: Record<number, string> = {
  1: 'American Football',
  2: 'Archery',
  3: 'Australian Football',
  4: 'Badminton',
  5: 'Baseball',
  6: 'Basketball',
  7: 'Bowling',
  8: 'Boxing',
  9: 'Climbing',
  10: 'Core Training',
  11: 'Cricket',
  12: 'Cross Training',
  13: 'Cycling',
  14: 'Dance',
  16: 'Elliptical',
  17: 'Equestrian Sports',
  18: 'Fencing',
  19: 'Fishing',
  20: 'Functional Strength Training',
  21: 'Golf',
  22: 'Gymnastics',
  23: 'Handball',
  24: 'Hiking',
  25: 'Hockey',
  26: 'Hunting',
  27: 'Lacrosse',
  28: 'Martial Arts',
  29: 'Mind and Body',
  30: 'Paddle Sports',
  31: 'Play',
  32: 'Preparation and Recovery',
  33: 'Pilates',
  34: 'Racquetball',
  35: 'Rowing',
  36: 'Rugby',
  37: 'Running',
  38: 'Sailing',
  39: 'Skating Sports',
  40: 'Snow Sports',
  41: 'Soccer',
  42: 'Softball',
  43: 'Squash',
  44: 'Stair Climbing',
  45: 'Surfing Sports',
  46: 'Swimming',
  47: 'Table Tennis',
  48: 'Tennis',
  49: 'Track and Field',
  50: 'Traditional Strength Training',
  51: 'Volleyball',
  52: 'Walking',
  53: 'Water Fitness',
  54: 'Water Polo',
  55: 'Water Sports',
  56: 'Wrestling',
  57: 'Yoga',
  58: 'Barre',
  59: 'Core Training',
  60: 'Cross Country Skiing',
  61: 'Downhill Skiing',
  62: 'Flexibility',
  63: 'High Intensity Interval Training',
  64: 'Jump Rope',
  65: 'Kickboxing',
  66: 'Pilates',
  67: 'Snowboarding',
  68: 'Stairs',
  69: 'Step Training',
  70: 'Wheelchair Walk Pace',
  71: 'Wheelchair Run Pace',
  72: 'Tai Chi',
  73: 'Mixed Cardio',
  74: 'Hand Cycling',
  75: 'Disc Sports',
  76: 'Fitness Gaming',
  77: 'Cardio Dance',
  78: 'Social Dance',
  79: 'Pickleball',
  80: 'Cooldown',
  82: 'Swim Bike Run',
  83: 'Transition',
  84: 'Underwater',
  3000: 'Other'
};

function formatActivityName(rawType: any): string {
    if (typeof rawType === 'number') {
        return ActivityTypeMap[rawType] || `Workout (${rawType})`;
    }
    if (typeof rawType === 'string') {
         const clean = rawType.replace('HKWorkoutActivityType', '');
         return clean.replace(/([A-Z])/g, ' $1').trim();
    }
    return 'Workout';
}

// Helper to handle { quantity: 100, unit: 'kcal' } OR simple numbers
function getSafeValue(field: any): number {
  if (typeof field === 'number') return field;
  
  // Handle nested HKQuantity objects
  if (typeof field === 'object' && field !== null) {
      if (typeof field.quantity === 'number') return field.quantity;
      if (typeof field.value === 'number') return field.value;
  }
  return 0;
}

/**
 * Query Active Energy Burned for a specific time interval
 * Used to "hydrate" workout objects that are missing totalEnergyBurned
 * (due to a bug in the HealthKit library's native bridge)
 * 
 * NOTE: Minor rounding differences observed vs Apple Health app (e.g., 339 vs 337 kcal)
 * Possible causes to investigate:
 * - Timezone offset affecting query window boundaries
 * - Apple Health may use different aggregation (workout-attributed vs time-window sum)
 * - Rounding at different precision points (we round at the end, Apple may round per-sample)
 * - strictStartDate behavior affecting which samples are included
 */
async function queryEnergyForInterval(startDateInput: string | Date, endDateInput: string | Date): Promise<number> {
  if (!Healthkit || _healthKitDisabled) return 0;
  
  // Convert to Date objects (matching queryCumulativeQuantity format)
  const startDate = new Date(startDateInput);
  const endDate = new Date(endDateInput);
  
  try {
    const result = await Healthkit.queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      ['cumulativeSum'],
      {
        filter: {
          date: {
            startDate,
            endDate,
            // Don't use strictStartDate - we want all energy in this window
          }
        },
        unit: 'kcal'
      }
    );
    
    const calories = result?.sumQuantity?.quantity ?? 0;
    return calories > 0 ? Math.round(calories) : 0;
  } catch (e) {
    console.warn('[HealthKit] queryEnergyForInterval failed:', e);
    return 0;
  }
}

async function queryAvgCadenceForInterval(startDate: Date, endDate: Date): Promise<number | undefined> {
  if (!Healthkit || _healthKitDisabled) return undefined;
  try {
    const result = await Healthkit.queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierCyclingCadence',
      ['discreteAverage'],
      {
        filter: {
          date: { startDate, endDate }
        },
        unit: 'count/min'
      }
    );
    return result?.averageQuantity?.quantity ?? undefined;
  } catch (e) {
    return undefined;
  }
}

async function queryHeartRateStatsForInterval(startDate: Date, endDate: Date): Promise<{
  avg?: number;
  min?: number;
  max?: number;
}> {
  if (!Healthkit || _healthKitDisabled) return {};
  try {
    const result = await Healthkit.queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierHeartRate',
      ['discreteAverage', 'discreteMin', 'discreteMax'],
      {
        filter: {
          date: { startDate, endDate }
        },
        unit: 'count/min'
      }
    );
    return {
      avg: result?.averageQuantity?.quantity ? Math.round(result.averageQuantity.quantity) : undefined,
      min: result?.minimumQuantity?.quantity ? Math.round(result.minimumQuantity.quantity) : undefined,
      max: result?.maximumQuantity?.quantity ? Math.round(result.maximumQuantity.quantity) : undefined,
    };
  } catch (e) {
    return {};
  }
}

/**
 * Query heart rate samples for a time interval
 * Returns individual samples with timestamp and value
 */
export async function queryHeartRateSamplesForInterval(
  startDate: Date,
  endDate: Date
): Promise<Array<{ timestamp: Date; value: number }>> {
  if (!Healthkit || _healthKitDisabled) return [];
  try {
    const samples = await Healthkit.queryQuantitySamples(
      'HKQuantityTypeIdentifierHeartRate',
      {
        limit: 0, // 0 = no limit
        unit: 'count/min',
        filter: {
          date: { startDate, endDate }
        }
      }
    );
    
    if (!samples || samples.length === 0) return [];
    
    return samples.map((s: any) => ({
      timestamp: new Date(s.startDate || s.date),
      value: Math.round(s.quantity || 0)
    })).filter((s: { timestamp: Date; value: number }) => s.value > 0);
  } catch (e) {
    console.error('[HealthKit] Error querying HR samples:', e);
    return [];
  }
}

/**
 * Compute histogram bins from HR samples
 * @param samples Array of HR samples with timestamp and value
 * @param binSize BPM bin size (default 5, fallback to 10 if sample count is low)
 * @returns Object with bins, avg, max, and binSize used
 */
export function computeHRHistogram(
  samples: Array<{ timestamp: Date; value: number }>
): {
  bins: Array<{ range: string; minutes: number; seconds: number }>;
  avg: number;
  max: number;
  min: number;
  binSize: number;
} {
  if (samples.length === 0) {
    return { bins: [], avg: 0, max: 0, min: 0, binSize: 5 };
  }
  
  // Determine bin size: 5 bpm default, 10 bpm if sample count is low (< 30 samples)
  const binSize = samples.length < 30 ? 10 : 5;
  
  // Calculate avg, min, max
  const values = samples.map(s => s.value);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const max = Math.max(...values);
  const min = Math.min(...values);
  
  // Determine range bounds (round to nearest binSize)
  const minBin = Math.floor(min / binSize) * binSize;
  const maxBin = Math.ceil(max / binSize) * binSize;
  
  // Create bins
  const binMap = new Map<number, number>(); // bpm -> seconds
  for (let bin = minBin; bin < maxBin; bin += binSize) {
    binMap.set(bin, 0);
  }
  
  // Calculate time in each bin
  // For each sample, determine which bin it belongs to and add its duration
  // Since we have discrete samples, we'll estimate duration between samples
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    const bin = Math.floor(sample.value / binSize) * binSize;
    
    // Calculate duration: time until next sample, or if last sample, use average interval
    let durationSeconds = 0;
    if (i < samples.length - 1) {
      durationSeconds = (samples[i + 1].timestamp.getTime() - sample.timestamp.getTime()) / 1000;
    } else {
      // Last sample: use average interval from previous samples
      if (samples.length > 1) {
        const avgInterval = (samples[samples.length - 1].timestamp.getTime() - samples[0].timestamp.getTime()) / (samples.length - 1) / 1000;
        durationSeconds = avgInterval;
      } else {
        durationSeconds = 60; // Default 1 minute if only one sample
      }
    }
    
    // Clamp duration to reasonable bounds (1 second to 5 minutes)
    durationSeconds = Math.max(1, Math.min(300, durationSeconds));
    
    const current = binMap.get(bin) || 0;
    binMap.set(bin, current + durationSeconds);
  }
  
  // Convert to array format
  const bins = Array.from(binMap.entries())
    .map(([bpm, seconds]) => ({
      range: `${bpm}-${bpm + binSize - 1}`,
      minutes: Math.round((seconds / 60) * 10) / 10, // Round to 1 decimal
      seconds: Math.round(seconds)
    }))
    .sort((a, b) => parseInt(a.range.split('-')[0]) - parseInt(b.range.split('-')[0]));
  
  return { bins, avg, max, min, binSize };
}

/**
 * Fetch workouts with hydration fix
 * The HealthKit library doesn't return totalEnergyBurned in the workout object,
 * so we query Active Energy directly for each workout's time window
 */
export async function fetchWorkouts(date: Date): Promise<Workout[]> {
  if (!Healthkit || _healthKitDisabled || IS_SIMULATOR) return [];

  try {
    const { startDate, endDate } = getDayBounds(date, false);
    
    // Dates at ROOT level (library requirement)
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 100,
      ascending: false,
      energyUnit: 'kcal',
      distanceUnit: 'km',
    };

    const samples = await Healthkit.queryWorkoutSamples(options);

    if (!samples || samples.length === 0) return [];

    // 🛡️ MANUAL FILTER: The flattened options structure sometimes causes
    // HealthKit to ignore the date filter. We manually filter here to be safe.
    const filteredSamples = samples.filter((s: any) => {
        const start = new Date(s.startDate);
        return start >= startDate && start <= endDate;
    });

    if (filteredSamples.length === 0) return [];

    // Use Promise.all to backfill energy in parallel for all workouts
    const hydratedWorkouts = await Promise.all(filteredSamples.map(async (sample: any) => {
      // 1. Activity Name
      const rawType = sample.workoutActivityType || sample.activityType || 0;
      const name = formatActivityName(rawType);
      
      // 2. Duration (Always in seconds)
      const duration = getSafeValue(sample.duration);
      
      // 3. Active Calories - Try direct fields first (in case future library versions fix this)
      let calories = getSafeValue(sample.totalEnergyBurned);
      if (calories === 0) calories = getSafeValue(sample.activeEnergyBurned);
      if (calories === 0) calories = getSafeValue(sample.calories);

      // 🚨 HYDRATION FIX: If still 0, query Active Energy for this workout's exact time window
      // The HealthKit library doesn't return totalEnergyBurned, so we query it directly
      if (calories === 0 && sample.startDate && sample.endDate) {
        calories = await queryEnergyForInterval(sample.startDate, sample.endDate);
      }

      // 4. Distance
      let distance = getSafeValue(sample.totalDistance);
      if (distance === 0) distance = getSafeValue(sample.totalSwimmingStrokeCount);

      // 5. RPM (Cadence) - Specifically for Cycling (Activity ID 13) or Hand Cycling (74)
      let rpm: number | undefined = undefined;
      const cyclingTypes = [13, 74];
      if (cyclingTypes.includes(rawType) && sample.startDate && sample.endDate) {
        rpm = await queryAvgCadenceForInterval(new Date(sample.startDate), new Date(sample.endDate));
      }

      // 6. Heart Rate Statistics
      let hrStats: { avg?: number; min?: number; max?: number } = { avg: undefined, min: undefined, max: undefined };
      if (sample.startDate && sample.endDate) {
        hrStats = await queryHeartRateStatsForInterval(new Date(sample.startDate), new Date(sample.endDate));
      }

      return {
        id: sample.uuid || Math.random().toString(),
        type: name,
        durationSeconds: duration > 0 ? duration : 0,
        activeCalories: Math.round(calories),
        distance: distance > 0 ? distance : undefined,
        startDate: sample.startDate,
        rpm: rpm,
        avgHeartRate: hrStats.avg,
        minHeartRate: hrStats.min,
        maxHeartRate: hrStats.max
      };
    }));

    return hydratedWorkouts;
  } catch (error) {
    console.warn('[HealthKit] Error fetching workouts:', error);
    return [];
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
  workouts: Workout[];
}> {
  const [steps, active, resting, exercise, distance, swimming, daylight, workouts] = await Promise.all([
    fetchSteps(date),
    fetchActiveEnergy(date),
    fetchRestingEnergy(date),
    fetchExerciseMinutes(date),
    fetchWalkingRunningDistance(date),
    fetchSwimmingDistance(date),
    fetchTimeInDaylight(date),
    fetchWorkouts(date),
  ]);



  return { 
    steps, 
    activeCalories: active, 
    restingCalories: resting, 
    exerciseMinutes: exercise, 
    walkingRunningDistance: distance, 
    swimmingDistance: swimming, 
    timeInDaylight: daylight,
    workouts
  };
}

// --- Historical Data for Day Zero Protocol ---

export interface HistoricalDayData {
  date: string; // YYYY-MM-DD
  hrv: number | null;
  rhr: number | null;
  steps: number;
  activeCalories: number;
  sleepSeconds: number;
  sleepScore: number;
  workoutMinutes: number; // NEW
  vo2Max: number | null;  // NEW
  workouts: Workout[];    // NEW - For export granularity
}

export interface HistoricalBaselines {
  days: HistoricalDayData[];
  averages: {
    hrv: number;
    stdDevHrv?: number;
    sampleCountHrv?: number;   // PRD §4.X.1
    coverageHrv?: number;      // PRD §4.X.1 (sampleCount / 30)
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
    workoutMinutes: number;
    vo2Max: number;
  };
  daysFetched: number;
  daysWithData: number;
}

/**
 * Day Zero Protocol: Fetch historical data for instant baselines
 * Queries the past N days of HRV, RHR, Steps, Calories, Sleep, Workouts, and VO2Max
 */
export async function fetchHistoricalData(days: number = 30): Promise<HistoricalBaselines> {

  const emptyResult: HistoricalBaselines = {
    days: [],
    averages: { hrv: 0, stdDevHrv: 0, rhr: 0, stdDevRhr: 0, steps: 0, activeCalories: 0, sleepSeconds: 0, stdDevSleep: 0, workoutMinutes: 0, vo2Max: 0 },
    daysFetched: 0,
    daysWithData: 0
  };

  if (!Healthkit || _healthKitDisabled || IS_SIMULATOR) {
    console.log('[HealthKit] Historical fetch skipped (not available)');
    return emptyResult;
  }

  console.log(`[HealthKit] Day Zero: Fetching ${days} days of historical data...`);

  const results: HistoricalDayData[] = [];
  const today = new Date();

  // Fetch each day in parallel (batch of 7 at a time to avoid overwhelming)
  for (let batchStart = 1; batchStart <= days; batchStart += 7) {
    const batch: Promise<HistoricalDayData>[] = [];
    
    for (let offset = 0; offset < 7 && (batchStart + offset) <= days; offset++) {
      const dayOffset = batchStart + offset;
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      
      batch.push(fetchSingleDayHistorical(date));
    }

    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }

  // Calculate averages (only from days with data)
  const daysWithHRV = results.filter(d => d.hrv !== null && d.hrv > 0);
  const daysWithRHR = results.filter(d => d.rhr !== null && d.rhr > 0);
  const daysWithSteps = results.filter(d => d.steps > 0);
  const daysWithCalories = results.filter(d => d.activeCalories > 0);
  const daysWithSleep = results.filter(d => d.sleepSeconds > 0);
  const daysWithWorkouts = results.filter(d => d.workoutMinutes > 0);
  const daysWithVO2 = results.filter(d => d.vo2Max !== null && d.vo2Max > 0);

  // Helper: Calculate Standard Deviation
  const calculateStdDev = (data: any[], key: string, mean: number): number => {
      if (data.length < 2) return 0;
      const variance = data.reduce((sum, d) => sum + Math.pow((d[key] || 0) - mean, 2), 0) / data.length;
      return Math.round(Math.sqrt(variance) * 10) / 10;
  };

  const avgHrv = daysWithHRV.length > 0 
      ? Math.round(daysWithHRV.reduce((sum, d) => sum + (d.hrv || 0), 0) / daysWithHRV.length)
      : 0;
  const avgRhr = daysWithRHR.length > 0
      ? Math.round(daysWithRHR.reduce((sum, d) => sum + (d.rhr || 0), 0) / daysWithRHR.length)
      : 0;
  const avgSleep = daysWithSleep.length > 0
      ? Math.round(daysWithSleep.reduce((sum, d) => sum + d.sleepSeconds, 0) / daysWithSleep.length)
      : 0;

  const averages = {
    hrv: avgHrv,
    stdDevHrv: calculateStdDev(daysWithHRV, 'hrv', avgHrv),
    sampleCountHrv: daysWithHRV.length,
    coverageHrv: Math.round((daysWithHRV.length / days) * 100) / 100,
    
    rhr: avgRhr,
    stdDevRhr: calculateStdDev(daysWithRHR, 'rhr', avgRhr),
    sampleCountRhr: daysWithRHR.length,
    coverageRhr: Math.round((daysWithRHR.length / days) * 100) / 100,
    
    steps: daysWithSteps.length > 0
      ? Math.round(daysWithSteps.reduce((sum, d) => sum + d.steps, 0) / daysWithSteps.length)
      : 0,
    activeCalories: daysWithCalories.length > 0
      ? Math.round(daysWithCalories.reduce((sum, d) => sum + d.activeCalories, 0) / daysWithCalories.length)
      : 0,
      
    sleepSeconds: avgSleep,
    stdDevSleep: calculateStdDev(daysWithSleep, 'sleepSeconds', avgSleep),
    sampleCountSleep: daysWithSleep.length,
    coverageSleep: Math.round((daysWithSleep.length / days) * 100) / 100,
    
    workoutMinutes: daysWithWorkouts.length > 0
      ? Math.round(daysWithWorkouts.reduce((sum, d) => sum + d.workoutMinutes, 0) / daysWithWorkouts.length)
      : 0,
    vo2Max: daysWithVO2.length > 0
      ? Math.round((daysWithVO2.reduce((sum, d) => sum + (d.vo2Max || 0), 0) / daysWithVO2.length) * 10) / 10
      : 0,
  };

  const daysWithAnyData = results.filter(d => 
    (d.hrv || 0) > 0 || (d.rhr || 0) > 0 || d.steps > 0 || d.activeCalories > 0 || d.sleepSeconds > 0
  ).length;

  console.log(`[HealthKit] Day Zero complete: ${daysWithAnyData}/${days} days with data`);
  console.log(`[HealthKit] Baselines: HRV=${averages.hrv}ms, RHR=${averages.rhr}bpm, Steps=${averages.steps}, Sleep=${Math.round(averages.sleepSeconds/3600)}h, Workouts=${averages.workoutMinutes}min, VO2=${averages.vo2Max}`);

  return {
      days: results,
      averages,
      daysFetched: results.length,
      daysWithData: daysWithAnyData
  };
}



/**
 * Helper: Fetch a single day's historical metrics
 */
async function fetchSingleDayHistorical(date: Date): Promise<HistoricalDayData> {
  // Fix for Timezone/Midnight bug: Use Local Date, not UTC
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offset);
  const dateStr = localDate.toISOString().split('T')[0];
  
  try {
    const { startDate, endDate } = getDayBounds(date, false);
    
    // Parallel fetch for speed
    const [hrvSamples, rhrSample, steps, activeCalories, sleep, exerciseMin, vo2Sample, workouts] = await Promise.all([
      // HRV average for the day
      Healthkit.queryQuantitySamples(
        'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
        { limit: 0, unit: 'ms', filter: { date: { startDate, endDate } } }
      ).catch(() => []),
      // RHR for the day
      queryLatestQuantity('HKQuantityTypeIdentifierRestingHeartRate', startDate, endDate, 'count/min'),
      // Steps (cumulative)
      queryCumulativeQuantity('HKQuantityTypeIdentifierStepCount', date, 'count'),
      // Active calories (cumulative)
      queryCumulativeQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', date, 'kcal'),
      // Sleep
      fetchSingleDaySleep(date),
      // Workout Minutes (Exercise Time)
      queryCumulativeQuantity('HKQuantityTypeIdentifierAppleExerciseTime', date, 'min'), // Using Cumulative for speed in history
      // VO2 Max (Latest sample for that day)
      queryLatestQuantity('HKQuantityTypeIdentifierVO2Max', startDate, endDate, 'ml/(kg*min)'),
      // Workouts List
      fetchWorkouts(date),
    ]);

    // Calculate HRV average if multiple samples
    let hrv: number | null = null;
    if (hrvSamples && hrvSamples.length > 0) {
      const total = hrvSamples.reduce((acc: number, s: any) => acc + (s.quantity || 0), 0);
      hrv = Math.round(total / hrvSamples.length);
    }

    return {
      date: dateStr,
      hrv,
      rhr: rhrSample ? Math.round(rhrSample) : null,
      steps,
      activeCalories,
      sleepSeconds: sleep.totalDurationSeconds,
      sleepScore: sleep.score,
      workoutMinutes: exerciseMin,
      vo2Max: vo2Sample,
      workouts: workouts || [],
    };
  } catch (e) {
    return {
      date: dateStr,
      hrv: null,
      rhr: null,
      steps: 0,
      activeCalories: 0,
      sleepSeconds: 0,
      sleepScore: 0,
      workoutMinutes: 0,
      vo2Max: null,
      workouts: [],
    };
  }
}

/**
 * Debug function to test workout calorie hydration
 * Call this to verify workouts are fetching calories correctly
 */
export async function debugWorkoutFetch() {
  console.log('═══════════════════════════════════════');
  console.log('   DEBUG: WORKOUT CALORIE CHECK        ');
  console.log('═══════════════════════════════════════');

  try {
    const now = new Date();
    const workouts = await fetchWorkouts(now);
    
    if (workouts.length > 0) {
      const withCalories = workouts.filter(w => w.activeCalories > 0).length;
      console.log(`Found ${workouts.length} workout(s), ${withCalories} with calories`);
      
      // Show first 3 workouts as sample
      workouts.slice(0, 3).forEach((w, i) => {
        console.log(`  [${i + 1}] ${w.type}: ${Math.round(w.durationSeconds / 60)}min, ${w.activeCalories}kcal`);
        console.log(`      Date: ${w.startDate}`);
        console.log(`      Date: ${w.startDate}`);
      });
    } else {
      console.log('No workouts found today');
    }
  } catch (e) {
    console.error('Debug failed:', e);
  }
  console.log('═══════════════════════════════════════');
}
