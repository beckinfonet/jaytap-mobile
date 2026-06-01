/**
 * CheckSquare — 22×22 rounded-square multi-select affordance (display-only).
 *
 * Phase 14 Plan 14-01 (FILT-01). Pure visual cue; no callbacks. Used by Guided
 * TypeGrid cards + forward-fit for Master-Detail (Phase B).
 *
 * Pattern source: src/components/details/AttributeList.tsx:166-175 (boolean
 * badge with '✓' glyph). Style shape lifted from AttributeList.tsx:216-228.
 *
 * Theme tokens: colors.filterAccent (checked bg + border), colors.hair2 (unchecked
 * border). Originally colors.filterAccent; rescoped to filterAccent in quick 260531-x3z
 * Round-3 so the multi-select tick inside selected Type cards matches the indigo
 * card chrome instead of staying on the brand pink. The '#FFFFFF' glyph color is
 * the only permitted hex literal — white-on-accent is the project's
 * text-on-accent contract.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';

export interface CheckSquareProps {
  checked: boolean;
}

const CheckSquare: React.FC<CheckSquareProps> = ({ checked }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.checkSquare,
        {
          backgroundColor: checked ? colors.filterAccent : 'transparent',
          borderColor: checked ? colors.filterAccent : colors.hair2,
          borderWidth: 1.5,
        },
      ]}
    >
      {checked ? <Text style={styles.glyph}>{'✓'}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  checkSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 15,
    fontWeight: '700',
  },
});

export default CheckSquare;
