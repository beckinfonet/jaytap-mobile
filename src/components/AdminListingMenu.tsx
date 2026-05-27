/**
 * AdminListingMenu — kebab/3-dot dropdown rendered in the PropertyDetailsScreen
 * header for moderator/admin users. Surfaces four actions: Edit media, Suspend
 * (or Restore when archived), Delete (admin-only, gated on archived), and
 * Manage listing… (opens ListingAdminScreen).
 *
 * Layer-2 role gate: parent decides whether to render this component, but this
 * component also re-checks `useRole().can('editAnyListing')` internally before
 * surfacing anything. Layer-3 (services) catches any remaining role drift.
 *
 * No business logic — onSelect dispatches the chosen action to the parent,
 * which owns API calls and modals.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoreVertical } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useRole } from '../hooks/useRole';

export type AdminListingMenuAction =
  | 'editMedia'
  | 'suspend'
  | 'restore'
  | 'delete'
  | 'manage';

/** Listing status union — matches src/types/Property.ts `status?`. Accepts null
 *  in addition to undefined because API-backed fields elsewhere in the codebase
 *  routinely surface as `string | null` after JSON deserialization. */
type ListingStatus = 'pending' | 'live' | 'rejected' | 'archived';

interface AdminListingMenuProps {
  listingStatus: ListingStatus | null | undefined;
  onSelect: (action: AdminListingMenuAction) => void;
  /** Optional style applied to the kebab trigger so parents can match the
   *  surrounding header's icon-button shape (rounded surface, shadow, etc.). */
  triggerStyle?: StyleProp<ViewStyle>;
}

export const AdminListingMenu: React.FC<AdminListingMenuProps> = ({
  listingStatus,
  onSelect,
  triggerStyle,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { can } = useRole();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  if (!can('editAnyListing')) return null;

  const isArchived = listingStatus === 'archived';
  const canDelete = can('hardDeleteListing');
  const deleteEnabled = isArchived;

  const handlePick = useCallback(
    (action: AdminListingMenuAction) => {
      setOpen(false);
      onSelect(action);
    },
    [onSelect],
  );

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('adminListing.menu.a11y')}
        onPress={() => setOpen(true)}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
        style={triggerStyle}
      >
        <MoreVertical color={colors.text} size={22} />
      </TouchableOpacity>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={[
            styles.backdrop,
            {
              backgroundColor: colors.scrim,
              // Header height (~56) + safe-area top inset so the menu clears
              // notched / Dynamic Island devices. Project convention is to use
              // useSafeAreaInsets() for vertical offsets near system chrome.
              paddingTop: insets.top + 56,
            },
          ]}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel={t('common.dismiss')}
        >
          {/* Intercept presses on the menu card so they don't bubble to the
              backdrop's onPress and close the sheet. Without this no-op
              Pressable, empty padding strips inside the card would close the
              menu on tap (RN Pressable propagation footgun). */}
          <Pressable
            onPress={() => {}}
            style={[
              styles.menu,
              {
                backgroundColor: colors.surface,
                shadowColor: colors.cardShadow,
              },
            ]}
            accessibilityViewIsModal
          >
            <MenuItem
              label={t('adminListing.menu.editMedia')}
              onPress={() => handlePick('editMedia')}
              textColor={colors.text}
            />
            {isArchived ? (
              <MenuItem
                label={t('adminListing.menu.restore')}
                onPress={() => handlePick('restore')}
                textColor={colors.text}
              />
            ) : (
              <MenuItem
                label={t('adminListing.menu.suspend')}
                onPress={() => handlePick('suspend')}
                textColor={colors.text}
              />
            )}
            {canDelete && (
              <MenuItem
                label={t('adminListing.menu.delete')}
                onPress={() => handlePick('delete')}
                disabled={!deleteEnabled}
                helper={
                  !deleteEnabled
                    ? t('adminListing.delete.blockedReason')
                    : undefined
                }
                textColor={deleteEnabled ? colors.error : colors.textSecondary}
                helperColor={colors.textSecondary}
              />
            )}
            <MenuItem
              label={t('adminListing.menu.manage')}
              onPress={() => handlePick('manage')}
              textColor={colors.text}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

interface MenuItemProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  helper?: string;
  textColor: string;
  /** Required when `helper` is set so the helper Text has a defined color. */
  helperColor?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({
  label,
  onPress,
  disabled,
  helper,
  textColor,
  helperColor,
}) => (
  <TouchableOpacity
    onPress={disabled ? undefined : onPress}
    disabled={disabled}
    style={styles.item}
    accessibilityRole="button"
    accessibilityState={{ disabled: !!disabled }}
    // Concatenate the helper into the a11y label so screen readers announce
    // the disabled reason in the same breath as the label; also set
    // accessibilityHint as a redundant hook for assistive tech that reads
    // hints separately from labels.
    accessibilityLabel={helper ? `${label}. ${helper}` : label}
    accessibilityHint={helper}
  >
    <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    {helper && (
      <Text style={[styles.helper, { color: helperColor }]}>{helper}</Text>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 12,
  },
  menu: {
    minWidth: 220,
    borderRadius: 12,
    paddingVertical: 6,
    // Popover/floating-menu elevation tier — matches DeleteListingModal /
    // DeleteAccountModal precedent for floating surfaces sitting above
    // both the main stack and the scrim.
    elevation: 8,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  helper: {
    fontSize: 12,
    marginTop: 2,
  },
});
