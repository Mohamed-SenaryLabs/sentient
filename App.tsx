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
  debugWorkoutFetch 
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
import { DataScreen } from './src/ui/DataScreen';

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState('Idle');
  const [currentView, setCurrentView] = useState<'FOCUS' | 'DATA' | 'SETTINGS'>('FOCUS');
  const [showDataModal, setShowDataModal] = useState(false);
  const [showDevConsole, setShowDevConsole] = useState(false);
  const [historicalData, setHistoricalData] = useState<OperatorDailyStats[]>([]);
  const [mockStatsState, setMockStatsState] = useState<OperatorDailyStats | null>(null);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    runDawnProtocol();
  }, []);

  const runDawnProtocol = async () => {
     setStatus('Running Dawn Protocol...');
     addLog('═══════════════════════════════════════');
     addLog('SENTIENT V3 - DAWN PROTOCOL');
     
     try {
       // 1. Database Init
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
      
      const needsUpdate = baselines && (!baselines.workoutMinutes || !baselines.vo2Max);
      addLog(`First Launch: ${firstLaunch ? 'YES' : 'NO'}`);
      addLog(`Baselines Update Needed: ${needsUpdate ? 'YES' : 'NO'}`);
      
      if (firstLaunch || !baselines || needsUpdate) {
        addLog('─── DAY ZERO PROTOCOL ───────────────');
        const historical = await fetchHistoricalData(30);
        
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

        // Persist History
        addLog(`Persisting ${historical.daysWithData} daily records...`);
        let savedCount = 0;
        for (const day of historical.days) {
            if (day.hrv || day.steps > 0 || day.activeCalories > 0) {
                 try {
                    const historicalStats: any = {
                         id: day.date,
                         date: day.date,
                         missionVariables: [],
                         sleep: { totalDurationSeconds: day.sleepSeconds, score: day.sleepScore || 0, source: 'biometric', awakeSeconds: 0, remSeconds: 0, coreSeconds: 0, deepSeconds: 0 },
                         activity: { steps: day.steps, activeCalories: day.activeCalories, activeMinutes: day.workoutMinutes, restingCalories: 1500, workouts: day.workouts || [] },
                         biometrics: { hrv: day.hrv || 0, restingHeartRate: day.rhr || 0, respiratoryRate: 0, vo2Max: day.vo2Max || 0, oxygenSaturation: 0, bloodGlucose: 0 },
                         stats: {
                            vitality: 0, vitalityZScore: 0, isVitalityEstimated: true,
                            adaptiveCapacity: { current: 100, max: 100 },
                            physiologicalLoad: 0, alignmentScore: 0, consistency: 0, shieldsBreached: false,
                            systemStatus: { axes: { metabolic:0, mechanical:0, neural: 0, recovery: 0, regulation: 0 }, current_state: 'HISTORICAL', active_lens: 'UNKNOWN' }
                         }
                    };
                    await saveDailyStats(historicalStats);
                    savedCount++;
                } catch (err) { console.error('Failed to save history day', day.date, err); }
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
      const sleepData = await fetchSleep(now);
      const bioData = await fetchBiometrics(now);

      addLog(`Steps: ${activity.steps} | Active: ${activity.activeCalories}kcal`);
      addLog(`Sleep: ${(sleepData.totalDurationSeconds/3600).toFixed(1)}h | HRV: ${bioData.hrv}ms`);

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
          workouts: activity.workouts
        },
        biometrics: bioData,
        stats: {
           vitality: 0, 
           vitalityZScore: 0, isVitalityEstimated: true, 
           adaptiveCapacity: { current: 100, max: 100 },
           physiologicalLoad: 0, alignmentScore: 0, consistency: 0, shieldsBreached: false,
           systemStatus: { axes: { metabolic:0, mechanical:0, neural: 0, recovery: 0, regulation: 0 }, current_state: 'CALCULATING', active_lens: 'CALCULATING' }
        },
        dailySummary: null
      };

      // 6. Run Physics Engine
      addLog('─── PHYSICS ENGINE ──────────────────');
      
      // Calculate Vitality
      const vitalityResult = VitalityScorer.calculate(mockStats, { 
          avgHrv: baselines.hrv, 
          avgRhr: baselines.rhr,
          // We could pass stdDev if we had it stored in baselines
      });
      mockStats.stats.vitality = vitalityResult.vitality;
      mockStats.stats.vitalityZScore = vitalityResult.zScore;
      mockStats.stats.isVitalityEstimated = vitalityResult.isEstimated;
      
      addLog(`Vitality: ${vitalityResult.vitality}% (Z: ${vitalityResult.zScore})`);

      const result = calculateAxes(mockStats);
      mockStats.stats.systemStatus = result.systemStatus;
      
      addLog(`State: ${result.systemStatus.current_state}`);
      addLog(`Lens: ${result.systemStatus.active_lens}`);

      // 7. Intelligence Layer
      addLog('─── INTELLIGENCE LAYER ──────────────');
      const contract = await Planner.generateStrategicArc(mockStats, result.trends);
      mockStats.logicContract = contract;
      
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
      mockStats.activeSession = session;
      addLog(`Session: ${session.display.title} [${session.display.subtitle}]`);

      // 8. Calculate Alignment & Progression
      addLog('─── PROGRESSION ─────────────────────');
      
      // Check TODAY'S Alignment
      const alignmentStatus = checkDailyAlignment(mockStats.activity, contract);
      mockStats.stats.alignmentStatus = alignmentStatus === 'PENDING' ? 'MISALIGNED' : alignmentStatus;
      addLog(`Today's Alignment: ${alignmentStatus}`);

      const history = await get30DayHistory();
      const sortedHistory = history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistoricalData(sortedHistory);
      
      const progression = calculateProgression(history);
      
      addLog(`Class: ${progression.rank}`);
      addLog(`Streak: ${progression.consistencyStreak} days`);
      
      mockStats.stats.alignmentScore = progression.alignmentScore;
      mockStats.stats.consistency = progression.consistencyStreak;
      
      // 9. Save
      addLog('─── SAVE ────────────────────────────');
      await saveDailyStats(mockStats);
      addLog('Saved Successfully.');
      addLog('═══════════════════════════════════════');

      setMockStatsState(mockStats);
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SENTIENT</Text>
        <Text style={styles.headerSubtitle}>INTELLIGENCE ENGINE V3.0</Text>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {currentView === 'FOCUS' ? (
          <FocusScreen 
            stats={mockStatsState} 
            status={status} 
            onRefresh={runDawnProtocol}
            refreshing={status.startsWith('Running')}
          />
        ) : currentView === 'DATA' ? (
           <DataScreen
            stats={mockStatsState}
            history={historicalData}
            onRefresh={runDawnProtocol}
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
          onPress={() => setCurrentView('FOCUS')}
        >
          <Text style={[styles.tabText, currentView === 'FOCUS' && styles.activeTabText]}>HOME</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, currentView === 'DATA' && styles.activeTab]} 
          onPress={() => setCurrentView('DATA')}
        >
          <Text style={[styles.tabText, currentView === 'DATA' && styles.activeTabText]}>DATA</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, currentView === 'SETTINGS' && styles.activeTab]} 
          onPress={() => setCurrentView('SETTINGS')}
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
