
import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { OperatorDailyStats, SmartCard } from './src/data/schema';
import { DawnProtocol } from './src/engine/DawnProtocol';
import { get30DayHistory, saveWorkoutLog, updateSleepBaseline, saveOperatorGoals, getOperatorGoals } from './src/data/database';
import { SmartCardEngine } from './src/engine/SmartCardEngine';
import { FocusScreen } from './src/ui/FocusScreen';
import { BiologyScreen } from './src/ui/BiologyScreen';
import { SettingsScreen } from './src/ui/SettingsScreen';
import { DevConsoleScreen } from './src/ui/DevConsoleScreen';
import { colors, spacing } from './src/ui/theme/tokens';

const Tab = createBottomTabNavigator();

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState('Idle');
  const [latestStats, setLatestStats] = useState<OperatorDailyStats | null>(null);
  const [historicalData, setHistoricalData] = useState<OperatorDailyStats[]>([]);
  const [showDevConsole, setShowDevConsole] = useState(false);
  
  // Smart Cards state
  const [smartCards, setSmartCards] = useState<SmartCard[]>([]);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // Compute Smart Cards based on current stats
  const computeSmartCards = useCallback(async (stats: OperatorDailyStats) => {
    try {
      const goals = await getOperatorGoals();
      const cards = await SmartCardEngine.computeActiveCards({
        stats,
        date: stats.date,
        goals
      });
      setSmartCards(cards);
      addLog(`Smart Cards: ${cards.length} active`);
    } catch (e: any) {
      console.error('[SmartCards] Computation failed:', e);
    }
  }, []);

  const runProtocol = async (forceRefresh: boolean = false) => {
    setStatus('Initializing...');
    try {
        const stats = await DawnProtocol.run(forceRefresh, (msg) => {
          addLog(msg);
          // Update status based on log messages
          if (msg.includes('Checking Persistence')) setStatus('Checking cache...');
          else if (msg.includes('Permissions')) setStatus('Requesting permissions...');
          else if (msg.includes('HealthKit')) setStatus('Reading biometric data...');
          else if (msg.includes('VITALITY')) setStatus('Computing vitality score...');
          else if (msg.includes('STATE')) setStatus('Determining system state...');
          else if (msg.includes('INTELLIGENCE')) setStatus('Generating guidance...');
          else if (msg.includes('Generating fresh Home')) setStatus('Creating personalized insights...');
          else if (msg.includes('Complete')) setStatus('Complete');
        });
        setLatestStats(stats);
        
        // Fetch historical data for workout logs
        const history = await get30DayHistory();
        const sorted = history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHistoricalData(sorted);
        
        // Compute Smart Cards
        await computeSmartCards(stats);
        
        setStatus('Complete');
    } catch (e: any) {
        addLog(`ERROR: ${e.message}`);
        setStatus('Error');
    }
  };

  // Smart Card action handlers
  const handleCardComplete = useCallback(async (cardId: string, payload?: any) => {
    try {
      const card = smartCards.find(c => c.id === cardId);
      if (!card) return;
      
      // Handle card-specific completion logic
      if (card.type === 'SLEEP_CONFIRM' && payload?.confirmedValue) {
        await updateSleepBaseline(payload.confirmedValue);
        addLog(`Sleep baseline updated: ${(payload.confirmedValue / 3600).toFixed(1)}h`);
      }
      
      if (card.type === 'WORKOUT_LOG' && payload?.logEntry) {
        await saveWorkoutLog({
          id: `log_${Date.now()}`,
          date: card.date,
          workoutId: payload.workoutId,
          note: payload.logEntry,
          created_at: new Date().toISOString()
        });
        addLog(`Workout logged: ${payload.logEntry.substring(0, 30)}...`);
      }
      
      if (card.type === 'GOALS_INTAKE' && payload?.currentGoals) {
        await saveOperatorGoals(payload.currentGoals);
        addLog(`Goals updated: ${payload.currentGoals.primary.substring(0, 30)}...`);
      }
      
      // Complete the card in DB
      await SmartCardEngine.completeCard(cardId, payload);
      
      // Remove from local state
      setSmartCards(prev => prev.filter(c => c.id !== cardId));
    } catch (e: any) {
      console.error('[SmartCards] Complete failed:', e);
    }
  }, [smartCards]);

  const handleCardDismiss = useCallback(async (cardId: string) => {
    try {
      await SmartCardEngine.dismissCard(cardId);
      
      // Remove from local state
      setSmartCards(prev => prev.filter(c => c.id !== cardId));
      addLog(`Card dismissed: ${cardId}`);
    } catch (e: any) {
      console.error('[SmartCards] Dismiss failed:', e);
    }
  }, []);

  useEffect(() => {
    runProtocol(false);
  }, []);

  if (showDevConsole) {
      return (
          <DevConsoleScreen 
              visible={true}
              onBack={() => setShowDevConsole(false)}
              onRecreateDb={async () => { /* Handle in DevConsole */ }} 
              logs={logs}
          />
      );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: colors.accent.primary,
          tabBarInactiveTintColor: colors.text.secondary,
          tabBarLabelStyle: styles.tabText,
        }}
      >
        <Tab.Screen name="HOME">
            {() => (
                <FocusScreen 
                    stats={latestStats} 
                    status={status} 
                    onRefresh={() => runProtocol(true)}
                    refreshing={status.startsWith('Running')}
                    smartCards={smartCards}
                    onCardComplete={handleCardComplete}
                    onCardDismiss={handleCardDismiss}
                />
            )}
        </Tab.Screen>
        
        <Tab.Screen name="DASHBOARD">
            {() => (
                <BiologyScreen
                    stats={latestStats}
                    history={historicalData} // TODO: Pass actual history from Protocol logic if needed, or fetch in BiologyScreen
                    onRefresh={() => runProtocol(true)}
                    refreshing={status.startsWith('Running')}
                />
            )}
        </Tab.Screen>

        <Tab.Screen name="SETTINGS">
            {() => (
                <SettingsScreen 
                    onOpenDevConsole={() => setShowDevConsole(true)}
                />
            )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bg,
    borderTopColor: colors.border.subtle,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: spacing[5],
    paddingTop: spacing[3],
  },
  tabText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: spacing[1],
  },
});
