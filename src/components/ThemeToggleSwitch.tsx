import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
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
    outputRange: [3, 58], // Slide from left (dark) to right (light) - closer to edge
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
      {/* Light Mode Text - Only show when light mode is active, aligned left */}
      {!isDark && (
        <View style={styles.textContainerLeft}>
          <Text
            style={[
              styles.toggleText,
              {
                color: '#333',
              },
            ]}
          >
            LIGHT{'\n'}MODE
          </Text>
        </View>
      )}

      {/* Sliding Knob */}
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

      {/* Dark Mode Text - Only show when dark mode is active, aligned right */}
      {isDark && (
        <View style={styles.textContainerRight}>
          <Text
            style={[
              styles.toggleText,
              {
                color: '#E5E5EA',
              },
            ]}
          >
            DARK{'\n'}MODE
          </Text>
        </View>
      )}
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
    borderRadius: 24,
    width: 100,
    height: 44,
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
  textContainerLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 10,
    zIndex: 1,
  },
  textContainerRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 10,
    zIndex: 1,
  },
  toggleText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
    textAlign: 'left',
    lineHeight: 10,
  },
  knob: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
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

