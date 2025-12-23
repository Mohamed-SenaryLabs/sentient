/**
 * App.tsx — Navigation Compositor
 * 
 * This component is now focused solely on:
 * 1. Providing the SentientProvider context
 * 2. Navigation/tab bar composition
 * 3. DevConsole modal toggling
 * 
 * All business logic has been moved to useSentientAppState().
 */

import React, { useState } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { SentientProvider, useSentientAppState } from './src/hooks/useSentientAppState';
import { FocusScreen } from './src/ui/FocusScreen';
import { DashboardScreen } from './src/ui/DashboardScreen';
import { SettingsScreen } from './src/ui/SettingsScreen';
import { DevConsoleScreen } from './src/ui/DevConsoleScreen';
import { colors, spacing } from './src/ui/theme/tokens';

import { BottomNavigation } from './src/ui/components/BottomNavigation';
import { createHomeViewModel } from './src/ui/viewmodels/HomeViewModel';

const Tab = createBottomTabNavigator();

// ============================================
// INNER APP (Consumes Context)
// ============================================

function AppContent() {
  const [showDevConsole, setShowDevConsole] = useState(false);
  
  const {
    stats,
    historicalData,
    smartCards,
    status,
    isRefreshing,
    logs,
    refresh,
    completeSmartCard,
    dismissSmartCard,
    exportData,
    getHistoricalData,
    resetDatabase,
    triggerGoalsIntake,
  } = useSentientAppState();

  const homeViewData = createHomeViewModel(stats, status || 'Initializing...');

  if (showDevConsole) {
    return (
      <DevConsoleScreen 
        visible={true}
        onBack={() => setShowDevConsole(false)}
        onRecreateDb={async () => { /* Handled in DevConsole */ }} 
        logs={logs}
      />
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" />
      <Tab.Navigator
        tabBar={props => <BottomNavigation {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="HOME">
          {() => (
            <FocusScreen 
              viewData={homeViewData}
              onRefresh={() => refresh(true)}
              refreshing={isRefreshing}
              smartCards={smartCards}
              onCardComplete={completeSmartCard}
              onCardDismiss={dismissSmartCard}
            />
          )}
        </Tab.Screen>
        
        <Tab.Screen name="DASHBOARD">
          {() => (
            <DashboardScreen
              stats={stats}
              history={historicalData}
              onRefresh={() => refresh(true)}
              refreshing={isRefreshing}
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="SETTINGS">
          {() => (
            <SettingsScreen 
              stats={stats}
              onOpenDevConsole={() => setShowDevConsole(true)}
              onExportData={exportData}
              onGetHistoricalData={getHistoricalData}
              onResetDatabase={resetDatabase}
              onTriggerGoalsIntake={triggerGoalsIntake}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ============================================
// ROOT APP (Provides Context)
// ============================================

export default function App() {
  return (
    <SentientProvider>
      <AppContent />
    </SentientProvider>
  );
}
