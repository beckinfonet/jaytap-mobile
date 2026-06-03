/**
 * IdentityCard — avatar + name/email + optional RoleBadge + accountSettings pill.
 *
 * Phase 16 Plan 16-01 (PROF-01/02 / D-03). Consumed at the top of both ProfileScreen
 * layouts (user + admin). Whole card is tappable per D-03 — the accent-soft pill
 * is a visual affordance, NOT an interactive child.
 *
 * Adaptation source: existing ProfileScreen.tsx:199-225 (current identity card JSX)
 *   - swap themeStyles.* for colors.* tokens
 *   - bump avatar 50→54 per handoff (CONTEXT §Specifics)
 *   - replace inline role-text Text with <RoleBadge> when role !== 'user'
 *   - replace accountSettings Text with a small accent-soft pill (visual only)
 *
 * Caller passes both the localized accountSettingsLabel AND, when applicable,
 * the localized roleBadgeLabel (e.g. t('profile.staffBadge.admin')) — the badge
 * primitive itself is locale-agnostic.
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import RoleBadge from './RoleBadge';

export interface IdentityCardProps {
  email: string;
  role: 'admin' | 'moderator' | 'user';
  onPress: () => void;
  /** Already-localized text for the visual "Account settings ›" pill (D-03). */
  accountSettingsLabel: string;
  /**
   * Already-localized uppercase label for the RoleBadge (e.g. 'ADMIN').
   * Required when role !== 'user'; ignored otherwise.
   */
  roleBadgeLabel?: string;
  testID?: string;
}

const IdentityCard: React.FC<IdentityCardProps> = ({
  email,
  role,
  onPress,
  accountSettingsLabel,
  roleBadgeLabel,
  testID,
}) => {
  const { colors } = useTheme();
  const showBadge = role !== 'user' && roleBadgeLabel;
  const initial = email?.charAt(0).toUpperCase() || 'U';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={email}
      testID={testID}
      style={{
        padding: 20,
        borderRadius: 20,
        backgroundColor: colors.surface,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Avatar */}
        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: 27,
            backgroundColor: colors.surface2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>{initial}</Text>
        </View>

        {/* Name/email + visual pills column */}
        <View style={{ marginLeft: 16, flex: 1 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 16,
              fontWeight: '700',
              marginBottom: 6,
            }}
            numberOfLines={1}
          >
            {email}
          </Text>

          {/* Visual "Account settings ›" pill — non-interactive (D-03).
              260603-fyy — re-tinted from brand pink (accent) to the landlord-green
              hue to match the 'You're a Landlord' banner accent. */}
          <View
            style={{
              alignSelf: 'flex-start',
              paddingVertical: 4,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: colors.landlordGreenSoft,
            }}
          >
            <Text
              style={{
                color: colors.landlordGreen,
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              {accountSettingsLabel}
            </Text>
          </View>

          {showBadge && (
            <View style={{ marginTop: 8 }}>
              <RoleBadge role={role as 'admin' | 'moderator'} label={roleBadgeLabel!} />
            </View>
          )}
        </View>

        <ChevronRight size={20} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
};

export default IdentityCard;
