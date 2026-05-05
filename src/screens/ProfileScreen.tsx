import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Calendar, ClipboardList, Plus, ChevronRight, LogOut, Inbox, UserCog } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthService } from '../services/AuthService';
import { AppointmentService } from '../services/AppointmentService';
import { PropertyService } from '../services/PropertyService';
import { LandlordApplicationStatusBanner } from '../components/LandlordApplicationStatusBanner';

interface ProfileScreenProps {
    onBack: () => void;
    onCreateListing?: () => void;
    onViewListings?: () => void;
    onViewFavorites?: () => void;
    onViewAppointments?: () => void;
    onViewAccountSettings?: () => void;
    onApplyLandlord?: () => void;
    onReviewLandlordApplications?: () => void;
    // Phase 3 additions (Plan 03-04 / D-03; CR-02 amendment 2026-05-02):
    // onReviewModerationQueue navigates to <ModerationQueueScreen> (App.tsx Plan 06 wires it).
    // moderationCountRefreshKey is bumped by App.tsx whenever the queue overlay closes
    // (or an edit-on-behalf flow starts) so this screen — kept alive under the overlay —
    // refreshes the pending-count badge without depending on AppState 'active' alone.
    // CR-02 fix removed the prior pendingModerationCount prop: parent-owned count had no
    // AppState listener and shadowed this screen's cooldown ref, leaving the badge stale.
    onReviewModerationQueue?: () => void;
    onOpenRoleManagement?: () => void;  // Phase 5 — admin-only role management entry-point dispatch
    moderationCountRefreshKey?: number;
}

function ProfileScreenComponent({ onBack, onCreateListing, onViewListings, onViewFavorites, onViewAppointments, onViewAccountSettings, onApplyLandlord, onReviewLandlordApplications, onReviewModerationQueue, onOpenRoleManagement, moderationCountRefreshKey }: ProfileScreenProps) {
    const { user, logout } = useAuth();
    const { t } = useLanguage();
    const { isDark } = useTheme();
    const { can, role } = useRole();

    const [canListProperties, setCanListProperties] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [blockSize, setBlockSize] = useState<'30min' | '60min'>('30min');
    const profileDataLoadedRef = useRef(false);

    /** Same listing tools as renters; admins keep access. Encapsulated in can('manageListings') per D-12. */
    const canManageListings = can('manageListings');
    const canReviewLandlordApplications = can('reviewLandlordApplications');
    // Phase 3 (Plan 02 added the Action union member; Plan 03-04 consumes it).
    const canViewModerationQueue = can('viewModerationQueue');
    const canManageRoles = can('manageRoles');  // Phase 5 — admin-only entry-point gate

    // Pending-count state. CR-02 fix: this screen owns the count entirely now —
    // App.tsx no longer fetches it. Refetches on mount, on AppState 'active' (with
    // 60s cooldown ref per PATTERNS §E), and whenever moderationCountRefreshKey
    // changes (App.tsx bumps it on queue overlay close + edit-on-behalf launch so
    // the badge stays fresh after the moderator's own actions).
    const [pendingCount, setPendingCount] = useState<number>(0);
    const displayCount = pendingCount;

    // Self-fetch on mount AND whenever moderationCountRefreshKey changes (App.tsx
    // bumps it on queue close so the badge updates immediately after a mod action).
    useEffect(() => {
        if (!canViewModerationQueue) return;
        let cancelled = false;
        (async () => {
            try {
                const count = await PropertyService.getModerationQueueCount();
                if (!cancelled) setPendingCount(count);
            } catch {
                /* non-fatal — badge silently stays at 0 (server 403 / network blip) */
            }
        })();
        return () => { cancelled = true; };
    }, [canViewModerationQueue, moderationCountRefreshKey]);

    // AppState 'active' refresh — own per-screen cooldown ref (PATTERNS §E).
    // The 60s cooldown is independent from the AuthContext refreshRole cooldown AND from
    // the ModerationQueueScreen's own cooldown — each consumer fires its OWN work on
    // its OWN schedule. CR-02 fix: this listener is now load-bearing (no parent-owned
    // count to shadow it), so a moderator returning from background sees a fresh count.
    const lastCountFetchAt = useRef<number | null>(null);
    useEffect(() => {
        if (!canViewModerationQueue) return;
        const onChange = (nextState: AppStateStatus) => {
            if (nextState !== 'active') return;
            const now = Date.now();
            if (lastCountFetchAt.current && now - lastCountFetchAt.current < 60_000) return;
            lastCountFetchAt.current = now;
            PropertyService.getModerationQueueCount()
                .then(setPendingCount)
                .catch(() => { /* non-fatal */ });
        };
        const sub = AppState.addEventListener('change', onChange);
        return () => sub.remove();
    }, [canViewModerationQueue]);

    const themeStyles = useMemo(
        () => ({
            background: isDark ? '#000000' : '#F2F2F7',
            surface: isDark ? '#1E1E1E' : '#FFFFFF',
            text: isDark ? '#FFFFFF' : '#000000',
            textSecondary: isDark ? '#8E8E93' : '#3C3C4399',
            border: isDark ? '#2C2C2E' : '#E5E5EA',
            accent: '#3B82F6',
            avatarBg: isDark ? '#2C2C2E' : '#E5E5EA',
            danger: '#FF453A',
        }),
        [isDark],
    );

    useEffect(() => {
        if (!user?.localId) {
            profileDataLoadedRef.current = false;
            setLoading(false);
            return;
        }
        let cancelled = false;
        const run = async () => {
            const showBlockingLoader = !profileDataLoadedRef.current;
            if (showBlockingLoader) {
                setLoading(true);
            }
            try {
                const [profile, settings] = await Promise.all([
                    AuthService.getBackendUser(user.localId),
                    AppointmentService.getOwnerSettings().catch(() => null),
                ]);
                if (cancelled) return;
                if (settings) setBlockSize(settings.blockSize || '30min');
                if (profile) {
                    setCanListProperties(profile.canListProperties === true);
                }
                profileDataLoadedRef.current = true;
            } catch (error) {
                console.error('Failed to load profile', error);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [user?.localId]);

    const handleLogout = async () => {
        Alert.alert(
            t('profile.logOut'),
            t('profile.logOutConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('profile.logOut'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoggingOut(true);
                            // silent=true: user-initiated sign-out should not show the
                            // D-11 "Session expired" toast (that's reserved for forced
                            // hard-logout via apiClient interceptor).
                            await logout(true);
                            onBack(); // Close profile and return to main/home screen
                        } catch (error) {
                            console.error('Logout failed', error);
                            Alert.alert(t('common.error'), t('profile.logOutFailed'));
                        } finally {
                            setLoggingOut(false);
                        }
                    }
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: themeStyles.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={themeStyles.accent} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeStyles.background }]}>
            <View style={[styles.header, { borderBottomColor: themeStyles.border }]}>
                <TouchableOpacity onPress={onBack} style={styles.iconButton}>
                    <Text style={{ fontSize: 24, color: themeStyles.accent }}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: themeStyles.text }]}>{t('profile.myProfile')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} style={styles.scrollView}>
                {/* User Info Card */}
                <TouchableOpacity
                    style={[styles.profileCard, { backgroundColor: themeStyles.surface }]}
                    onPress={onViewAccountSettings}
                    activeOpacity={0.8}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.avatar, { backgroundColor: themeStyles.avatarBg }]}>
                            <Text style={[styles.avatarText, { color: themeStyles.text }]}>
                                {user?.email?.charAt(0).toUpperCase() || 'U'}
                            </Text>
                        </View>
                        <View style={{ marginLeft: 16, flex: 1 }}>
                            <Text style={[styles.email, { color: themeStyles.text }]}>{user?.email}</Text>
                            <Text style={[styles.role, { color: themeStyles.accent }]}>
                                {role === 'admin'
                                    ? t('profile.role.admin')
                                    : role === 'moderator'
                                        ? t('profile.role.moderator')
                                        : canListProperties
                                            ? t('profile.role.host')
                                            : t('profile.role.member')}
                            </Text>
                            <Text style={[styles.accountSettings, { color: themeStyles.textSecondary }]}>{t('profile.accountSettings')}</Text>
                        </View>
                        <ChevronRight size={20} color={themeStyles.textSecondary} />
                    </View>
                </TouchableOpacity>

                {/* Phase 4.5 — Landlord application status (own state). Admin/moderator banner self-suppresses. */}
                {onApplyLandlord && (
                    <LandlordApplicationStatusBanner onPress={onApplyLandlord} />
                )}

                {/* Menu Card - grouped items with internal dividers */}
                <View style={[styles.menuCard, { backgroundColor: themeStyles.surface, borderColor: themeStyles.border }]}>
                    <TouchableOpacity style={styles.menuRow} onPress={onViewFavorites} activeOpacity={0.7}>
                        <Heart size={22} color={themeStyles.accent} strokeWidth={1.5} />
                        <Text style={[styles.menuText, { color: themeStyles.text, flex: 1 }]}>{t('profile.favorites')}</Text>
                        <ChevronRight size={20} color={themeStyles.textSecondary} />
                    </TouchableOpacity>

                    <View style={[styles.menuDivider, { backgroundColor: themeStyles.border }]} />
                    <TouchableOpacity style={styles.menuRow} onPress={onViewAppointments} activeOpacity={0.7}>
                        <Calendar size={22} color={themeStyles.accent} strokeWidth={1.5} />
                        <Text style={[styles.menuText, { color: themeStyles.text, flex: 1 }]}>{t('profile.appointments')}</Text>
                        <ChevronRight size={20} color={themeStyles.textSecondary} />
                    </TouchableOpacity>

                    {canManageListings && (
                        <>
                            <View style={[styles.menuDivider, { backgroundColor: themeStyles.border }]} />
                            <TouchableOpacity style={styles.menuRow} onPress={onViewListings} activeOpacity={0.7}>
                                <ClipboardList size={22} color={themeStyles.accent} strokeWidth={1.5} />
                                <Text style={[styles.menuText, { color: themeStyles.text, flex: 1 }]}>{t('profile.myListings')}</Text>
                                <ChevronRight size={20} color={themeStyles.textSecondary} />
                            </TouchableOpacity>
                            <View style={[styles.menuDivider, { backgroundColor: themeStyles.border }]} />
                            <TouchableOpacity
                                style={[styles.menuRow, styles.createListingRow, { backgroundColor: themeStyles.accent }]}
                                onPress={onCreateListing}
                                activeOpacity={0.7}
                            >
                                <Plus size={22} color="#FFF" strokeWidth={2} />
                                <Text style={[styles.menuText, { color: '#FFF', flex: 1 }]}>{t('profile.createListing')}</Text>
                                <ChevronRight size={20} color="#FFF" />
                            </TouchableOpacity>
                        </>
                    )}
                    {canReviewLandlordApplications && onReviewLandlordApplications && (
                        <>
                            <View style={[styles.menuDivider, { backgroundColor: themeStyles.border }]} />
                            <TouchableOpacity style={styles.menuRow} onPress={onReviewLandlordApplications} activeOpacity={0.7}>
                                <Inbox size={22} color={themeStyles.accent} strokeWidth={1.5} />
                                <Text style={[styles.menuText, { color: themeStyles.text, flex: 1 }]}>{t('landlordApp.adminQueueTitle')}</Text>
                                <ChevronRight size={20} color={themeStyles.textSecondary} />
                            </TouchableOpacity>
                        </>
                    )}
                    {/* Phase 3 (Plan 03-04 / D-03) — Moderation Queue entry-point row gated
                        by canViewModerationQueue. Pending-count badge follows mainstream-mobile
                        inbox precedent (Mail / Slack); badge hidden when count === 0 so the
                        moderator can still verify the queue is empty. */}
                    {canViewModerationQueue && onReviewModerationQueue && (
                        <>
                            <View style={[styles.menuDivider, { backgroundColor: themeStyles.border }]} />
                            <TouchableOpacity
                                style={styles.menuRow}
                                onPress={onReviewModerationQueue}
                                activeOpacity={0.7}
                                // WR-02 fix — was hardcoded English "X pending" suffix; now fully translated.
                                accessibilityLabel={`${t('moderation.queue.entryPoint')}: ${t('moderation.queue.entryPoint.a11yPending').replace('{count}', String(displayCount))}`}
                            >
                                <Inbox size={22} color={themeStyles.accent} strokeWidth={1.5} />
                                <Text style={[styles.menuText, { color: themeStyles.text, flex: 1 }]}>
                                    {t('moderation.queue.entryPoint')}
                                </Text>
                                {displayCount > 0 && (
                                    <View style={[styles.pendingBadge, { backgroundColor: themeStyles.accent }]}>
                                        <Text style={styles.pendingBadgeText}>{displayCount}</Text>
                                    </View>
                                )}
                                <ChevronRight size={20} color={themeStyles.textSecondary} />
                            </TouchableOpacity>
                        </>
                    )}
                    {/* Phase 5 — Admin role management entry-point (sibling to Moderation Queue row;
                        no pending-count badge per UI-SPEC). Double-gated: canManageRoles + parent
                        passes onOpenRoleManagement only when canManageRoles is also true in App.tsx. */}
                    {canManageRoles && onOpenRoleManagement && (
                        <>
                            <View style={[styles.menuDivider, { backgroundColor: themeStyles.border }]} />
                            <TouchableOpacity
                                style={styles.menuRow}
                                onPress={onOpenRoleManagement}
                                activeOpacity={0.7}
                                accessibilityLabel={t('admin.roles.entryPoint')}
                            >
                                <UserCog size={22} color={themeStyles.accent} strokeWidth={1.5} />
                                <Text style={[styles.menuText, { color: themeStyles.text, flex: 1 }]}>
                                    {t('admin.roles.entryPoint')}
                                </Text>
                                <ChevronRight size={20} color={themeStyles.textSecondary} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Log Out - pinned to bottom */}
            <View style={[styles.logoutFooter, { backgroundColor: themeStyles.background, borderTopColor: themeStyles.border }]}>
                <TouchableOpacity
                    style={[
                        styles.logoutButton,
                        {
                            backgroundColor: isDark ? themeStyles.surface : 'transparent',
                            borderColor: themeStyles.danger,
                        },
                    ]}
                    onPress={handleLogout}
                    disabled={loggingOut}
                >
                    {loggingOut ? (
                        <ActivityIndicator color={themeStyles.danger} />
                    ) : (
                        <View style={styles.logoutContent}>
                            <LogOut size={20} color={themeStyles.danger} strokeWidth={2} />
                            <Text style={[styles.logoutText, { color: themeStyles.danger }]}>{t('profile.logOut')}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

export const ProfileScreen = memo(ProfileScreenComponent);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 0,
        paddingVertical: 10,
        marginBottom: 20,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    iconButton: {
        padding: 8,
        marginLeft: 15,
    },
    profileCard: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    email: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    role: {
        fontSize: 14,
        marginBottom: 2,
    },
    accountSettings: {
        fontSize: 12
    },
    availabilitySection: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
    },
    availabilityLabel: { fontSize: 16, fontWeight: '600' },
    blockSizeButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#3B82F6',
    },
    blockSizeText: { fontSize: 14, fontWeight: '600' },
    availabilityHint: { fontSize: 12, marginTop: 8 },
    menuCard: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 24,
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        gap: 12,
    },
    menuDivider: {
        height: 1,
        marginLeft: 50,
    },
    createListingRow: {},
    menuText: {
        fontSize: 16,
        fontWeight: '600',
    },
    // Phase 3 (Plan 03-04 / D-03) — pending-count badge geometry per UI-SPEC
    // §"Profile entry-point geometry": borderRadius 10 / paddingHorizontal 6 /
    // paddingVertical 2 / minWidth 20. Typography 11/600/14 — IDENTICAL to Phase 2
    // <StatusPill> per UI-SPEC §Typography (reuse, not redeclare).
    pendingBadge: {
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        minWidth: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    pendingBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600', lineHeight: 14 },
    logoutFooter: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    logoutButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        flexDirection: 'row',
    },
    logoutContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
    },
});