import React from 'react';
import { TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

export const ThemeToggleSwitch: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const slideAnim = React.useRef(new Animated.Value(isDark ? 0 : 1)).current;

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isDark ? 0 : 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [isDark]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 43], // Slide left (dark) → right (light): width 78 − knob 32 − 3 left pad
  });

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA',
        },
      ]}
      onPress={toggleTheme}
      activeOpacity={0.8}
    >
      {/* Sliding Knob (Sun/Moon icon communicates state — no text labels, so the
          toggle never overflows in any language) */}
      <Animated.View
        style={[
          styles.knob,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        {!isDark ? (
          <Sun size={16} color="#666" strokeWidth={2.5} fill="#666" />
        ) : (
          <Moon size={16} color="#2C2C2E" strokeWidth={2.5} fill="#2C2C2E" />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 3,
    paddingVertical: 3,
    borderRadius: 20,
    width: 78,
    height: 40,
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
      },
      android: {
        shadowColor: '#000',
      },
    }),
  },
  knob: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
      },
      android: {
        shadowColor: '#000',
      },
    }),
  },
});

