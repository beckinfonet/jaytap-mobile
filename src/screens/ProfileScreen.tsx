/**
 * ProfileScreen — Phase 16 reskin (Plan 16-02).
 *
 * Role-discriminated layouts gated by useRole():
 *   - role === 'user'  -> grouped-rows (ACTIVITY card + HOSTING card + Create Listing accent row).
 *   - isAdmin || isModerator -> tile dashboard (MY ACTIVITY 2x2 + ADMIN TOOLS role-gated tiles,
 *     Role Management renders wide={true} when admin (odd 3rd tile) per D-05).
 *
 * Preserved verbatim through the rewrite (load-bearing per CR-02 memo + Pitfall 3):
 *   - pendingCount state + the two useEffects + the 60s cooldown ref (the
 *     mount/moderationCountRefreshKey self-fetch + the AppState 'active' refresh listener).
 *   - The 9 nav-handler props + moderationCountRefreshKey shape; App.tsx is untouched.
 *   - LandlordApplicationStatusBanner mount (unconditional in both layouts -- the component
 *     self-suppresses for staff at its own line 88 per D-06).
 *
 * Removed:
 *   - The M3-era inline theme-memo block (D-07 / Phase 12 anti-pattern). All colors
 *     now route through useTheme().colors at the render-site.
 *   - blockSize state + AppointmentService.getOwnerSettings() leg of the profile fetch
 *     (dead code per A3 -- no JSX consumer in the new layouts).
 *   - The destructive-red full-width log-out button -> calm centered OutlinedLogoutPill (D-02).
 */
import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
    AppState,
    AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Heart,
    Calendar,
    ClipboardList,
    Plus,
    Inbox,
    UserCog,
    Briefcase,
    type LucideIcon,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthService } from '../services/AuthService';
import { PropertyService } from '../services/PropertyService';
import { LandlordApplicationStatusBanner } from '../components/LandlordApplicationStatusBanner';
import SectionLabel from '../components/SectionLabel';
import IdentityCard from '../components/profile/IdentityCard';
import ProfileRow from '../components/profile/ProfileRow';
import ProfileTile from '../components/profile/ProfileTile';
import ProfileToolTile from '../components/profile/ProfileToolTile';
import OutlinedLogoutPill from '../components/profile/OutlinedLogoutPill';

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

interface ToolDef {
    id: 'apps' | 'mod' | 'roles';
    Icon: LucideIcon;
    title: string;
    sub: string;
    onPress: () => void;
    badge?: number;
}

function ProfileScreenComponent({
    onBack,
    onCreateListing,
    onViewListings,
    onViewFavorites,
    onViewAppointments,
    onViewAccountSettings,
    onApplyLandlord,
    onReviewLandlordApplications,
    onReviewModerationQueue,
    onOpenRoleManagement,
    moderationCountRefreshKey,
}: ProfileScreenProps) {
    const { user, logout } = useAuth();
    const { t } = useLanguage();
    const { colors } = useTheme();
    const { can, isAdmin, isModerator } = useRole();
    const isStaff = isAdmin || isModerator;

    const [loading, setLoading] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
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

    // Backend-profile fetch — kept for parity with the prior screen's loading/skeleton
    // behavior on first mount. canManageListings is now derived from useRole().can('manageListings')
    // (which reads user.backendProfile.canListProperties directly), so we no longer need a
    // local canListProperties state here. Phase 16 Plan 16-02 also dropped the
    // AppointmentService.getOwnerSettings() leg + blockSize setter per A3 (dead code —
    // no JSX consumer in the new layouts).
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
                await AuthService.getBackendUser(user.localId);
                if (cancelled) return;
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
                    },
                },
            ],
        );
    };

    // ADMIN TOOLS list — gates each tool by its capability + parent-provided handler.
    // D-05 odd-tile-wide rule is applied at render time via wide={...} in the .map call.
    const TOOLS = useMemo<ToolDef[]>(() => {
        const list: (ToolDef | null)[] = [
            canReviewLandlordApplications && onReviewLandlordApplications
                ? {
                      id: 'apps',
                      Icon: Briefcase,
                      title: t('profile.tool.applications'),
                      sub: t('profile.tool.applicationsSub'),
                      onPress: onReviewLandlordApplications,
                  }
                : null,
            canViewModerationQueue && onReviewModerationQueue
                ? {
                      id: 'mod',
                      Icon: Inbox,
                      title: t('profile.tool.moderation'),
                      sub: t('profile.tool.moderationSub'),
                      onPress: onReviewModerationQueue,
                      badge: pendingCount,
                  }
                : null,
            canManageRoles && onOpenRoleManagement
                ? {
                      id: 'roles',
                      Icon: UserCog,
                      title: t('profile.tool.roles'),
                      sub: t('profile.tool.rolesSub'),
                      onPress: onOpenRoleManagement,
                  }
                : null,
        ];
        return list.filter(Boolean) as ToolDef[];
    }, [
        canReviewLandlordApplications,
        canViewModerationQueue,
        canManageRoles,
        onReviewLandlordApplications,
        onReviewModerationQueue,
        onOpenRoleManagement,
        pendingCount,
        t,
    ]);

    if (loading) {
        return (
            <View
                style={[
                    styles.container,
                    {
                        backgroundColor: colors.background,
                        justifyContent: 'center',
                        alignItems: 'center',
                    },
                ]}
            >
                <ActivityIndicator color={colors.accent} />
            </View>
        );
    }

    const roleForCard: 'admin' | 'moderator' | 'user' = isAdmin
        ? 'admin'
        : isModerator
            ? 'moderator'
            : 'user';
    const roleBadgeLabel = isAdmin
        ? t('profile.staffBadge.admin')
        : isModerator
            ? t('profile.staffBadge.moderator')
            : undefined;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={onBack} style={styles.iconButton}>
                    <Text style={{ fontSize: 24, color: colors.accent }}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile.myProfile')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                style={styles.scrollView}
            >
                {/* Identity card — whole-card tappable per D-03 */}
                <IdentityCard
                    email={user?.email ?? ''}
                    role={roleForCard}
                    roleBadgeLabel={roleBadgeLabel}
                    onPress={onViewAccountSettings ?? (() => {})}
                    accountSettingsLabel={`${t('profile.accountSettings')} ›`}
                />

                {/* Spacer between identity card and the body card / banner */}
                <View style={{ height: 12 }} />

                {/* Phase 4.5 — Landlord application status (own state). Component
                    self-suppresses for admin/moderator at its own line 88 per D-06. */}
                {onApplyLandlord && (
                    <LandlordApplicationStatusBanner onPress={onApplyLandlord} />
                )}

                {/* Role-discriminated body branch */}
                {isStaff ? (
                    /* ---------- Admin / Moderator tile dashboard (PROF-02) ---------- */
                    <>
                        <SectionLabel>{t('profile.section.myActivity')}</SectionLabel>
                        <View style={styles.tileGrid}>
                            <ProfileTile
                                Icon={Heart}
                                title={t('profile.favorites')}
                                sub={t('profile.tile.favoritesSub')}
                                onPress={onViewFavorites ?? (() => {})}
                            />
                            <ProfileTile
                                Icon={Calendar}
                                title={t('profile.appointments')}
                                sub={t('profile.tile.appointmentsSub')}
                                onPress={onViewAppointments ?? (() => {})}
                            />
                            <ProfileTile
                                Icon={ClipboardList}
                                title={t('profile.myListings')}
                                sub={t('profile.tile.myListingsSub')}
                                onPress={onViewListings ?? (() => {})}
                            />
                            <ProfileTile
                                accent
                                Icon={Plus}
                                title={t('profile.createListing')}
                                sub={t('profile.tile.createListingSub')}
                                onPress={onCreateListing ?? (() => {})}
                            />
                        </View>

                        <View style={{ height: 20 }} />

                        <SectionLabel action={<StaffPill colors={colors} label={t('profile.section.staff')} />}>
                            {t('profile.section.adminTools')}
                        </SectionLabel>
                        <View style={styles.tileGrid}>
                            {TOOLS.map((tool, i) => {
                                const wide = TOOLS.length % 2 === 1 && i === TOOLS.length - 1;
                                return (
                                    <ProfileToolTile
                                        key={tool.id}
                                        Icon={tool.Icon}
                                        title={tool.title}
                                        sub={tool.sub}
                                        onPress={tool.onPress}
                                        badge={tool.badge}
                                        wide={wide}
                                    />
                                );
                            })}
                        </View>
                    </>
                ) : (
                    /* ---------- Regular user grouped rows (PROF-01) ---------- */
                    <>
                        <SectionLabel>{t('profile.section.activity')}</SectionLabel>
                        <View style={[styles.card, { backgroundColor: colors.surface }]}>
                            <ProfileRow
                                Icon={Heart}
                                title={t('profile.favorites')}
                                sub={t('profile.tile.favoritesSub')}
                                onPress={onViewFavorites ?? (() => {})}
                            />
                            <View style={[styles.separator, { backgroundColor: colors.hair2 }]} />
                            <ProfileRow
                                Icon={Calendar}
                                title={t('profile.appointments')}
                                sub={t('profile.tile.appointmentsSub')}
                                onPress={onViewAppointments ?? (() => {})}
                            />
                        </View>

                        {canManageListings && (
                            <>
                                <View style={{ height: 16 }} />
                                <SectionLabel>{t('profile.section.hosting')}</SectionLabel>
                                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                                    <ProfileRow
                                        Icon={ClipboardList}
                                        title={t('profile.myListings')}
                                        sub={t('profile.tile.myListingsSub')}
                                        onPress={onViewListings ?? (() => {})}
                                    />
                                </View>

                                <View style={{ height: 12 }} />
                                <ProfileRow
                                    accent
                                    Icon={Plus}
                                    title={t('profile.createListing')}
                                    sub={t('profile.tile.createListingSub')}
                                    onPress={onCreateListing ?? (() => {})}
                                />
                            </>
                        )}
                    </>
                )}

                {/* Calm centered outlined log-out pill (D-02) — both layouts. */}
                <View style={{ height: 28 }} />
                <OutlinedLogoutPill
                    label={t('profile.logOut')}
                    loading={loggingOut}
                    onPress={handleLogout}
                />
                <View style={{ height: 20 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

/**
 * StaffPill — inline accent-soft pill rendered in the ADMIN TOOLS SectionLabel
 * action-slot. Pure visual affordance, non-interactive. Kept inline to avoid
 * over-extracting a single-use 10-LOC primitive.
 */
const StaffPill: React.FC<{ colors: ReturnType<typeof useTheme>['colors']; label: string }> = ({
    colors,
    label,
}) => (
    <View
        style={{
            paddingVertical: 3,
            paddingHorizontal: 9,
            borderRadius: 999,
            backgroundColor: colors.accentSoft,
        }}
    >
        <Text
            style={{
                color: colors.accent,
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 0.4,
                textTransform: 'uppercase',
            }}
        >
            {label}
        </Text>
    </View>
);

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
    // Phase 15 sibling pattern (AccountSettingsScreen.tsx card style).
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    separator: {
        height: 1,
        marginLeft: 16 + 38 + 14, // align under the title column (skip the 38px icon chip + padding/gap)
    },
    // 2×2 grid wrap shared by MY ACTIVITY + ADMIN TOOLS sections.
    tileGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
});
