import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export const LanguageToggleSwitch: React.FC = () => {
  const { isDark } = useTheme();
  const { language, setLanguage } = useLanguage();
  const slideAnim = React.useRef(new Animated.Value(language === 'en' ? 0 : 1)).current;

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: language === 'en' ? 0 : 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [language]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 49],
  });

  const toggle = () => setLanguage(language === 'en' ? 'ru' : 'en');

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' },
      ]}
      onPress={toggle}
      activeOpacity={0.8}
    >
      {language === 'ru' && (
        <View style={styles.textContainerLeft}>
          <Text style={[styles.labelText, { color: isDark ? '#E5E5EA' : '#333' }]}>
            EN
          </Text>
        </View>
      )}

      <Animated.View
        style={[
          styles.knob,
          { transform: [{ translateX }] },
        ]}
      >
        <Text style={styles.knobText}>
          {language === 'en' ? '🇺🇸' : '🇷🇺'}
        </Text>
      </Animated.View>

      {language === 'en' && (
        <View style={styles.textContainerRight}>
          <Text style={[styles.labelText, { color: isDark ? '#E5E5EA' : '#333' }]}>
            RU
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
    width: 90,
    height: 44,
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
    ...Platform.select({
      ios: { shadowColor: '#000' },
      android: { shadowColor: '#000' },
    }),
  },
  textContainerLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 12,
    zIndex: 1,
  },
  textContainerRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 12,
    zIndex: 1,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
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
      ios: { shadowColor: '#000' },
      android: { shadowColor: '#000' },
    }),
  },
  knobText: {
    fontSize: 20,
  },
});
