import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Calendar, ClipboardList, Plus, ChevronRight, LogOut } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthService } from '../services/AuthService';
import { AppointmentService } from '../services/AppointmentService';

interface ProfileScreenProps {
    onBack: () => void;
    onCreateListing?: () => void;
    onViewListings?: () => void;
    onViewFavorites?: () => void;
    onViewAppointments?: () => void;
    onViewAccountSettings?: () => void;
}

function ProfileScreenComponent({ onBack, onCreateListing, onViewListings, onViewFavorites, onViewAppointments, onViewAccountSettings }: ProfileScreenProps) {
    const { user, logout } = useAuth();
    const { t } = useLanguage();
    const { isDark } = useTheme();

    const [isRenterApplicant, setIsRenterApplicant] = useState(false);
    const [userType, setUserType] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [blockSize, setBlockSize] = useState<'30min' | '60min'>('30min');
    const profileDataLoadedRef = useRef(false);

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
                    setIsRenterApplicant(profile.isRenterApplicant || false);
                    setUserType(profile.userType || '');
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
                            await logout();
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
                            <Text style={[styles.role, { color: themeStyles.accent }]}>{isRenterApplicant ? t('profile.applicant') : t('profile.buyerAccount')}</Text>
                            <Text style={[styles.accountSettings, { color: themeStyles.textSecondary }]}>{t('profile.accountSettings')}</Text>
                        </View>
                        <ChevronRight size={20} color={themeStyles.textSecondary} />
                    </View>
                </TouchableOpacity>

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

                    {userType === 'renter' && (
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