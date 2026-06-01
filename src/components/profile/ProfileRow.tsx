/**
 * ProfileRow — 38px icon-chip + title/sub + chevron primitive.
 *
 * Phase 16 Plan 16-01 (PROF-01/02). Consumed by ProfileScreen's user-layout
 * ACTIVITY (Favorites, Appointments) and HOSTING (My Listings) cards in Plan 16-02.
 *
 * Pattern source: src/components/FilterStyleRow.tsx lines 106-151 (collapsed-row
 * portion) — same 38px icon chip + title/sub stack + chevron anatomy. Strips the
 * expandable / chevron-rotation logic (Phase 16 rows are nav-only).
 *
 * `accent={true}` variant: outer Pressable backgroundColor = colors.accent;
 * inner icon-chip uses a semi-transparent white literal `rgba(255,255,255,0.2)`
 * (allowed per plan acceptance criteria — needed for legibility over the accent
 * fill; same pattern used in HomeRejectionBanner / accent CTAs).
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

export interface ProfileRowProps {
  Icon: LucideIcon;
  title: string;
  sub?: string;
  onPress: () => void;
  /** Accent-filled variant for the user-layout "Create Listing" row. */
  accent?: boolean;
  testID?: string;
}

const ProfileRow: React.FC<ProfileRowProps> = ({ Icon, title, sub, onPress, accent, testID }) => {
  const { colors } = useTheme();

  const containerBg = accent ? colors.accent : 'transparent';
  const chipBg = accent ? 'rgba(255,255,255,0.2)' : colors.surface2;
  const iconColor = accent ? colors.onAccent : colors.iconChipFg;
  const titleColor = accent ? colors.onAccent : colors.text;
  const subColor = accent ? 'rgba(255,255,255,0.85)' : colors.textTertiary;
  const chevronColor = accent ? colors.onAccent : colors.textTertiary;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: accent ? 15 : 16,
        gap: 14,
        backgroundColor: containerBg,
        borderRadius: accent ? 18 : 0,
      }}
    >
      {/* 38pt icon chip per Phase 16 row anatomy */}
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: chipBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={20} color={iconColor} strokeWidth={1.75} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: titleColor, fontSize: 16, fontWeight: '600' }}>{title}</Text>
        {sub && (
          <Text style={{ color: subColor, fontSize: 12.5, marginTop: 1 }}>{sub}</Text>
        )}
      </View>

      <ChevronRight size={18} color={chevronColor} />
    </Pressable>
  );
};

export default ProfileRow;
