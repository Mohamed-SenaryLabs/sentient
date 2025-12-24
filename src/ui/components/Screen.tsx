import React from 'react';
import { 
  KeyboardAvoidingView, 
  Platform, 
  StatusBar, 
  StyleSheet, 
  View, 
  ViewStyle, 
  ScrollView, 
  ScrollViewProps 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/tokens';

interface ScreenProps extends ScrollViewProps {
  children: React.ReactNode;
  /**
   * 'fixed' - no scrolling (default)
   * 'scroll' - standard ScrollView
   */
  preset?: 'fixed' | 'scroll';
  
  /**
   * Style for the outer wrapper (SafeAreaView/background)
   */
  style?: ViewStyle;
  
  /**
   * Style for the content container (only for 'scroll' preset)
   */
  contentContainerStyle?: ViewStyle;
  
  /**
   * Should we apply safe area top padding?
   * Default: true
   */
  safeAreaEdges?: Array<'top' | 'bottom'>;
}

export function Screen(props: ScreenProps) {
  const { 
    children, 
    preset = 'fixed', 
    style, 
    contentContainerStyle, 
    safeAreaEdges = ['top'],
    ...rest 
  } = props;
  
  const insets = useSafeAreaInsets();
  
  const paddingTop = safeAreaEdges.includes('top') 
    ? Math.max(insets.top, 20) + spacing[3] 
    : 0;

  // Calculate bottom tab bar height:
  // - paddingTop: spacing[3] = 12px
  // - Icon container: icon (24px) + tab padding (spacing[2] = 8px) * 2 = 40px
  // - paddingBottom: insets.bottom + spacing[3] = insets.bottom + 12px
  // Total: 64px + insets.bottom + extra spacing for visual breathing room
  const tabBarHeight = 64 + insets.bottom + spacing[4]; // 64 + insets.bottom + 16px breathing room
  const paddingBottom = safeAreaEdges.includes('bottom') ? insets.bottom : 0;

  const wrapperStyle = [
    styles.container,
    { paddingTop },
    style,
  ];

  if (preset === 'scroll') {
    return (
      <View style={styles.outerWrapper}>
        <StatusBar barStyle="light-content" />
        <ScrollView
          style={wrapperStyle}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: tabBarHeight }, // Account for bottom tab bar height
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          {...rest}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  // Fixed preset
  return (
    <View style={[styles.outerWrapper, { paddingTop }]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.innerContent, style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[6],
  },
  innerContent: {
    flex: 1,
    paddingHorizontal: spacing[5],
  }
});
