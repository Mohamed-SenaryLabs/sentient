
import { 
    initDatabase, 
    getDailyStats, 
    saveDailyStats,
    isFirstLaunch,
    setFirstLaunchComplete,
    saveBaselines,
    getBaselines,
    get30DayHistory
} from '../data/database';
import { 
    requestPermissions, 
    fetchBiometrics, 
    fetchActivityData, 
    fetchSleep,
    fetchHistoricalData,
    fetchStress
} from '../data/healthkit';
import { calculateAxes } from './AxesCalculator';
import { VitalityScorer } from './VitalityScorer';
import { Planner } from '../intelligence/Planner';
import { calculateProgression } from './Progression';
import { checkDailyAlignment } from './AlignmentTracker';
import { SessionManager } from '../intelligence/SessionManager';
import { OperatorDailyStats } from '../data/schema';

// Factory Helper
const createDailyStats = (
    id: string, 
    date: string, 
    sleep: any, 
    activity: any, 
    biometrics: any, 
    loadDensity: number = 0,
    initialState: string = 'CALCULATING'
): OperatorDailyStats => ({
    id,
    date,
    missionVariables: [],
    sleep,
    activity,
    biometrics,
    stats: {
        vitality: 0, 
        vitalityZScore: 0, 
        isVitalityEstimated: true, 
        adaptiveCapacity: { current: 100, max: 100 },
        physiologicalLoad: 0, 
        loadDensity, 
        alignmentScore: 0, 
        consistency: 0, 
        shieldsBreached: false,
        systemStatus: { 
            axes: { metabolic:0, mechanical:0, neural: 0, recovery: 0, regulation: 0 }, 
            current_state: initialState, 
            active_lens: initialState === 'CALCULATING' ? 'CALCULATING' : 'UNKNOWN' 
        }
    },
    dailySummary: undefined
});

// Helper for Local Date ID (YYYY-MM-DD)
const getLocalYYYYMMDD = (d: Date) => {
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().split('T')[0];
};

export class DawnProtocol {
    

    static async fetchDailyStatsBackground(
        id: string,
        log: (msg: string) => void
    ): Promise<void> {
        try {
            log(`Background: Fetching verified stats for ${id}...`);
            const now = new Date();
            
            // Re-fetch everything to ensure freshness
            const activity = await fetchActivityData(now);
            const sleepData = await fetchSleep(now);
            let bioData = await fetchBiometrics(now);
            
            // Stress Pipe
            // TODO: Get baseline from DB in background? For now assuming passed or re-fetched.
            // Simplified: Just update biometrics for now.
            
            log(`Background Sync: ${activity.steps} steps updated.`);
            
            // In a real background job, we'd load the full stats object, update it, and save it.
            // For this refactor, we are establishing the pattern.
        } catch (e) {
            console.error('Background Fetch Failed', e);
        }
    }

    static async run(
        forceRefresh: boolean, 
        log: (msg: string) => void
    ): Promise<OperatorDailyStats> {
        log('═══════════════════════════════════════');

        log(`DAWN PROTOCOL ${forceRefresh ? '(FORCED)' : '(CACHED)'}`);
        
        // 1. Database Init
        await initDatabase();
        
        const now = new Date();
        const todayId = getLocalYYYYMMDD(now);

        // 2. PERSISTENCE CHECK
        if (!forceRefresh) {
            log('Checking Persistence...');
            const existing = await getDailyStats(todayId);
            
            // STALENESS CHECK
            if (existing && existing.logicContract && existing.stats.vitality > 0 && existing.stats.biometric_trends) {
                log('Loaded valid session from DB.');
                return existing;
            }
            log('Cache stale or missing. Running full protocol.');
        }

        // 3. Permissions
        log('Requesting HealthKit Permissions...');
        const perm = await requestPermissions();
        log(`Permissions: ${perm.authorized ? 'GRANTED' : 'DENIED/FAILED'}`);

        if (!perm.authorized) {
            throw new Error('Cannot proceed without HealthKit.');
        }

        // 3. Day Zero Check
        const firstLaunch = await isFirstLaunch();
        let baselines = await getBaselines();
        
        const needsUpdate = baselines && (!baselines.workoutMinutes || !baselines.vo2Max || !baselines.sampleCountHrv);
        log(`First Launch: ${firstLaunch ? 'YES' : 'NO'}`);
        log(`Baselines Update Needed: ${needsUpdate ? 'YES' : 'NO'}`);
        
        if (firstLaunch || !baselines || needsUpdate) {
            log('─── DAY ZERO PROTOCOL ───────────────');
            const historical = await fetchHistoricalData(30);
            
            baselines = {
                hrv: historical.averages.hrv,
                stdDevHrv: historical.averages.stdDevHrv,
                sampleCountHrv: historical.averages.sampleCountHrv,
                coverageHrv: historical.averages.coverageHrv,

                rhr: historical.averages.rhr,
                stdDevRhr: historical.averages.stdDevRhr,
                sampleCountRhr: historical.averages.sampleCountRhr,
                coverageRhr: historical.averages.coverageRhr,

                steps: historical.averages.steps,
                activeCalories: historical.averages.activeCalories,
                
                sleepSeconds: historical.averages.sleepSeconds,
                stdDevSleep: historical.averages.stdDevSleep,
                sampleCountSleep: historical.averages.sampleCountSleep,
                coverageSleep: historical.averages.coverageSleep,
                
                workoutMinutes: historical.averages.workoutMinutes,
                vo2Max: historical.averages.vo2Max,
                calculatedAt: new Date().toISOString(),
            };
            
            await saveBaselines(baselines);
            await setFirstLaunchComplete();

            // Persist History
            log(`Persisting ${historical.daysWithData} daily records...`);
            let savedCount = 0;
            for (const day of historical.days) {
                if (day.hrv || day.steps > 0 || day.activeCalories > 0) {
                        try {
                        const historicalStats = createDailyStats(
                                day.date,
                                day.date,
                                { totalDurationSeconds: day.sleepSeconds, score: day.sleepScore || 0, source: 'biometric', awakeSeconds: 0, remSeconds: 0, coreSeconds: 0, deepSeconds: 0 },
                                { steps: day.steps, activeCalories: day.activeCalories, activeMinutes: day.workoutMinutes, restingCalories: 1500, workouts: day.workouts || [] },
                                { hrv: day.hrv || 0, restingHeartRate: day.rhr || 0, respiratoryRate: 0, vo2Max: day.vo2Max || 0, oxygenSaturation: 0, bloodGlucose: 0 },
                                0,
                                'HISTORICAL'
                        );
                        await saveDailyStats(historicalStats);
                        savedCount++;
                    } catch (err) { console.error('Failed to save history day', day.date, err); }
                }
            }
            log(`Baselines calculated & ${savedCount} days saved.`);
            log(`Avg Workouts: ${baselines.workoutMinutes}min | Avg VO2: ${baselines.vo2Max}`);
        } else {
            // 3. Upgrade: Sync Yesterday (Catch Late Activity)
            log('Syncing Yesterday\'s Data...');
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const yActivity = await fetchActivityData(yesterday);
            const ySleep = await fetchSleep(yesterday);
            const yBio = await fetchBiometrics(yesterday);
            
            if (yActivity.steps > 0 || yActivity.workouts.length > 0) {
                const yStats = createDailyStats(
                    getLocalYYYYMMDD(yesterday),
                    getLocalYYYYMMDD(yesterday),
                    ySleep,
                    {
                        steps: yActivity.steps,
                        activeCalories: yActivity.activeCalories,
                        activeMinutes: yActivity.exerciseMinutes,
                        restingCalories: yActivity.restingCalories,
                        workouts: yActivity.workouts
                    },
                    yBio,
                    0,
                    'HISTORICAL'
                );
                
                // Physics for Yesterday
                const yVitality = VitalityScorer.calculate(yStats, { 
                    avgHrv: baselines.hrv, 
                    stdDevHrv: baselines.stdDevHrv,
                    sampleCountHrv: baselines.sampleCountHrv,
                    avgRhr: baselines.rhr, 
                    stdDevRhr: baselines.stdDevRhr,
                    sampleCountRhr: baselines.sampleCountRhr,
                    avgSleepSeconds: baselines.sleepSeconds || 25200,
                    stdDevSleep: baselines.stdDevSleep,
                    sampleCountSleep: baselines.sampleCountSleep
                });
                yStats.stats.vitality = yVitality.vitality;
                yStats.stats.vitalityZScore = yVitality.zScores.hrv;
                
                const yAxes = calculateAxes(yStats, {
                    avgSteps: baselines.steps,
                    avgActiveCalories: baselines.activeCalories,
                    avgSleepSeconds: baselines.sleepSeconds || 25200,
                    avgHrv: baselines.hrv,
                    avgRhr: baselines.rhr,
                    avgMetabolicLoad: 500
                });
                yStats.stats.systemStatus = yAxes.systemStatus;

                await saveDailyStats(yStats);
                log(`Yesterday Saved: ${yActivity.steps} steps`);
            }
        }

        // 3.5. Load Density Calculation (Pre-Fetch)
        const historyDb = await get30DayHistory();
        const last3Loads = historyDb.slice(0, 3).map(h => h.stats?.physiologicalLoad || 0);
        const currentLoadDensity = last3Loads.reduce((a, b) => a + b, 0);
        log(`72h Load Density: ${currentLoadDensity} (History: ${last3Loads.join('+')})`);

        // 4. Fetch Today's Data
        log('─── TODAY\'S DATA ────────────────────');
        log(`Fetching Data for ${now.toDateString()}...`);
        const activity = await fetchActivityData(now);
        const sleepData = await fetchSleep(now);
        let bioData = await fetchBiometrics(now);
        
        // 4.1. Stress Pipe
        const stressMetrics = await fetchStress(now, baselines.hrv);
        if (stressMetrics) {
            bioData = { ...bioData, stress: stressMetrics };
            log(`Stress: ${stressMetrics.time_elevated_pct}% Elevated (Min HRV: ${stressMetrics.lowest})`);
        }

        log(`Steps: ${activity.steps} | Active: ${activity.activeCalories}kcal`);
        log(`Sleep: ${(sleepData.totalDurationSeconds/3600).toFixed(1)}h | HRV: ${bioData.hrv}ms`);

        const currentStats = createDailyStats(
            getLocalYYYYMMDD(now),
            getLocalYYYYMMDD(now),
            sleepData,
            {
                steps: activity.steps,
                activeCalories: activity.activeCalories,
                activeMinutes: activity.exerciseMinutes,
                restingCalories: activity.restingCalories,
                workouts: activity.workouts
            },
            bioData,
            currentLoadDensity,
            'CALCULATING'
        );

        // 6. Run Physics Engine
        log('─── PHYSICS ENGINE ──────────────────');
        
        // Calculate Vitality
        const vitalityResult = VitalityScorer.calculate(currentStats, { 
            avgHrv: baselines.hrv, 
            stdDevHrv: baselines.stdDevHrv,
            sampleCountHrv: baselines.sampleCountHrv,
            avgRhr: baselines.rhr,
            stdDevRhr: baselines.stdDevRhr,
            sampleCountRhr: baselines.sampleCountRhr,
            avgSleepSeconds: baselines.sleepSeconds || 25200,
            stdDevSleep: baselines.stdDevSleep,
            sampleCountSleep: baselines.sampleCountSleep
        });

        log(`Inputs -> Sleep: ${(vitalityResult.zScores.sleep).toFixed(2)}z | Source: ${vitalityResult.isEstimated ? 'EST/DEF' : 'MEASURED'}`);
        log(`Inputs -> HRV: ${vitalityResult.zScores.hrv.toFixed(2)}z | RHR: ${vitalityResult.zScores.rhr.toFixed(2)}z`);

        // Handle availability
        if (vitalityResult.availability === 'UNAVAILABLE') {
            currentStats.stats.vitalityAvailability = 'UNAVAILABLE';
            currentStats.stats.vitalityUnavailableReason = vitalityResult.unavailableReason;
            currentStats.stats.vitalityConfidence = 'LOW';
            currentStats.stats.evidenceSummary = vitalityResult.evidenceSummary;
            log(`Vitality: UNAVAILABLE (§${vitalityResult.unavailableReason})`);
        } else {
            currentStats.stats.vitality = vitalityResult.vitality;
            currentStats.stats.vitalityZScore = vitalityResult.zScores.hrv;
            currentStats.stats.isVitalityEstimated = vitalityResult.isEstimated;
            currentStats.stats.vitalityConfidence = vitalityResult.confidence;
            currentStats.stats.vitalityAvailability = 'AVAILABLE';
            currentStats.stats.evidenceSummary = vitalityResult.evidenceSummary;
            
            if (vitalityResult.reasonCode) {
                currentStats.stats.systemStatus.reason_code = vitalityResult.reasonCode;
            }
            
            log(`Vitality: ${vitalityResult.vitality}% (Conf: ${vitalityResult.confidence})`);
            log(`Scores -> Sleep: ${vitalityResult.scores.sleep_score} | HRV: ${vitalityResult.scores.hrv_score} | RHR: ${vitalityResult.scores.rhr_score}`);
            if(vitalityResult.evidenceSummary.length > 0) {
                    log(`Evidence: ${vitalityResult.evidenceSummary[0]}`);
            }
        }
        
        currentStats.stats.biometric_trends = {
            hrv: {
                baseline: baselines.hrv,
                today_z_score: vitalityResult.zScores.hrv,
                trend: vitalityResult.zScores.hrv > 0.5 ? 'RISING' : vitalityResult.zScores.hrv < -0.5 ? 'FALLING' : 'STABLE'
            },
            rhr: {
                baseline: baselines.rhr,
                today_z_score: vitalityResult.zScores.rhr,
                trend: vitalityResult.zScores.rhr < -0.5 ? 'RISING' : vitalityResult.zScores.rhr > 0.5 ? 'FALLING' : 'STABLE'
            },
            sleep: {
                baseline_duration: 25200,
                trend: 'STABLE'
            }
        };

        const result = calculateAxes(currentStats, {
            avgSteps: baselines.steps,
            avgActiveCalories: baselines.activeCalories,
            avgSleepSeconds: baselines.sleepSeconds || 25200,
            avgHrv: baselines.hrv,
            avgRhr: baselines.rhr,
            avgMetabolicLoad: 500
        });
        currentStats.stats.systemStatus = result.systemStatus;
        
        log(`State: ${result.systemStatus.current_state}`);
        log(`Lens: ${result.systemStatus.active_lens}`);

        // 7. Intelligence Layer
        log('─── INTELLIGENCE LAYER ──────────────');
        const contract = await Planner.generateStrategicArc(currentStats, result.trends);
        currentStats.logicContract = contract;
        
        log(`Today: ${contract.directive.category} / ${contract.directive.stimulus_type}`);
        if (contract.horizon.length > 1) {
            log(`Tomorrow: ${contract.horizon[1].directive.category} / ${contract.horizon[1].directive.stimulus_type}`);
        }
        
        const session = SessionManager.generateSession(
            contract.directive, 
            result.systemStatus.active_lens, 
            contract.session_focus,
            contract.llm_generated_session
        );
        currentStats.activeSession = session;
        log(`Session: ${session.display.title} [${session.display.subtitle}]`);

        // 8. Calculate Alignment & Progression
        log('─── PROGRESSION ─────────────────────');
        
        const alignmentStatus = checkDailyAlignment(currentStats.activity, contract);
        currentStats.stats.alignmentStatus = alignmentStatus === 'PENDING' ? 'MISALIGNED' : alignmentStatus;
        log(`Today's Alignment: ${alignmentStatus}`);

        const history = await get30DayHistory();
        const progression = calculateProgression(history);
        
        log(`Class: ${progression.rank}`);
        log(`Streak: ${progression.consistencyStreak} days`);
        
        currentStats.stats.alignmentScore = progression.alignmentScore;
        currentStats.stats.consistency = progression.consistencyStreak;
        
        // 9. Save
        log('─── SAVE ────────────────────────────');
        await saveDailyStats(currentStats);
        log('Saved Successfully.');
        log('═══════════════════════════════════════');

        return currentStats;
    }
}
