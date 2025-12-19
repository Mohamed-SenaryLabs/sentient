import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, Button } from 'react-native';
import { useEffect, useState } from 'react';
import { initDatabase, getDailyStats, saveDailyStats } from './src/data/database';
import { requestPermissions, fetchBiometrics, fetchActivityData, fetchSleep } from './src/data/healthkit';
import { calculateAxes } from './src/engine/AxesCalculator';
import { OperatorDailyStats } from './src/data/schema';

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState('Idle');

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const runSystemCheck = async () => {
    setStatus('Running...');
    addLog('Starting System Check...');
    
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

      // 3. Data Fetch
      const now = new Date();
      addLog(`Fetching Data for ${now.toDateString()}...`);
      
      const activity = await fetchActivityData(now);
      addLog(`Steps: ${activity.steps} | Distance: ${activity.walkingRunningDistance}km`);
      addLog(`Active: ${activity.activeCalories}kcal | Resting: ${activity.restingCalories}kcal`);
      addLog(`Exercise: ${activity.exerciseMinutes}min | Daylight: ${activity.timeInDaylight}min`);
      
      const sleepData = await fetchSleep(now);
      addLog(`Sleep: ${sleepData.totalDurationSeconds}s (Score: ${sleepData.score})`);
      
      const bioData = await fetchBiometrics(now);
      addLog(`HRV: ${bioData.hrv}ms | RHR: ${bioData.restingHeartRate}bpm`);
      addLog(`SpO2: ${bioData.oxygenSaturation ?? 'N/A'}% | Glucose: ${bioData.bloodGlucose ?? 'N/A'}mg/dL`);
      addLog(`VO2 Max: ${bioData.vo2Max ?? 'N/A'} | Resp Rate: ${bioData.respiratoryRate ?? 'N/A'}/min`);

      // 4. Construct Operator Stats
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

      // 5. Run Engine
      addLog('Running Physics Engine...');
      const result = calculateAxes(mockStats);
      addLog(`System State: ${result.systemStatus.current_state}`);
      addLog(`Archetype: ${result.systemStatus.active_lens}`);
      
      // 6. Save
      addLog('Saving to Local DB...');
      mockStats.stats.systemStatus = result.systemStatus;
      await saveDailyStats(mockStats);
      addLog('Saved Successfully.');

      setStatus('Complete');

    } catch (e: any) {
      addLog(`ERROR: ${e.message}`);
      setStatus('Error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sentient V3 Engine</Text>
      <Text style={styles.status}>Status: {status}</Text>
      <Button title="Run System Check" onPress={runSystemCheck} />
      <ScrollView style={styles.logContainer}>
        {logs.map((log, i) => (
          <Text key={i} style={styles.log}>{log}</Text>
        ))}
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    marginBottom: 20,
    color: 'blue'
  },
  logContainer: {
    flex: 1,
    marginTop: 20,
    backgroundColor: '#f0f0f0',
    padding: 10,
  },
  log: {
    fontFamily: 'Courier',
    fontSize: 12,
    marginBottom: 5,
  }
});
