/**
 * useSentientAppState — The Single Orchestrator Hook
 * 
 * This hook owns ALL app state and business operations:
 * - DawnProtocol execution
 * - Smart card lifecycle
 * - Persistence rehydration
 * - Status/progress strings
 * 
 * UI components consume this hook via context and receive
 * only data + callbacks — never touching engines directly.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { OperatorDailyStats, SmartCard, OperatorGoals } from '../data/schema';
import { DawnProtocol } from '../engine/DawnProtocol';
import { SmartCardEngine } from '../engine/SmartCardEngine';
import { 
  get30DayHistory, 
  saveWorkoutLog, 
  updateSleepBaseline, 
  saveOperatorGoals, 
  getOperatorGoals,
  resetDatabase as resetDatabaseFn,
  setWelcomeCompleted
} from '../data/database';

// ============================================
// STATE INTERFACE
// ============================================

export interface SentientAppState {
  // Core data
  stats: OperatorDailyStats | null;
  historicalData: OperatorDailyStats[];
  smartCards: SmartCard[];
  
  // Status
  status: string;
  isRefreshing: boolean;
  logs: string[];
  
  // Actions
  refresh: (force?: boolean) => Promise<void>;
  completeSmartCard: (id: string, payload?: any) => Promise<void>;
  dismissSmartCard: (id: string) => Promise<void>;
  
  // Settings actions
  exportData: () => Promise<string>;
  getHistoricalData: () => Promise<OperatorDailyStats[]>;
  resetDatabase: () => Promise<void>;
  triggerGoalsIntake: () => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================

const SentientAppContext = createContext<SentientAppState | null>(null);

// ============================================
// PROVIDER
// ============================================

interface SentientProviderProps {
  children: ReactNode;
}

export function SentientProvider({ children }: SentientProviderProps) {
  // Core state
  const [stats, setStats] = useState<OperatorDailyStats | null>(null);
  const [historicalData, setHistoricalData] = useState<OperatorDailyStats[]>([]);
  const [smartCards, setSmartCards] = useState<SmartCard[]>([]);
  
  // Status state
  const [status, setStatus] = useState('Idle');
  const [logs, setLogs] = useState<string[]>([]);
  
  // Derived state
  const isRefreshing = status.includes('...') || status === 'Initializing...';

  // ----------------------------------------
  // LOGGING
  // ----------------------------------------
  const addLog = useCallback((msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  // ----------------------------------------
  // SMART CARDS COMPUTATION
  // ----------------------------------------
  const computeSmartCards = useCallback(async (currentStats: OperatorDailyStats) => {
    try {
      const goals = await getOperatorGoals();
      const cards = await SmartCardEngine.computeActiveCards({
        stats: currentStats,
        date: currentStats.date,
        goals
      });
      setSmartCards(cards);
      addLog(`Smart Cards: ${cards.length} active`);
    } catch (e: any) {
      console.error('[SmartCards] Computation failed:', e);
    }
  }, [addLog]);

  // ----------------------------------------
  // MAIN PROTOCOL EXECUTION
  // ----------------------------------------
  const runProtocol = useCallback(async (forceRefresh: boolean = false) => {
    setStatus('Initializing...');
    try {
      const newStats = await DawnProtocol.run(forceRefresh, (msg) => {
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
      
      setStats(newStats);
      
      // Fetch historical data for workout logs
      const history = await get30DayHistory();
      const sorted = history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistoricalData(sorted);
      
      // Compute Smart Cards
      await computeSmartCards(newStats);
      
      setStatus('Complete');
    } catch (e: any) {
      addLog(`ERROR: ${e.message}`);
      setStatus('Error');
    }
  }, [addLog, computeSmartCards]);

  // ----------------------------------------
  // SMART CARD ACTIONS
  // ----------------------------------------
  const completeSmartCard = useCallback(async (cardId: string, payload?: any) => {
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
      
      if (card.type === 'WORKOUT_SUGGESTION' && payload?.operatorAction) {
        const action = payload.operatorAction;
        if (action === 'ADDED') {
          addLog(`Workout suggestion added to today: ${payload.suggestion?.title || 'Unknown'}`);
          // TODO: Create a log entry placeholder or add to today's plan
        } else if (action === 'SAVED') {
          addLog(`Workout suggestion saved for later: ${payload.suggestion?.title || 'Unknown'}`);
        } else if (action === 'DISMISSED') {
          addLog(`Workout suggestion dismissed`);
        }
      }
      
      // Handle WELCOME card completion: set welcome_completed flag
      if (card.type === 'WELCOME') {
        await setWelcomeCompleted();
        addLog('Welcome card completed');
      }
      
      // Complete the card in DB (persists operator action)
      await SmartCardEngine.completeCard(cardId, payload);
      
      // Remove from local state
      setSmartCards(prev => prev.filter(c => c.id !== cardId));
    } catch (e: any) {
      console.error('[SmartCards] Complete failed:', e);
    }
  }, [smartCards, addLog]);

  const dismissSmartCard = useCallback(async (cardId: string) => {
    try {
      const card = smartCards.find(c => c.id === cardId);
      
      // Handle WELCOME card dismissal: set welcome_completed flag (recommended)
      if (card?.type === 'WELCOME') {
        await setWelcomeCompleted();
        addLog('Welcome card dismissed');
      }
      
      await SmartCardEngine.dismissCard(cardId);
      
      // Remove from local state
      setSmartCards(prev => prev.filter(c => c.id !== cardId));
      addLog(`Card dismissed: ${cardId}`);
    } catch (e: any) {
      console.error('[SmartCards] Dismiss failed:', e);
    }
  }, [smartCards, addLog]);

  // ----------------------------------------
  // SETTINGS ACTIONS
  // ----------------------------------------
  const exportData = useCallback(async (): Promise<string> => {
    const history = await get30DayHistory();
    return JSON.stringify(history, null, 2);
  }, []);

  const getHistoricalDataFn = useCallback(async (): Promise<OperatorDailyStats[]> => {
    const history = await get30DayHistory();
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, []);

  const resetDatabaseAction = useCallback(async () => {
    await resetDatabaseFn();
    // Clear local state
    setStats(null);
    setHistoricalData([]);
    setSmartCards([]);
    setLogs([]);
    setStatus('Idle');
  }, []);

  const triggerGoalsIntakeFn = useCallback(async () => {
    if (!stats) return;
    try {
      const goals = await getOperatorGoals();
      const card = await SmartCardEngine.triggerGoalsIntakeManually({
        stats,
        date: stats.date,
        goals
      });
      if (card) {
        // Add to smart cards if not already present
        setSmartCards(prev => {
          const exists = prev.find(c => c.id === card.id);
          if (exists) return prev;
          return [...prev, card];
        });
        addLog('Goals intake card triggered');
      }
    } catch (e: any) {
      console.error('[Settings] Failed to trigger goals intake:', e);
      addLog(`Error: Could not trigger goals intake`);
    }
  }, [stats, addLog]);

  // ----------------------------------------
  // REFRESH WRAPPER
  // ----------------------------------------
  const refresh = useCallback(async (force: boolean = false) => {
    await runProtocol(force);
  }, [runProtocol]);

  // ----------------------------------------
  // INITIAL LOAD
  // ----------------------------------------
  useEffect(() => {
    runProtocol(false);
  }, []);

  // ----------------------------------------
  // CONTEXT VALUE
  // ----------------------------------------
  const value: SentientAppState = {
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
    getHistoricalData: getHistoricalDataFn,
    resetDatabase: resetDatabaseAction,
    triggerGoalsIntake: triggerGoalsIntakeFn,
  };

  return (
    <SentientAppContext.Provider value={value}>
      {children}
    </SentientAppContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useSentientAppState(): SentientAppState {
  const context = useContext(SentientAppContext);
  if (!context) {
    throw new Error('useSentientAppState must be used within a SentientProvider');
  }
  return context;
}
