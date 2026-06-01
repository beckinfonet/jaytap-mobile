/**
 * DealToggle — sliding-pill segmented Rent/Buy toggle.
 *
 * Phase 14 Plan 14-01 (FILT-01, FILT-02). Shared by GuidedFilterSheet (size='lg')
 * and CascadingFilter (size='lg'). Replaces today's emoji segmented control at
 * HomeScreen.tsx:524-551.
 *
 * Sliding thumb: Animated.Value 0|1 interpolated to translateX 0% / 100% of
 * the container; 200ms Easing.inOut(Easing.cubic), useNativeDriver: false.
 *
 * Driver note: useNativeDriver MUST be false because outputRange uses percentage
 * strings ('0%' / '100%') and the native driver only interpolates numbers. With
 * useNativeDriver: true the timing call silently no-ops on device — thumb stays
 * frozen at its initial position even though `value` changes, making the press
 * feel unresponsive. (Fixed in quick 260531-x3z Round-4 after on-device QA.
 * The sibling LanguageToggle in AccountSettings keeps useNativeDriver: true
 * because it measures container width via onLayout and interpolates pixel
 * numbers — a richer pattern not needed here for a fixed-50/50 split.)
 *
 * Hex-literal note: `'#fff'` for active text is the project's text-on-accent
 * contract (matches ShowButton + RejectionBanner CTA).
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';

export type DealValue = 'Rent' | 'Buy';

export interface DealToggleProps {
  value: DealValue;
  onChange: (next: DealValue) => void;
}

const HEIGHT = 44;
const RADIUS = 22;

const DealToggle: React.FC<DealToggleProps> = ({ value, onChange }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const thumbPos = useRef(new Animated.Value(value === 'Rent' ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(thumbPos, {
      toValue: value === 'Rent' ? 0 : 1,
      duration: 200,
      easing: Easing.inOut(Easing.cubic),
      // See file-level "Driver note" — false is load-bearing because outputRange
      // uses percentage strings, which the native driver cannot interpolate.
      useNativeDriver: false,
    }).start();
  }, [value, thumbPos]);

  const labelRent = t('filters.deal.rent');
  const labelBuy = t('filters.deal.buy');

  const rentSelected = value === 'Rent';
  const buySelected = value === 'Buy';

  return (
    <View style={[styles.container, { backgroundColor: colors.surface2 }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            backgroundColor: colors.filterAccent,
            transform: [
              {
                translateX: thumbPos.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ],
          },
        ]}
      />
      <Pressable
        onPress={() => onChange('Rent')}
        accessibilityRole="button"
        accessibilityLabel={labelRent}
        accessibilityState={{ selected: rentSelected }}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        style={styles.segment}
      >
        <Text
          style={[
            styles.label,
            { color: rentSelected ? '#fff' : colors.textSecondary },
          ]}
        >
          {labelRent}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('Buy')}
        accessibilityRole="button"
        accessibilityLabel={labelBuy}
        accessibilityState={{ selected: buySelected }}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        style={styles.segment}
      >
        <Text
          style={[
            styles.label,
            { color: buySelected ? '#fff' : colors.textSecondary },
          ]}
        >
          {labelBuy}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: HEIGHT,
    borderRadius: RADIUS,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '50%',
    borderRadius: RADIUS,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: HEIGHT,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default DealToggle;
