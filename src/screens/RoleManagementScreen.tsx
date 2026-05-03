// src/screens/RoleManagementScreen.tsx
// Phase 5 — Admin role management screen (ADMIN-01 + ADMIN-02 + ADMIN-04 + ADMIN-06).
//
// Source pattern: fork of ModerationQueueScreen.tsx with the FlatList swapped from
// properties to users + a debounced search TextInput (D-01) + sibling-mounted
// RoleChangeModal (D-08).
//
// Phase 5 additions vs analog:
//   - 300ms debounced search via useEffect + setTimeout (D-01)
//   - Pitfall 5 stale-response guard via requestIdRef counter
//   - Pre-search state ("Type to search") when query is empty (D-03)
//   - Pagination hint footer when items.length === 50 (D-04)
//   - Self-row variant ("(you)" disabled badge) when user.uid === currentUser.localId (D-10)
//   - Color-coded userType pill on each row (D-02)
//   - LAST_ADMIN_LOCKOUT routes to native Alert.alert (D-09); other envelopes route
//     through the modal's inline error row (D-07/D-11)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { UserService, type AdminUserListItem, type UserRole } from '../services/UserService';
import RoleChangeModal, { type RoleChangeErrorCode } from '../components/RoleChangeModal';
import { PermissionDeniedError } from '../hooks/useRole';

interface RoleManagementScreenProps {
  onBack: () => void;
}

const REFRESH_COOLDOWN_MS = 60_000;
const SEARCH_DEBOUNCE_MS = 300;

const RoleManagementScreen: React.FC<RoleManagementScreenProps> = ({ onBack }) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();

  const [query, setQuery] = useState<string>('');
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
  const [submittingRole, setSubmittingRole] = useState<boolean>(false);
  const [modalErrorCode, setModalErrorCode] = useState<RoleChangeErrorCode | null>(null);

  const requestIdRef = useRef<number>(0);
  const lastRefreshAt = useRef<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setItems([]);
        setLoading(false);
        return;
      }
      const myId = ++requestIdRef.current;
      setLoading(true);
      try {
        const { items: results } = await UserService.searchUsers(q);
        if (myId !== requestIdRef.current) return; // Pitfall 5: stale response guard
        setItems(results);
      } catch (err: any) {
        if (myId !== requestIdRef.current) return;
        console.error('Failed to search users', err);
        if (err instanceof PermissionDeniedError || err?.message === 'E_PERMISSION_DENIED') {
          Alert.alert(t('common.error'), t('errors.permissionDenied'));
          onBack();
          return;
        }
        Alert.alert(
          t('common.error'),
          err?.response?.data?.message || err?.message || t('common.errorGeneric'),
        );
      } finally {
        if (myId === requestIdRef.current) setLoading(false);
      }
    },
    [t, onBack],
  );

  // Debounce query → search.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  // AppState 60s cooldown refetch (per-screen useRef cooldown — PATTERNS §F).
  useEffect(() => {
    const onChange = (nextState: AppStateStatus) => {
      if (nextState !== 'active') return;
      const now = Date.now();
      if (lastRefreshAt.current && now - lastRefreshAt.current < REFRESH_COOLDOWN_MS) return;
      lastRefreshAt.current = now;
      if (query.trim()) runSearch(query);
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [query, runSearch]);

  const handleRoleSubmit = async ({ uid, userType }: { uid: string; userType: UserRole }) => {
    setSubmittingRole(true);
    setModalErrorCode(null);
    try {
      const updated = await UserService.setUserRole(uid, userType);
      setItems((prev) => prev.map((u) => (u.uid === uid ? { ...u, ...updated } : u)));
      setSelectedUser(null);
      Alert.alert('', t('admin.roles.success.toast'));
    } catch (err: any) {
      const code = err?.response?.data?.code as string | undefined;
      const status = err?.response?.status as number | undefined;
      if (code === 'LAST_ADMIN_LOCKOUT') {
        const displayName =
          (selectedUser?.firstName || selectedUser?.lastName)
            ? `${selectedUser?.firstName || ''} ${selectedUser?.lastName || ''}`.trim()
            : selectedUser?.email || '';
        Alert.alert(
          t('admin.roles.error.lastAdminLockout.title'),
          t('admin.roles.error.lastAdminLockout.body', { displayName }),
        );
      } else if (code === 'SELF_MUTATION') {
        setModalErrorCode('SELF_MUTATION');
      } else if (code === 'ROLE_ALREADY_CHANGED') {
        setModalErrorCode('ROLE_ALREADY_CHANGED');
      } else if (code === 'USER_NOT_FOUND' || status === 404) {
        setModalErrorCode('USER_NOT_FOUND');
      } else {
        setModalErrorCode('NETWORK');
      }
    } finally {
      setSubmittingRole(false);
    }
  };

  const isSelf = (item: AdminUserListItem) =>
    !!currentUser && item.uid === (currentUser as any).localId;

  const pillColorFor = (role: UserRole): string => {
    if (role === 'admin') return colors.accent;
    if (role === 'moderator') return colors.success;
    return colors.textTertiary;
  };

  const renderItem = ({ item }: { item: AdminUserListItem }) => {
    const self = isSelf(item);
    const displayName = `${item.firstName || ''} ${item.lastName || ''}`.trim();
    const RowWrapper: any = self ? View : TouchableOpacity;
    const wrapperProps = self
      ? {}
      : {
          onPress: () => {
            setModalErrorCode(null);
            setSelectedUser(item);
          },
          activeOpacity: 0.7,
        };
    return (
      <RowWrapper
        style={[
          styles.row,
          { borderBottomColor: colors.border, opacity: self ? 0.6 : 1.0 },
        ]}
        {...wrapperProps}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.email, { color: colors.text }]}>{item.email}</Text>
          {!!displayName && (
            <Text style={[styles.metaLine, { color: colors.textSecondary }]}>{displayName}</Text>
          )}
          {!!item.roleRevokedAt && (
            <Text style={[styles.metaLine, { color: colors.textSecondary }]}>
              {t('admin.roles.revokedAt', {
                date: new Date(item.roleRevokedAt).toLocaleDateString(),
              })}
            </Text>
          )}
        </View>
        {self ? (
          <View style={[styles.pill, { backgroundColor: colors.inputBackground }]}>
            <Text style={[styles.pillText, { color: colors.textTertiary }]}>
              {t('admin.roles.selfBadge')}
            </Text>
          </View>
        ) : (
          <View style={[styles.pill, { backgroundColor: pillColorFor(item.userType) }]}>
            <Text style={[styles.pillText, { color: '#FFFFFF' }]}>
              {t(`admin.roles.label.${item.userType}` as const)}
            </Text>
          </View>
        )}
      </RowWrapper>
    );
  };

  const showPreSearch = query.trim() === '';
  const showRefineHint = items.length === 50;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.iconButton} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('admin.roles.title')}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={[styles.searchWrap, { borderBottomColor: colors.border }]}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder={t('admin.roles.search.placeholder')}
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="search"
        />
      </View>
      {showPreSearch ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.preSearchHint, { color: colors.textTertiary }]}>
            {t('admin.roles.search.prompt')}
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('admin.roles.search.noResults', { query })}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id || item.uid}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await runSearch(query);
                setRefreshing(false);
              }}
              tintColor={colors.primary}
            />
          }
          ListFooterComponent={
            showRefineHint ? (
              <Text style={[styles.refineHint, { color: colors.textSecondary }]}>
                {t('admin.roles.search.refineHint')}
              </Text>
            ) : null
          }
        />
      )}
      <RoleChangeModal
        user={selectedUser}
        onClose={() => {
          setSelectedUser(null);
          setModalErrorCode(null);
        }}
        onSubmit={handleRoleSubmit}
        submitting={submittingRole}
        errorCode={modalErrorCode}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  iconButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  searchInput: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    fontSize: 14,
  },
  listContent: { paddingVertical: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  email: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  metaLine: { fontSize: 13, fontWeight: '400', lineHeight: 18, marginTop: 2 },
  pill: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '600', lineHeight: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  preSearchHint: { fontSize: 14, fontWeight: '400', lineHeight: 20, textAlign: 'center' },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  refineHint: { fontSize: 13, fontWeight: '400', lineHeight: 18, textAlign: 'center', paddingVertical: 24 },
});

export default RoleManagementScreen;
