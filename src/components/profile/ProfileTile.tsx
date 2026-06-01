/**
 * ProfileTile — vertical-stack 2×2-grid tile primitive.
 *
 * Phase 16 Plan 16-01 (PROF-02). Consumed by ProfileScreen's admin-layout
 * MY ACTIVITY grid (Favorites, Appointments, My Listings, Create Listing).
 *
 * Inner layout (per CONTEXT §Specifics "icon LARGE on top, not inline"):
 *   - 44×44 icon chip on top
 *   - 12px vertical gap
 *   - title (15/600)
 *   - sub (12) — optional
 *
 * Geometry analog: PropertyDetailsScreen mediaGridCard (`minWidth: '48%' + flex: 1`)
 * adapted to vertical-stack. Width fallback uses `colors.border` (not `colors.hair`
 * which doesn't exist — auto-fix Rule 3, per existing 2×2 tile precedent).
 *
 * `accent={true}` variant: backgroundColor = colors.accent, no border;
 * inner chip uses semi-transparent white literal (legibility over fill).
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

export interface ProfileTileProps {
  Icon: LucideIcon;
  title: string;
  sub?: string;
  onPress: () => void;
  /** Accent-filled variant for the "Create Listing" tile. */
  accent?: boolean;
  testID?: string;
}

const ProfileTile: React.FC<ProfileTileProps> = ({ Icon, title, sub, onPress, accent, testID }) => {
  const { colors } = useTheme();

  const bg = accent ? colors.accent : colors.surface;
  const chipBg = accent ? 'rgba(255,255,255,0.2)' : colors.surface2;
  const iconColor = accent ? colors.onAccent : colors.iconChipFg;
  const titleColor = accent ? colors.onAccent : colors.text;
  const subColor = accent ? 'rgba(255,255,255,0.85)' : colors.textTertiary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      testID={testID}
      style={{
        minWidth: '48%',
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 18,
        backgroundColor: bg,
        borderWidth: accent ? 0 : 1,
        borderColor: accent ? 'transparent' : colors.border,
      }}
    >
      {/* Icon chip on top (44×44) */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: chipBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Icon size={22} color={iconColor} strokeWidth={1.75} />
      </View>

      <Text style={{ color: titleColor, fontSize: 15, fontWeight: '600' }}>{title}</Text>
      {sub && (
        <Text style={{ color: subColor, fontSize: 12, marginTop: 2 }}>{sub}</Text>
      )}
    </Pressable>
  );
};

export default ProfileTile;
