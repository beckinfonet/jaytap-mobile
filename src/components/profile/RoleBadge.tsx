/**
 * RoleBadge — accent-soft pill with Shield icon + uppercase role text.
 *
 * Phase 16 Plan 16-01 (PROF-02 / D-04). Consumed by IdentityCard when role is
 * 'admin' or 'moderator'. Pure visual affordance — non-interactive.
 *
 * Geometry source: src/components/StatusPill.tsx (Phase 2 MOD-07 pill geometry)
 * with these adaptations per handoff `profile-screens.jsx:207`:
 *   - borderRadius 999 (full pill instead of 12)
 *   - paddingHorizontal 10 (handoff)
 *   - Shield lucide icon size 13 before text (gap 6)
 *   - row layout (flexDirection 'row', alignItems 'center')
 *   - foreground colors.accent on colors.accentSoft background
 *
 * Caller passes already-localized uppercase label string (e.g. t('profile.staffBadge.admin')).
 */
import React from 'react';
import { View, Text } from 'react-native';
import { Shield } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

export interface RoleBadgeProps {
  role: 'admin' | 'moderator';
  label: string;
  testID?: string;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role, label, testID }) => {
  const { colors } = useTheme();

  return (
    <View
      testID={testID}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: colors.accentSoft,
      }}
    >
      <Shield size={13} color={colors.accent} strokeWidth={1.75} />
      <Text
        style={{
          fontSize: 11.5,
          fontWeight: '700',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: colors.accent,
        }}
      >
        {label}
      </Text>
    </View>
  );
};

export default RoleBadge;
