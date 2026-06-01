/**
 * ProfileToolTile — admin-tools tile primitive with pendingCount badge + wide override.
 *
 * Phase 16 Plan 16-01 (PROF-02 / D-05). Consumed by ProfileScreen's admin-layout
 * ADMIN TOOLS section (Landlord Applications, Moderation Queue, Role Management).
 *
 * Same vertical-stack geometry as ProfileTile so the dashboard reads as one grid.
 * Adds:
 *   - `badge?: number` — top-right pendingCount pill (renders only when > 0).
 *     Geometry copied from current ProfileScreen.tsx:455-464 (pendingBadge).
 *     Swaps the legacy hex literal '#FFFFFF' for colors.onAccent token.
 *   - `wide?: boolean` — full-width override for odd-3rd-tile (Role Management
 *     when isAdmin shows 3 tools).
 *
 * No accent variant (admin tools are never accent-filled per handoff).
 *
 * D-05 callsite (Plan 16-02): `wide={TOOLS.length % 2 === 1 && i === TOOLS.length - 1}`.
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

export interface ProfileToolTileProps {
  Icon: LucideIcon;
  title: string;
  sub?: string;
  onPress: () => void;
  /** Pending-count badge. Renders only when truthy and > 0. */
  badge?: number;
  /** When true, tile takes the full grid row (D-05 odd-last-tile). */
  wide?: boolean;
  testID?: string;
}

const ProfileToolTile: React.FC<ProfileToolTileProps> = ({
  Icon,
  title,
  sub,
  onPress,
  badge,
  wide,
  testID,
}) => {
  const { colors } = useTheme();
  const showBadge = typeof badge === 'number' && badge > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      testID={testID}
      style={
        wide
          ? {
              width: '100%',
              paddingVertical: 14,
              paddingHorizontal: 14,
              borderRadius: 18,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }
          : {
              minWidth: '48%',
              flex: 1,
              paddingVertical: 14,
              paddingHorizontal: 14,
              borderRadius: 18,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }
      }
    >
      {/* Top row: icon chip on the left + badge floated right */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: colors.surface2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={22} color={colors.iconChipFg} strokeWidth={1.75} />
        </View>
        {showBadge && (
          <View
            style={{
              borderRadius: 10,
              paddingHorizontal: 6,
              paddingVertical: 2,
              minWidth: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accent,
            }}
          >
            <Text
              style={{
                color: colors.onAccent,
                fontSize: 11,
                fontWeight: '600',
                lineHeight: 14,
              }}
            >
              {badge}
            </Text>
          </View>
        )}
      </View>

      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{title}</Text>
      {sub && (
        <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>{sub}</Text>
      )}
    </Pressable>
  );
};

export default ProfileToolTile;
