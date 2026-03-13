import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Heart, Plus, MessageCircle, User } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export type TabId = 'home' | 'favorites' | 'add' | 'chat' | 'profile';

const TAB_IDS: TabId[] = ['home', 'favorites', 'add', 'chat', 'profile'];

const TAB_ICONS: Record<TabId, typeof Search> = {
  home: Search,
  favorites: Heart,
  add: Plus,
  chat: MessageCircle,
  profile: User,
};

interface BottomNavigatorProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  chatUnreadCount?: number;
}

export const BottomNavigator: React.FC<BottomNavigatorProps> = ({ activeTab, onTabChange, chatUnreadCount = 0 }) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  const tabBarBg = isDark ? '#1A1B1E' : colors.surface;
  const inactiveColor = isDark ? '#9CA3AF' : colors.textSecondary;
  const activeColor = colors.accent;
  const addButtonBg = isDark ? '#E5E7EB' : '#E8E8E8';
  const addButtonIconColor = isDark ? '#1F2937' : colors.text;

  return (
    <View style={[
      styles.container,
      { backgroundColor: tabBarBg, paddingBottom: bottomInset },
      !isDark && { borderTopWidth: 1, borderTopColor: colors.border },
    ]}>
      {TAB_IDS.map((id) => {
        const Icon = TAB_ICONS[id];
        const label = id === 'home' ? t('nav.search') : id === 'favorites' ? t('nav.favorites') : id === 'add' ? t('nav.add') : id === 'chat' ? t('nav.chat') : t('nav.profile');
        const isActive = activeTab === id;
        const isAdd = id === 'add';

        if (isAdd) {
          return (
            <TouchableOpacity
              key={id}
              activeOpacity={0.8}
              onPress={() => onTabChange('add')}
              style={styles.addButtonWrapper}
            >
              <View style={[styles.addButton, { backgroundColor: addButtonBg }]}>
                <Plus size={28} color={addButtonIconColor} strokeWidth={2.5} />
              </View>
              <Text style={[styles.addLabel, { color: inactiveColor }]}>{label}</Text>
            </TouchableOpacity>
          );
        }

        const iconColor = isActive ? activeColor : inactiveColor;
        const showBadge = id === 'chat' && chatUnreadCount > 0;
        return (
          <TouchableOpacity
            key={id}
            activeOpacity={0.7}
            onPress={() => onTabChange(id)}
            style={styles.tab}
          >
            <View>
              <Icon size={24} color={iconColor} strokeWidth={2} />
              {showBadge && (
                <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.badgeText}>
                    {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, { color: iconColor }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  addButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: -8,
    paddingBottom: 2,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  addLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
