import { StatusBar } from 'react-native'; // Changed from 'expo-status-bar'
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, Share, Alert } from 'react-native'; // Added SafeAreaView, TouchableOpacity, Share, Alert; Removed Button
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
  resetDatabase, // Added
} from './src/data/database';
import { 
  requestPermissions, 
  fetchBiometrics, 
  fetchActivityData, 
  fetchSleep,
  fetchHistoricalData,
  debugWorkoutFetch 
} from './src/data/healthkit';
import { calculateAxes } from './src/engine/AxesCalculator';
import { Planner } from './src/intelligence/Planner';
import { calculateProgression } from './src/engine/Progression';
import { checkDailyAlignment } from './src/engine/AlignmentTracker';
import { SessionManager } from './src/intelligence/SessionManager';
import { OperatorDailyStats } from './src/data/schema';
import { createSystemStatus } from './src/engine/StateEngine'; // Added

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState('Idle');
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'SETTINGS'>('DASHBOARD'); // Added

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // Added useEffect to run Dawn Protocol on mount
  useEffect(() => {
    runDawnProtocol();
  }, []);

  const runDawnProtocol = async () => {
    setStatus('Running Dawn Protocol...');
    addLog('═══════════════════════════════════════');
    addLog('SENTIENT V3 - DAWN PROTOCOL');
    addLog('═══════════════════════════════════════');
    
    try {
      // 1. DB Init
      addLog('Initializing Database...');
      await initDatabase();
      addLog('Database Ready.');

      // 2. Permissions
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
      
      // Force re-run if we have baselines but missing new V3.1 fields (workoutMinutes)
      const needsUpdate = baselines && (!baselines.workoutMinutes || !baselines.vo2Max);
      addLog(`First Launch: ${firstLaunch ? 'YES' : 'NO'}`);
      addLog(`Baselines Update Needed: ${needsUpdate ? 'YES' : 'NO'}`);
      
      if (firstLaunch || !baselines || needsUpdate) {
        // --- DAY ZERO PROTOCOL ---
        addLog('─── DAY ZERO PROTOCOL ───────────────');
        const historical = await fetchHistoricalData(30);
        
        // Save Baselines
        baselines = {
          hrv: historical.averages.hrv,
          rhr: historical.averages.rhr,
          steps: historical.averages.steps,
          activeCalories: historical.averages.activeCalories,
          sleepSeconds: historical.averages.sleepSeconds,
          workoutMinutes: historical.averages.workoutMinutes,
          vo2Max: historical.averages.vo2Max,
          calculatedAt: new Date().toISOString(),
        };
        
        await saveBaselines(baselines);
        await setFirstLaunchComplete();

        // [NEW] Persist Historical Data to Daily Stats for Export/Progression
        addLog(`Persisting ${historical.daysWithData} daily records...`);
        let savedCount = 0;
        
        for (const day of historical.days) {
            // Only save if day has meaningful data
            if (day.hrv || day.steps > 0 || day.activeCalories > 0) {
                // Construct a partial OperatorDailyStats object for storage
                // Note: We don't have full physics engine run for history yet, 
                // but we store raw metrics.
                try {
                    // Minimal stats object for history
                   const historicalStats: any = {
                        id: day.date,
                        date: day.date,
                        missionVariables: [],
                        sleep: {
                          totalDurationSeconds: day.sleepSeconds,
                          awakeSeconds: 0, remSeconds: 0, coreSeconds: 0, deepSeconds: 0, // Detail lost in history summary
                          score: day.sleepScore || 0,
                          source: 'biometric'
                        },
                        activity: {
                          steps: day.steps,
                          activeCalories: day.activeCalories,
                          activeMinutes: day.workoutMinutes,
                          restingCalories: 1500, // Estimate for history
                          workouts: day.workouts || []
                        },
                        biometrics: {
                          hrv: day.hrv || 0,
                          restingHeartRate: day.rhr || 0,
                          respiratoryRate: 0,
                          vo2Max: day.vo2Max || 0,
                          oxygenSaturation: 0,
                          bloodGlucose: 0
                        },
                        // Mock calculated stats since we didn't run engine on history
                        stats: {
                           vitality: 0, vitalityZScore: 0, isVitalityEstimated: true,
                           adaptiveCapacity: { current: 100, max: 100 },
                           physiologicalLoad: 0, alignmentScore: 0, consistency: 0, shieldsBreached: false,
                           systemStatus: {
                               axes: { metabolic:0, mechanical:0, neural: 0, recovery: 0, regulation: 0 },
                               current_state: 'HISTORICAL',
                               active_lens: 'UNKNOWN'
                           }
                        }
                    };
                    await saveDailyStats(historicalStats);
                    savedCount++;
                } catch (err) {
                    console.error('Failed to save history day', day.date, err);
                }
            }
        }

        addLog(`Baselines calculated & ${savedCount} days saved.`);
        addLog(`Avg Workouts: ${baselines.workoutMinutes}min | Avg VO2: ${baselines.vo2Max}`);
      } else {
        addLog(`Using stored baselines from ${baselines.calculatedAt.split('T')[0]}`);
      }

      // 4. Fetch Today's Data
      const now = new Date();
      addLog('─── TODAY\'S DATA ────────────────────');
      addLog(`Fetching Data for ${now.toDateString()}...`);
      
      const activity = await fetchActivityData(now);
      addLog(`Steps: ${activity.steps} | Distance: ${activity.walkingRunningDistance}km`);
      addLog(`Active: ${activity.activeCalories}kcal | Resting: ${activity.restingCalories}kcal`);
      addLog(`Exercise: ${activity.exerciseMinutes}min | Daylight: ${activity.timeInDaylight}min`);
      

      
      const sleepData = await fetchSleep(now);
      addLog(`Sleep: ${Math.round(sleepData.totalDurationSeconds/60)}min (Score: ${sleepData.score})`);
      
      const bioData = await fetchBiometrics(now);
      addLog(`HRV: ${bioData.hrv}ms | RHR: ${bioData.restingHeartRate}bpm`);
      addLog(`SpO2: ${bioData.oxygenSaturation ?? 'N/A'}% | VO2Max: ${bioData.vo2Max ?? 'N/A'}`);

      // 5. Construct Operator Stats
      const mockStats: OperatorDailyStats = {
        id: now.toISOString().split('T')[0],
        date: now.toISOString().split('T')[0],
        missionVariables: [],
        sleep: sleepData,
        activity: {
          steps: activity.steps,
          activeCalories: activity.activeCalories,
          activeMinutes: activity.exerciseMinutes,
          restingCalories: activity.restingCalories,
          workouts: []
        },
        biometrics: bioData,
        stats: {
           vitality: 80, vitalityZScore: 0, isVitalityEstimated: true,
           adaptiveCapacity: { current: 100, max: 100 },
           physiologicalLoad: 0, alignmentScore: 0, consistency: 0, shieldsBreached: false,
           systemStatus: {
               axes: { metabolic:0, mechanical:0, neural: 0, recovery: 0, regulation: 0 },
               current_state: 'CALCULATING',
               active_lens: 'CALCULATING'
           }
        }
      };

      // 6. Run Physics Engine
      addLog('─── PHYSICS ENGINE ──────────────────');
      const result = calculateAxes(mockStats);
      mockStats.stats.systemStatus = result.systemStatus;
      
      addLog(`State: ${result.systemStatus.current_state}`);
      addLog(`Lens: ${result.systemStatus.active_lens}`);

      // 7. Generate Logic Contract (3-Day Arc)
      addLog('─── INTELLIGENCE LAYER ──────────────');
      const contract = Planner.generateStrategicArc(result.systemStatus, result.trends);
      mockStats.logicContract = contract;
      
      addLog(`Today: ${contract.directive.category} / ${contract.directive.stimulus_type}`);
      if (contract.horizon.length > 1) {
        addLog(`Tomorrow: ${contract.horizon[1].directive.category} / ${contract.horizon[1].directive.stimulus_type}`);
      }
      if (contract.horizon.length > 2) {
        addLog(`Horizon: ${contract.horizon[2].directive.category} / ${contract.horizon[2].directive.stimulus_type}`);
      }
      
      // Generate Session
      const session = SessionManager.generateSession(contract.directive, result.systemStatus.active_lens);
      mockStats.activeSession = session;
      addLog(`Session: ${session.display.title} [${session.display.subtitle}]`);
      addLog(`Focus: ${session.instructions}`);

      // 8. Calculate Alignment & Progression
      addLog('─── PROGRESSION ─────────────────────');
      
      // Check TODAY'S Alignment
      const alignmentStatus = checkDailyAlignment(mockStats.activity, contract);
      mockStats.stats.alignmentStatus = alignmentStatus === 'PENDING' ? 'MISALIGNED' : alignmentStatus; // Store as simple string for DB
      addLog(`Today's Alignment: ${alignmentStatus}`);

      const history = await get30DayHistory();
      const progression = calculateProgression(history);
      
      addLog(`Class: ${progression.rank}`);
      addLog(`Alignment Score: ${progression.alignmentScore}%`);
      addLog(`Streak: ${progression.consistencyStreak} days`);
      
      mockStats.stats.alignmentScore = progression.alignmentScore;
      mockStats.stats.consistency = progression.consistencyStreak;
      
      // 9. Save
      addLog('─── SAVE ────────────────────────────');
      await saveDailyStats(mockStats);
      addLog('Saved Successfully.');
      addLog('═══════════════════════════════════════');

      setStatus('Complete');

    } catch (e: any) {
      addLog(`ERROR: ${e.message}`);
      setStatus('Error');
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SENTIENT</Text>
        <Text style={styles.headerSubtitle}>INTELLIGENCE ENGINE V3.0</Text>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {currentView === 'DASHBOARD' ? (
          <ScrollView style={styles.scrollView}>
            {/* Logs Console */}
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>{log}</Text>
            ))}
          </ScrollView>
        ) : (
          <ScrollView style={styles.scrollView}>
            <View style={styles.settingsContainer}>
              <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>
              
              <TouchableOpacity style={styles.button} onPress={handleExport}>
                <Text style={styles.buttonText}>Export 30-Day Data</Text>
                <Text style={styles.buttonSubtext}>Copy raw JSON to clipboard/share</Text>
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
          style={[styles.tab, currentView === 'DASHBOARD' && styles.activeTab]} 
          onPress={() => setCurrentView('DASHBOARD')}
        >
          <Text style={[styles.tabText, currentView === 'DASHBOARD' && styles.activeTabText]}>DASHBOARD</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, currentView === 'SETTINGS' && styles.activeTab]} 
          onPress={() => setCurrentView('SETTINGS')}
        >
          <Text style={[styles.tabText, currentView === 'SETTINGS' && styles.activeTabText]}>SETTINGS</Text>
        </TouchableOpacity>
      </View>

      <StatusBar barStyle="light-content" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate-900
    paddingTop: 0,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#E2E8F0', // Slate-200
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  headerSubtitle: {
    color: '#64748B', // Slate-500
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 4,
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
