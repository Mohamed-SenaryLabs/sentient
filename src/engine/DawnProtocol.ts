
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
import { Analyst } from '../intelligence/Analyst';
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
        let existing: OperatorDailyStats | null = null; // Move to function scope for INTRA_DAY_RECAL
        if (!forceRefresh) {
            log('Checking Persistence...');
            existing = await getDailyStats(todayId);
            
            // STALENESS CHECK (PRD §3.4.1.1: Require Focus/Avoid/Insight)
            const hasFocusAvoidInsight = existing?.logicContract?.session_focus_llm 
                && existing?.logicContract?.avoid_cue 
                && existing?.logicContract?.analyst_insight?.summary;
            
            if (existing && existing.logicContract && existing.stats.vitality > 0 && existing.stats.biometric_trends && hasFocusAvoidInsight) {
                log('✓ Home screen loaded from persistence (Focus/Avoid/Insight cached)');
                log(`  - session_focus_llm: "${existing.logicContract.session_focus_llm?.substring(0, 50)}..."`);
                log(`  - content_generated_at: ${existing.logicContract.content_generated_at}`);
                return existing;
            }
            log('Cache stale or missing. Running full protocol.');
            if (existing) {
                log(`  - existing found: vitality=${existing.stats.vitality}, hasFocusAvoid=${hasFocusAvoidInsight}`);
            } else {
                log('  - no existing record found for today');
            }
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
                baseline_duration: baselines.sleepSeconds || 25200,
                trend: 'STABLE'
            },
            steps: {
                baseline: baselines.steps,
                trend: activity.steps > baselines.steps * 1.1 ? 'RISING' : activity.steps < baselines.steps * 0.9 ? 'FALLING' : 'STABLE'
            },
            active_calories: {
                baseline: baselines.activeCalories,
                trend: activity.activeCalories > baselines.activeCalories * 1.1 ? 'RISING' : activity.activeCalories < baselines.activeCalories * 0.9 ? 'FALLING' : 'STABLE'
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

        // PRD §3.4.1.1: Build comprehensive evidence summary
        // Expand vitality-only evidence to include state, load, stress, and mission context
        const comprehensiveEvidence: string[] = [
            ...(currentStats.stats.evidenceSummary || []), // Keep vitality bullets
        ];

        // Add state context
        if (result.systemStatus.reason_code) {
            comprehensiveEvidence.push(`State: ${result.systemStatus.current_state} (${result.systemStatus.reason_code})`);
        } else {
            comprehensiveEvidence.push(`State: ${result.systemStatus.current_state}`);
        }

        // Add load density context
        if (currentStats.stats.loadDensity !== undefined) {
            const loadTrend = result.trends?.load_trend || 'STABLE';
            comprehensiveEvidence.push(`Load Density: ${currentStats.stats.loadDensity.toFixed(1)} (${loadTrend})`);
        }

        // Add stress markers if elevated (using physiological load as proxy)
        const stressThreshold = 70; // High physiological load indicates stress
        if (currentStats.stats.physiologicalLoad > stressThreshold) {
            comprehensiveEvidence.push(`Physiological load elevated (${currentStats.stats.physiologicalLoad}%)`);
        }

        // Add mission variables if present
        if (currentStats.missionVariables && currentStats.missionVariables.length > 0) {
            const missionSummary = currentStats.missionVariables.join(', ');
            comprehensiveEvidence.push(`Mission: ${missionSummary}`);
        }

        // Add workouts to evidence
        if (currentStats.activity.workouts.length > 0) {
            currentStats.activity.workouts.forEach(w => {
                let workoutPrompt = `Workout: ${w.type} (${Math.round(w.durationSeconds / 60)}min, ${w.activeCalories}kcal)`;
                if (w.minHeartRate && w.maxHeartRate) {
                    workoutPrompt += ` (HR: ${w.minHeartRate}-${w.maxHeartRate}bpm)`;
                } else if (w.rpm) {
                    workoutPrompt += ` @ ${Math.round(w.rpm)} RPM`;
                }
                comprehensiveEvidence.push(workoutPrompt);
            });
        }

        // Add generation timestamp for natural variation (prevents identical outputs on reset)
        const timeOfDay = now.getHours();
        const period = timeOfDay < 12 ? 'morning' : timeOfDay < 17 ? 'afternoon' : 'evening';
        comprehensiveEvidence.push(`Generated: ${period}, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);

        // Update evidence summary with comprehensive context
        currentStats.stats.evidenceSummary = comprehensiveEvidence;

        // 7. Intelligence Layer
        log('─── INTELLIGENCE LAYER ──────────────');
        const contract = await Planner.generateStrategicArc(currentStats, result.trends);
        
        // INTRA_DAY_RECAL: Check if directive/constraints changed (trigger for regeneration)
        let shouldRegenerateFocusAvoid = true; // Default to regen for cold start
        let regenReason = 'Cold start (no cached content)';
        
        // Cooldown protection: prevent rapid recals (2 hour cooldown per PRD)
        const RECAL_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
        const MAX_RECAL_PER_DAY = 3; // Daily cap
        
        if (existing?.logicContract?.session_focus_llm && !forceRefresh) {
            // We have cached Focus/Avoid/Insight - check for triggers
            const cachedDirective = existing.logicContract.directive_snapshot 
                ? JSON.parse(existing.logicContract.directive_snapshot) 
                : null;
            const cachedConstraints = existing.logicContract.constraints_snapshot 
                ? JSON.parse(existing.logicContract.constraints_snapshot) 
                : null;
            
            // Compare directive (materiality check - only trigger on actual changes)
            let directiveChanged = false;
            let directiveDelta: { before: any; after: any } | null = null;
            if (cachedDirective) {
                const categoryChanged = cachedDirective.category !== contract.directive.category;
                const stimulusChanged = cachedDirective.stimulus_type !== contract.directive.stimulus_type;
                
                if (categoryChanged || stimulusChanged) {
                    directiveChanged = true;
                    directiveDelta = {
                        before: { category: cachedDirective.category, stimulus_type: cachedDirective.stimulus_type },
                        after: { category: contract.directive.category, stimulus_type: contract.directive.stimulus_type }
                    };
                    
                    if (categoryChanged && stimulusChanged) {
                        regenReason = `Directive changed: ${cachedDirective.category}/${cachedDirective.stimulus_type} → ${contract.directive.category}/${contract.directive.stimulus_type}`;
                    } else if (categoryChanged) {
                        regenReason = `Directive category changed: ${cachedDirective.category} → ${contract.directive.category}`;
                    } else {
                        regenReason = `Stimulus type changed: ${cachedDirective.stimulus_type} → ${contract.directive.stimulus_type}`;
                    }
                }
            }
            
            // Compare constraints (deep comparison - only trigger on material changes)
            let constraintsChanged = false;
            let constraintsDelta: { before: any; after: any } | null = null;
            if (cachedConstraints && !directiveChanged) {
                const currentConstraints = contract.constraints;
                const changes: string[] = [];
                
                // Check allow_impact
                if (cachedConstraints.allow_impact !== currentConstraints.allow_impact) {
                    changes.push(`allow_impact: ${cachedConstraints.allow_impact} → ${currentConstraints.allow_impact}`);
                }
                
                // Check heart_rate_cap (handle undefined/null)
                const cachedHrCap = cachedConstraints.heart_rate_cap ?? null;
                const currentHrCap = currentConstraints.heart_rate_cap ?? null;
                if (cachedHrCap !== currentHrCap) {
                    changes.push(`heart_rate_cap: ${cachedHrCap} → ${currentHrCap}`);
                }
                
                // Check required_equipment (array comparison - ignore order)
                const cachedEq = (cachedConstraints.required_equipment || []).sort().join(',');
                const currentEq = (currentConstraints.required_equipment || []).sort().join(',');
                if (cachedEq !== currentEq) {
                    changes.push(`required_equipment: [${cachedConstraints.required_equipment?.join(', ') || ''}] → [${currentConstraints.required_equipment?.join(', ') || ''}]`);
                }
                
                if (changes.length > 0) {
                    constraintsChanged = true;
                    constraintsDelta = {
                        before: { ...cachedConstraints },
                        after: { ...currentConstraints }
                    };
                    regenReason = `Constraint changed: ${changes.join(', ')}`;
                }
            }
            
            shouldRegenerateFocusAvoid = directiveChanged || constraintsChanged || !cachedDirective || !cachedConstraints;
            
            // Cooldown and daily cap check
            if (shouldRegenerateFocusAvoid) {
                const currentRecalCount = existing.logicContract.recal_count || 0;
                
                // Check daily cap first
                if (currentRecalCount >= MAX_RECAL_PER_DAY) {
                    shouldRegenerateFocusAvoid = false;
                    regenReason = 'COOLDOWN_BLOCKED';
                    log(`⏸️  INTRA_DAY_RECAL BLOCKED: Daily cap reached (${currentRecalCount}/${MAX_RECAL_PER_DAY})`);
                } else if (existing.logicContract.last_recal_at) {
                    const lastRecalTime = new Date(existing.logicContract.last_recal_at);
                    const timeSinceLastRecal = now.getTime() - lastRecalTime.getTime();
                    
                    // Check if same day (for daily cap)
                    const lastRecalDate = new Date(lastRecalTime);
                    lastRecalDate.setHours(0, 0, 0, 0);
                    const todayDate = new Date(now);
                    todayDate.setHours(0, 0, 0, 0);
                    const isSameDay = lastRecalDate.getTime() === todayDate.getTime();
                    
                    // Reset recal_count if new day
                    if (!isSameDay) {
                        // New day - reset count (will be handled in persistence)
                    }
                    
                    // Allow recal if cooldown expired OR if it's a critical safety state change
                    const isCriticalSafetyChange = directiveChanged && (
                        (cachedDirective?.category === 'REGULATION' && contract.directive.category !== 'REGULATION') ||
                        (cachedDirective?.stimulus_type === 'FLUSH' && contract.directive.stimulus_type === 'OVERLOAD') ||
                        (cachedDirective?.stimulus_type === 'OVERLOAD' && contract.directive.stimulus_type === 'FLUSH')
                    );
                    
                    if (timeSinceLastRecal < RECAL_COOLDOWN_MS && !isCriticalSafetyChange) {
                        shouldRegenerateFocusAvoid = false;
                        const minutesSince = Math.round(timeSinceLastRecal / 1000 / 60);
                        regenReason = `Cooldown active (${minutesSince} min since last recal, ${2 - (minutesSince / 60).toFixed(1)}h remaining)`;
                        log(`⏸️  INTRA_DAY_RECAL BLOCKED: ${regenReason}`);
                    }
                }
            }
            
            if (!shouldRegenerateFocusAvoid) {
                if (!regenReason.includes('Cooldown') && !regenReason.includes('COOLDOWN_BLOCKED')) {
                    regenReason = 'Day-stable (no material changes)';
                }
                log(`✓ INTRA_DAY_RECAL: ${regenReason} - using cached Focus/Avoid/Insight`);
            } else {
                // Log pre/post values for audit/debug
                if (directiveDelta) {
                    log(`📊 RECAL DELTA - Directive: ${JSON.stringify(directiveDelta.before)} → ${JSON.stringify(directiveDelta.after)}`);
                }
                if (constraintsDelta) {
                    log(`📊 RECAL DELTA - Constraints: ${JSON.stringify(constraintsDelta.before)} → ${JSON.stringify(constraintsDelta.after)}`);
                }
                log(`⚡ INTRA_DAY_RECAL TRIGGER: ${regenReason}`);
            }
        }
        
        // PRD §3.4.1.1: Generate Focus/Avoid/Insight (only if triggered)
        let focusAvoidInsight;
        if (shouldRegenerateFocusAvoid) {
            log('⚙️  Generating fresh Home screen content (Focus/Avoid/Insight)...');
            focusAvoidInsight = await Analyst.generateFocusAvoidInsight(
                currentStats,
                contract.directive,
                contract.constraints,
                currentStats.stats.evidenceSummary || []
            );
        } else {
            // Reuse cached content
            focusAvoidInsight = {
                sessionFocus: existing!.logicContract!.session_focus_llm!,
                avoidCue: existing!.logicContract!.avoid_cue!,
                analystInsight: existing!.logicContract!.analyst_insight!,
                evidenceSummary: existing!.logicContract!.evidence_summary || [],
                source: existing!.logicContract!.content_source || 'LLM',
            };
        }
        
        // Store in contract
        contract.session_focus_llm = focusAvoidInsight.sessionFocus;
        contract.avoid_cue = focusAvoidInsight.avoidCue;
        contract.analyst_insight = focusAvoidInsight.analystInsight;
        contract.evidence_summary = currentStats.stats.evidenceSummary || [];
        contract.content_generated_at = new Date().toISOString();
        contract.content_source = focusAvoidInsight.source;
        
        // INTRA_DAY_RECAL: Store snapshots for trigger detection
        contract.directive_snapshot = JSON.stringify(contract.directive);
        contract.constraints_snapshot = JSON.stringify(contract.constraints);
        
        // INTRA_DAY_RECAL: Store observability metadata
        if (shouldRegenerateFocusAvoid) {
            // Check if same day for recal_count
            const nowDate = new Date(now);
            nowDate.setHours(0, 0, 0, 0);
            const lastRecalDate = existing?.logicContract?.last_recal_at 
                ? new Date(new Date(existing.logicContract.last_recal_at).setHours(0, 0, 0, 0))
                : null;
            const isSameDay = lastRecalDate && lastRecalDate.getTime() === nowDate.getTime();
            
            contract.last_recal_at = new Date().toISOString();
            contract.last_recal_reason = regenReason;
            // Reset count if new day, otherwise increment
            contract.recal_count = isSameDay 
                ? ((existing?.logicContract?.recal_count || 0) + 1)
                : 1;
        } else {
            // Preserve existing metadata when using cache
            contract.last_recal_at = existing?.logicContract?.last_recal_at;
            contract.last_recal_reason = existing?.logicContract?.last_recal_reason;
            contract.recal_count = existing?.logicContract?.recal_count || 0;
        }
        
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
        
        // 9. Set last_refresh_at (Updated timestamp - happens on every refresh/scan)
        // Note: This will be persisted as updated_at in the database and mapped back on read
        currentStats.last_refresh_at = new Date().toISOString();
        
        // 10. Save (updated_at will be set to current timestamp, representing last refresh/scan)
        log('─── SAVE ────────────────────────────');
        await saveDailyStats(currentStats);
        log('Saved Successfully.');
        log('═══════════════════════════════════════');

        return currentStats;
    }
}
