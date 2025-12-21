import { StatusBar } from 'react-native'; 
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, Share, Alert } from 'react-native';

import { useEffect, useState } from 'react';
import { 
  initDatabase, 
  getDailyStats, 
  saveDailyStats,
  isFirstLaunch,
  setFirstLaunchComplete,
  saveBaselines,
  getBaselines,
  get30DayHistory,
  resetDatabase,
} from './src/data/database';
import { 
  requestPermissions, 
  fetchBiometrics, 
  fetchActivityData, 
  fetchSleep,
  fetchHistoricalData,
  debugWorkoutFetch,
  fetchStress
} from './src/data/healthkit';
import { calculateAxes } from './src/engine/AxesCalculator';
import { VitalityScorer } from './src/engine/VitalityScorer';
import { Planner } from './src/intelligence/Planner';
import { calculateProgression } from './src/engine/Progression';
import { checkDailyAlignment } from './src/engine/AlignmentTracker';
import { SessionManager } from './src/intelligence/SessionManager';
import { OperatorDailyStats } from './src/data/schema';
import { createSystemStatus } from './src/engine/StateEngine';
import { DataViewerModal } from './src/ui/DataViewerModal';
import { DevConsoleScreen } from './src/ui/DevConsoleScreen';
import { FocusScreen } from './src/ui/FocusScreen';
import { BiologyScreen } from './src/ui/BiologyScreen';

// Helper for Local Date ID (YYYY-MM-DD)
// Crucial for midnight rollover: toISOString() uses UTC and causes 'Yesterday' bug in UTC+ timezones.
const getLocalYYYYMMDD = (d: Date) => {
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().split('T')[0];
};

// Start Factory Helper
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
// End Factory Helper

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState('Idle');
  const [currentView, setCurrentView] = useState<'FOCUS' | 'BIOLOGY' | 'SETTINGS'>('FOCUS');
  const [showDataModal, setShowDataModal] = useState(false);
  const [showDevConsole, setShowDevConsole] = useState(false);
  const [historicalData, setHistoricalData] = useState<OperatorDailyStats[]>([]);
  const [latestStats, setLatestStats] = useState<OperatorDailyStats | null>(null);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // ... (useEffect)
  useEffect(() => {
    async function init() {


        // Run Logic
        runDawnProtocol(false); 
    }
    init();
  }, []);

  const runDawnProtocol = async (forceRefresh: boolean = false) => {
     setStatus('Running Dawn Protocol...');
     addLog('═══════════════════════════════════════');
     addLog(`DAWN PROTOCOL ${forceRefresh ? '(FORCED)' : '(CACHED)'}`);
     
     try {
       // 1. Database Init
       await initDatabase();
       
       const now = new Date();
       const todayId = getLocalYYYYMMDD(now);

       // 2. PERSISTENCE CHECK
       if (!forceRefresh) {
           addLog('Checking Persistence...');
           const existing = await getDailyStats(todayId);
           
           // STALENESS CHECK: Ensure we only use cache if it has the new Vault data (biometric_trends)
           if (existing && existing.logicContract && existing.stats.vitality > 0 && existing.stats.biometric_trends) {
               addLog('Loaded valid session from DB.');
               setLatestStats(existing);
               setStatus('Complete');
               return; 
           }
           addLog('Cache stale or missing. Running full protocol.');
       }

       // 3. Permissions
       // ... (Rest of function)
       addLog('Requesting HealthKit Permissions...');
       const perm = await requestPermissions();
       addLog(`Permissions: ${perm.authorized ? 'GRANTED' : 'DENIED/FAILED'}`);

       if (!perm.authorized) {
         addLog('Cannot proceed without HealthKit.');
         setStatus('Failed');
         return;
       }

      // 3. Day Zero Check
      const firstLaunch = await isFirstLaunch();
      let baselines = await getBaselines();
      
      const needsUpdate = baselines && (!baselines.workoutMinutes || !baselines.vo2Max || !baselines.sampleCountHrv);
      addLog(`First Launch: ${firstLaunch ? 'YES' : 'NO'}`);
      addLog(`Baselines Update Needed: ${needsUpdate ? 'YES' : 'NO'}`);
      
      if (firstLaunch || !baselines || needsUpdate) {
        addLog('─── DAY ZERO PROTOCOL ───────────────');
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
        addLog(`Persisting ${historical.daysWithData} daily records...`);
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
        addLog(`Baselines calculated & ${savedCount} days saved.`);
        addLog(`Avg Workouts: ${baselines.workoutMinutes}min | Avg VO2: ${baselines.vo2Max}`);
      } else {
      // 3. Upgrade: Sync Yesterday (Catch Late Activity)
      addLog('Syncing Yesterday\'s Data...');
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

          // Preserve existing logic contract if possible, but for now just saving the data
          await saveDailyStats(yStats);
          addLog(`Yesterday Saved: ${yActivity.steps} steps`);
      }
    }

      // 3.5. Load Density Calculation (Pre-Fetch)
      // Used for today's stats.
      const historyDb = await get30DayHistory();
      // History is DESC (Yesterday is index 0)
      const last3Loads = historyDb.slice(0, 3).map(h => h.stats?.physiologicalLoad || 0);
      const currentLoadDensity = last3Loads.reduce((a, b) => a + b, 0);
      addLog(`72h Load Density: ${currentLoadDensity} (History: ${last3Loads.join('+')})`);

      // 4. Fetch Today's Data
      addLog('─── TODAY\'S DATA ────────────────────');
      addLog(`Fetching Data for ${now.toDateString()}...`);
      const activity = await fetchActivityData(now);
      const sleepData = await fetchSleep(now);
      let bioData = await fetchBiometrics(now);
      
      // 4.1. Stress Pipe (New)
      const stressMetrics = await fetchStress(now, baselines.hrv);
      if (stressMetrics) {
          bioData = { ...bioData, stress: stressMetrics };
          addLog(`Stress: ${stressMetrics.time_elevated_pct}% Elevated (Min HRV: ${stressMetrics.lowest})`);
      }

      addLog(`Steps: ${activity.steps} | Active: ${activity.activeCalories}kcal`);
      addLog(`Sleep: ${(sleepData.totalDurationSeconds/3600).toFixed(1)}h | HRV: ${bioData.hrv}ms`);

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
      addLog('─── PHYSICS ENGINE ──────────────────');
      
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

      // Log Inputs for Debugging
      addLog(`Inputs -> Sleep: ${(vitalityResult.zScores.sleep).toFixed(2)}z | Source: ${vitalityResult.isEstimated ? 'EST/DEF' : 'MEASURED'}`);
      addLog(`Inputs -> HRV: ${vitalityResult.zScores.hrv.toFixed(2)}z | RHR: ${vitalityResult.zScores.rhr.toFixed(2)}z`);

      // Handle availability (PRD §4.X.5)
      if (vitalityResult.availability === 'UNAVAILABLE') {
        currentStats.stats.vitalityAvailability = 'UNAVAILABLE';
        currentStats.stats.vitalityUnavailableReason = vitalityResult.unavailableReason;
        currentStats.stats.vitalityConfidence = 'LOW';
        currentStats.stats.evidenceSummary = vitalityResult.evidenceSummary;
        addLog(`Vitality: UNAVAILABLE (§${vitalityResult.unavailableReason})`);
      } else {
        currentStats.stats.vitality = vitalityResult.vitality;
        currentStats.stats.vitalityZScore = vitalityResult.zScores.hrv;
        currentStats.stats.isVitalityEstimated = vitalityResult.isEstimated;
        currentStats.stats.vitalityConfidence = vitalityResult.confidence;
        currentStats.stats.vitalityAvailability = 'AVAILABLE';
        currentStats.stats.evidenceSummary = vitalityResult.evidenceSummary;
        
        // Inject reason code into dummy SystemStatus so AxesCalculator can pick it up
        if (vitalityResult.reasonCode) {
            currentStats.stats.systemStatus.reason_code = vitalityResult.reasonCode;
        }
        
        addLog(`Vitality: ${vitalityResult.vitality}% (Conf: ${vitalityResult.confidence})`);
        addLog(`Scores -> Sleep: ${vitalityResult.scores.sleep_score} | HRV: ${vitalityResult.scores.hrv_score} | RHR: ${vitalityResult.scores.rhr_score}`);
        if(vitalityResult.evidenceSummary.length > 0) {
             addLog(`Evidence: ${vitalityResult.evidenceSummary[0]}`); // Log primary evidence
        }
      }
      
      // Populate Vault Evidence (Biometric Trends)
      // This was missing, causing 'CALCULATING' state even if data existed
      currentStats.stats.biometric_trends = {
          hrv: {
              baseline: baselines.hrv,
              today_z_score: vitalityResult.zScores.hrv,
              trend: vitalityResult.zScores.hrv > 0.5 ? 'RISING' : vitalityResult.zScores.hrv < -0.5 ? 'FALLING' : 'STABLE'
          },
          rhr: {
              baseline: baselines.rhr,
              today_z_score: vitalityResult.zScores.rhr,
              trend: vitalityResult.zScores.rhr < -0.5 ? 'RISING' : vitalityResult.zScores.rhr > 0.5 ? 'FALLING' : 'STABLE' // Inverted logic for labeling
          },
          sleep: {
              baseline_duration: 25200, // TODO: Store actual sleep baseline in DB
              trend: 'STABLE'
          }
      };

      const result = calculateAxes(currentStats, {
          avgSteps: baselines.steps,
          avgActiveCalories: baselines.activeCalories,
          avgSleepSeconds: baselines.sleepSeconds || 25200,
          avgHrv: baselines.hrv,
          avgRhr: baselines.rhr,
          avgMetabolicLoad: 500 // TODO: Calculate actual metabolic load baseline
      });
      currentStats.stats.systemStatus = result.systemStatus;
      
      addLog(`State: ${result.systemStatus.current_state}`);
      addLog(`Lens: ${result.systemStatus.active_lens}`);

      // 7. Intelligence Layer
      addLog('─── INTELLIGENCE LAYER ──────────────');
      const contract = await Planner.generateStrategicArc(currentStats, result.trends);
      currentStats.logicContract = contract;
      
      addLog(`Today: ${contract.directive.category} / ${contract.directive.stimulus_type}`);
      if (contract.horizon.length > 1) {
        addLog(`Tomorrow: ${contract.horizon[1].directive.category} / ${contract.horizon[1].directive.stimulus_type}`);
      }
      
      const session = SessionManager.generateSession(
          contract.directive, 
          result.systemStatus.active_lens, 
          contract.session_focus,
          contract.llm_generated_session
      );
      currentStats.activeSession = session;
      addLog(`Session: ${session.display.title} [${session.display.subtitle}]`);

      // 8. Calculate Alignment & Progression
      addLog('─── PROGRESSION ─────────────────────');
      
      // Check TODAY'S Alignment
      const alignmentStatus = checkDailyAlignment(currentStats.activity, contract);
      currentStats.stats.alignmentStatus = alignmentStatus === 'PENDING' ? 'MISALIGNED' : alignmentStatus;
      addLog(`Today's Alignment: ${alignmentStatus}`);

      const history = await get30DayHistory();
      const sortedHistory = history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistoricalData(sortedHistory);
      
      const progression = calculateProgression(history);
      
      addLog(`Class: ${progression.rank}`);
      addLog(`Streak: ${progression.consistencyStreak} days`);
      
      currentStats.stats.alignmentScore = progression.alignmentScore;
      currentStats.stats.consistency = progression.consistencyStreak;
      
      // 9. Save
      addLog('─── SAVE ────────────────────────────');
      await saveDailyStats(currentStats);
      addLog('Saved Successfully.');
      addLog('═══════════════════════════════════════');

      setLatestStats(currentStats);
      setStatus('Complete');

     } catch (e: any) {
        addLog(`ERROR: ${e.message}`);
        console.error(e);
        setStatus('Error');
     }
  };

  const handleViewData = async () => {
    try {
      const history = await get30DayHistory();
      const sorted = history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistoricalData(sorted);
      setShowDataModal(true);
    } catch (error) {
       Alert.alert('Error', 'Could not load data.');
    }
  };

  const handleExport = async () => {
    try {
      const history = await get30DayHistory();
      const exportData = JSON.stringify(history, null, 2);
      await Share.share({
        message: exportData,
        title: 'Sentient 30-Day Export'
      });
    } catch (error) {
      Alert.alert('Export Failed', 'Could not export data.');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset to Day Zero',
      'Are you sure? This will delete ALL data and reset the First Launch flag.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset Everything', 
          style: 'destructive', 
          onPress: async () => {
            await resetDatabase();
            Alert.alert('System Reset', 'Please restart the app to initiate Day Zero Protocol.');
          } 
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}


      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {currentView === 'FOCUS' ? (
          <FocusScreen 
            stats={latestStats} 
            status={status} 
            onRefresh={() => runDawnProtocol(true)}
            refreshing={status.startsWith('Running')}
          />
        ) : currentView === 'BIOLOGY' ? (
           <BiologyScreen
            stats={latestStats}
            history={historicalData}
            onRefresh={() => runDawnProtocol(true)}
            refreshing={status.startsWith('Running')}
           />
        ) : (
          <ScrollView style={styles.scrollView}>
            <View style={styles.settingsContainer}>
              <Text style={styles.sectionTitle}>DEVELOPER TOOLS</Text>
              
              <TouchableOpacity style={styles.button} onPress={() => setShowDevConsole(true)}>
                 <Text style={styles.buttonText}>Open System Console</Text>
                 <Text style={styles.buttonSubtext}>View Live Logistics & Engine Output</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>
              
              <TouchableOpacity style={styles.button} onPress={handleExport}>
                <Text style={styles.buttonText}>Export 30-Day Data</Text>
                <Text style={styles.buttonSubtext}>Copy raw JSON to clipboard/share</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.button} onPress={handleViewData}>
                <Text style={styles.buttonText}>View Stored Data</Text>
                <Text style={styles.buttonSubtext}>Inspect historical records</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>DANGER ZONE</Text>
              <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleReset}>
                <Text style={[styles.buttonText, styles.dangerText]}>Reset to Day Zero</Text>
                <Text style={styles.buttonSubtext}>Clear all databases & flags</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, currentView === 'FOCUS' && styles.activeTab]} 
          onPress={() => {
            setCurrentView('FOCUS');
          }}
        >
          <Text style={[styles.tabText, currentView === 'FOCUS' && styles.activeTabText]}>HOME</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, currentView === 'BIOLOGY' && styles.activeTab]} 
          onPress={() => {
            setCurrentView('BIOLOGY');
          }}
        >
          <Text style={[styles.tabText, currentView === 'BIOLOGY' && styles.activeTabText]}>DASHBOARD</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, currentView === 'SETTINGS' && styles.activeTab]} 
          onPress={() => {
            setCurrentView('SETTINGS');
          }}
        >
          <Text style={[styles.tabText, currentView === 'SETTINGS' && styles.activeTabText]}>SETTINGS</Text>
        </TouchableOpacity>
      </View>

      <StatusBar barStyle="light-content" />
      <DataViewerModal 
        visible={showDataModal} 
        onClose={() => setShowDataModal(false)} 
        data={historicalData} 
      />
      <DevConsoleScreen
        visible={showDevConsole}
        onBack={() => setShowDevConsole(false)}
        onRecreateDb={async () => {
             Alert.alert(
                "Recreate Database",
                "This will DELETE ALL DATA and reset the app. Are you sure?",
                [
                    { text: "Cancel", style: "cancel" },
                    { 
                        text: "Destruct Sequence",
                        style: 'destructive',
                        onPress: async () => {
                            addLog('!!! INITIATING DATABASE RESET !!!');
                            try {
                                await resetDatabase();
                                addLog('Database Dropped.');
                                addLog('Please Restart the App manually to re-initialize.');
                                Alert.alert("Reset Complete", "Please close and restart the app to re-initialize the database.");
                            } catch (e) {
                                addLog(`Reset Failed: ${e}`);
                            }
                        }
                    }
                ]
             );
        }}
        logs={logs}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate-900
    paddingTop: 0,
  },

  dashboardPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  logText: {
    fontFamily: 'Courier',
    color: '#10B981', // Emerald-500
    fontSize: 11,
    marginBottom: 4,
  },
  
  // Settings Styles
  settingsContainer: {
    gap: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  button: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dangerButton: {
    borderColor: '#7F1D1D',
    backgroundColor: '#450A0A',
  },
  buttonText: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerText: {
    color: '#FCA5A5',
  },
  buttonSubtext: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 10,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: '#10B981',
  },
  tabText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  activeTabText: {
    color: '#10B981',
  },
});
