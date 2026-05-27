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
} from 'react-native';
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

interface AdminListingMenuProps {
  listingStatus: 'pending' | 'live' | 'rejected' | 'archived' | undefined;
  onSelect: (action: AdminListingMenuAction) => void;
}

export const AdminListingMenu: React.FC<AdminListingMenuProps> = ({
  listingStatus,
  onSelect,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { can } = useRole();
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
          style={[styles.backdrop, { backgroundColor: colors.scrim }]}
          onPress={() => setOpen(false)}
        >
          <View
            style={[
              styles.menu,
              {
                backgroundColor: colors.surface,
                shadowColor: colors.cardShadow,
              },
            ]}
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
                onPress={
                  deleteEnabled ? () => handlePick('delete') : undefined
                }
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
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

interface MenuItemProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  helper?: string;
  textColor: string;
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
    onPress={onPress}
    disabled={disabled || !onPress}
    style={styles.item}
    accessibilityRole="button"
    accessibilityState={{ disabled: !!disabled }}
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
    paddingTop: 56, // sits below the header
    paddingRight: 12,
  },
  menu: {
    minWidth: 220,
    borderRadius: 12,
    paddingVertical: 6,
    elevation: 6,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  helper: {
    fontSize: 12,
    marginTop: 2,
  },
});
