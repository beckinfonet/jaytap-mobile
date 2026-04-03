import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

/** Minimum tap target (Apple HIG / Material). */
const TAP = 44;
const ICON_CIRCLE = 34;

/**
 * Close control for full-screen auth modals: respects safe area (no overlap with status bar)
 * and uses a full 44×44 hit area so it is easy to tap.
 */
export function AuthModalCloseButton({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Close"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={({ pressed }) => [
        styles.hitArea,
        {
          top: insets.top + 6,
          right: Math.max(insets.right, 12),
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.circle,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' },
        ]}
      >
        <Text style={[styles.icon, { color: colors.text }]}>✕</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    position: 'absolute',
    zIndex: 20,
    width: TAP,
    height: TAP,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: -1,
  },
});
