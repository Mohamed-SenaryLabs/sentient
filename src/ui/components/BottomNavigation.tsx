import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/tokens';

export function BottomNavigation({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + spacing[3] }]}>      
      <View style={styles.container}>
        {/* Mapping screens to icons manually for the 4-icon design vs 3-screen app */}
        
        {/* 1. HOME (Grid) */}
        <NavButton 
          icon="grid" 
          isActive={state.index === 0} 
          onPress={() => navigation.navigate('HOME')} 
        />
        
        {/* 2. DASHBOARD (Heart) - Biology/Vitals */}
        <NavButton 
          icon="heart-outline" 
          isActive={state.index === 1} 
          onPress={() => navigation.navigate('DASHBOARD')} 
        />
        
        {/* 3. SETTINGS (Person) */}
        <NavButton 
          icon="person-outline" 
          isActive={state.index === 2} 
          onPress={() => navigation.navigate('SETTINGS')} 
        />
      </View>
    </View>
  );
}

function NavButton({ icon, isActive, onPress }: { icon: any, isActive: boolean, onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.tab} onPress={onPress}>
      <Ionicons 
        name={isActive ? icon.replace('-outline', '') : icon} 
        size={24} 
        color={isActive ? colors.accent.vitality : colors.text.secondary} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg, 
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingTop: spacing[3],
  },

  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  tab: {
    padding: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
