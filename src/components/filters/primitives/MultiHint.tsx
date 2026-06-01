/**
 * MultiHint — small "Choose one or more" pill with mini-check glyph.
 *
 * Phase 14 Plan 14-01 (FILT-01). Used in Guided's Type-step header to signal
 * multi-select affordance.
 *
 * i18n key: filters.type.multiHint.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';

const MultiHint: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <View style={[styles.pill, { backgroundColor: colors.surface2 }]}>
      <Check size={10} color={colors.textTertiary} strokeWidth={1.75} />
      <Text style={[styles.label, { color: colors.textTertiary }]}>
        {t('filters.type.multiHint')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
});

export default MultiHint;
