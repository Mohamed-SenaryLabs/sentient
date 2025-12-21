
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { OperatorDailyStats } from './src/data/schema';
import { DawnProtocol } from './src/engine/DawnProtocol';
import { get30DayHistory } from './src/data/database';
import { FocusScreen } from './src/ui/FocusScreen';
import { BiologyScreen } from './src/ui/BiologyScreen';
import { SettingsScreen } from './src/ui/SettingsScreen';
import { DevConsoleScreen } from './src/ui/DevConsoleScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState('Idle');
  const [latestStats, setLatestStats] = useState<OperatorDailyStats | null>(null);
  const [historicalData, setHistoricalData] = useState<OperatorDailyStats[]>([]);
  const [showDevConsole, setShowDevConsole] = useState(false);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const runProtocol = async (forceRefresh: boolean = false) => {
    setStatus('Running Dawn Protocol...');
    try {
        const stats = await DawnProtocol.run(forceRefresh, addLog);
        setLatestStats(stats);
        
        // Fetch historical data for workout logs
        const history = await get30DayHistory();
        const sorted = history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHistoricalData(sorted);
        
        setStatus('Complete');
    } catch (e: any) {
        addLog(`ERROR: ${e.message}`);
        setStatus('Error');
    }
  };

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
          tabBarActiveTintColor: '#10B981',
          tabBarInactiveTintColor: '#64748B',
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
    backgroundColor: '#0F172A', // Slate-900
    borderTopColor: '#1E293B',
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
  },
  tabText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 4,
  },
});
