import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthService } from '../services/AuthService';

interface ProfileScreenProps {
    onBack: () => void;
    onCreateListing?: () => void;
    onViewListings?: () => void;
    onViewFavorites?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack, onCreateListing, onViewListings, onViewFavorites }) => {
    const { user, logout } = useAuth();
    const { colors, isDark } = useTheme();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [telegram, setTelegram] = useState('');
    const [isRenterApplicant, setIsRenterApplicant] = useState(false);
    const [userType, setUserType] = useState<string>(''); // Track userType
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Dynamic Theme Colors
    const themeStyles = {
        background: isDark ? '#000000' : '#F2F2F7',
        surface: isDark ? '#1E1E1E' : '#FFFFFF',
        text: isDark ? '#FFFFFF' : '#000000',
        textSecondary: isDark ? '#8E8E93' : '#3C3C4399', // iOS Gray
        border: isDark ? '#2C2C2E' : '#E5E5EA',
        accent: '#3B82F6', // Blue accent for both modes (System Blue)
        avatarBg: isDark ? '#2C2C2E' : '#E5E5EA',
        danger: '#FF453A',
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        if (!user?.localId) return;
        setLoading(true);
        try {
            const profile = await AuthService.getBackendUser(user.localId);
            if (profile) {
                setFirstName(profile.firstName || '');
                setLastName(profile.lastName || '');
                setPhone(profile.phone || '');
                setWhatsapp(profile.whatsapp || '');
                setTelegram(profile.telegram || '');
                setIsRenterApplicant(profile.isRenterApplicant || false);
                setUserType(profile.userType || ''); // Load userType
            }
        } catch (error) {
            console.error('Failed to load profile', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user?.localId) return;
        setSaving(true);
        try {
            await AuthService.createBackendUser(user.localId, user.email, {
                firstName,
                lastName,
                phone,
                whatsapp,
                telegram,
                isRenterApplicant
            });
            Alert.alert('Success', 'Profile updated successfully');
            setIsEditing(false);
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await logout();
                        } catch (error) {
                            console.error('Logout failed', error);
                        }
                    }
                },
            ]
        );
    };

    const renderInfoRow = (label: string, value: string, setValue: (v: string) => void, isEditing: boolean, keyboardType: any = 'default', placeholder = '') => (
        <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: isDark ? '#FFF' : '#000' }]}>{label}</Text>
            {isEditing ? (
                <TextInput
                    style={[styles.infoInput, { color: themeStyles.text }]}
                    value={value}
                    onChangeText={setValue}
                    placeholder={placeholder}
                    placeholderTextColor={themeStyles.textSecondary}
                    textAlign="right"
                    keyboardType={keyboardType}
                />
            ) : (
                <Text style={[styles.infoValue, { color: themeStyles.textSecondary }]}>{value || '-'}</Text>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: themeStyles.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={themeStyles.accent} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeStyles.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.iconButton}>
                    <Text style={{ fontSize: 24, color: themeStyles.accent }}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: themeStyles.text }]}>My Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.profileCard, { backgroundColor: themeStyles.surface }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.avatar, { backgroundColor: themeStyles.avatarBg }]}>
                            <Text style={[styles.avatarText, { color: themeStyles.text }]}>
                                {user?.email?.charAt(0).toUpperCase() || 'U'}
                            </Text>
                        </View>
                        <View style={{ marginLeft: 16 }}>
                            <Text style={[styles.email, { color: themeStyles.text }]}>{user?.email}</Text>
                            <Text style={[styles.role, { color: themeStyles.accent }]}>{isRenterApplicant ? 'Applicant' : 'Buyer Account'}</Text>
                            <Text style={[styles.accountSettings, { color: themeStyles.textSecondary }]}>Account Settings</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.menuItem, { backgroundColor: themeStyles.surface }]}
                    onPress={onViewFavorites}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 20, color: themeStyles.accent, marginRight: 12 }}>♡</Text>
                        <Text style={[styles.menuText, { color: themeStyles.text }]}>Favorites</Text>
                    </View>
                    <Text style={[styles.arrow, { color: themeStyles.textSecondary }]}>›</Text>
                </TouchableOpacity>

                {/* Renter Actions - Only show if userType === 'renter' */}
                {userType === 'renter' && (
                    <>
                        <TouchableOpacity
                            style={[styles.menuItem, { backgroundColor: themeStyles.accent }]}
                            onPress={onCreateListing}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ fontSize: 20, color: '#FFF', marginRight: 12 }}>➕</Text>
                                <Text style={[styles.menuText, { color: '#FFF' }]}>Create Listing</Text>
                            </View>
                            <Text style={[styles.arrow, { color: '#FFF' }]}>›</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.menuItem, { backgroundColor: themeStyles.surface }]}
                            onPress={onViewListings}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ fontSize: 20, color: themeStyles.accent, marginRight: 12 }}>📋</Text>
                                <Text style={[styles.menuText, { color: themeStyles.text }]}>My Listings</Text>
                            </View>
                            <Text style={[styles.arrow, { color: themeStyles.textSecondary }]}>›</Text>
                        </TouchableOpacity>
                    </>
                )}

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: themeStyles.accent }]}>Main Information</Text>
                        <TouchableOpacity onPress={() => setIsEditing(!isEditing)} disabled={saving}>
                            <Text style={{ fontSize: 18, color: themeStyles.accent }}>{isEditing ? '' : '✎'}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.infoContainer, { backgroundColor: themeStyles.surface }]}>
                        {renderInfoRow("First Name", firstName, setFirstName, isEditing)}
                        <View style={[styles.separator, { backgroundColor: themeStyles.border }]} />
                        {renderInfoRow("Last Name", lastName, setLastName, isEditing)}
                        <View style={[styles.separator, { backgroundColor: themeStyles.border }]} />
                        {renderInfoRow("Phone Number", phone, setPhone, isEditing, "phone-pad", "+996...")}
                        <View style={[styles.separator, { backgroundColor: themeStyles.border }]} />
                        {renderInfoRow("Telegram", telegram, setTelegram, isEditing, "default", "@username")}
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: themeStyles.accent }]}>Application Status</Text>
                    </View>
                    <View style={[styles.infoContainer, { backgroundColor: themeStyles.surface }]}>
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: isDark ? '#FFF' : '#000' }]}>Renter Application</Text>
                            {isEditing ? (
                                <Switch
                                    value={isRenterApplicant}
                                    onValueChange={setIsRenterApplicant}
                                    trackColor={{ false: '#767577', true: '#34C759' }}
                                />
                            ) : (
                                <Text style={[styles.infoValue, { color: themeStyles.textSecondary }]}>{isRenterApplicant ? 'Active' : 'Inactive'}</Text>
                            )}
                        </View>
                    </View>
                </View>

                {isEditing && (
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.cancelButton, { backgroundColor: themeStyles.surface, borderColor: themeStyles.border }]}
                            onPress={() => setIsEditing(false)}
                            disabled={saving}
                        >
                            <Text style={[styles.cancelButtonText, { color: themeStyles.text }]}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: themeStyles.accent }]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.logoutButton, { borderColor: themeStyles.danger }]}
                    onPress={handleLogout}
                >
                    <Text style={[styles.logoutText, { color: themeStyles.danger }]}>→  Log Out</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteLink} onPress={() => Alert.alert('Delete Account', 'Contact support to delete account.')}>
                    <Text style={[styles.deleteLinkText, { color: themeStyles.textSecondary }]}>Delete Account</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 0,
        paddingVertical: 10,
        marginBottom: 20,
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
        marginBottom: 24,
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
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
    },
    menuText: {
        fontSize: 16,
        fontWeight: '600',
    },
    arrow: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    infoContainer: {
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        minHeight: 50,
    },
    infoLabel: {
        fontSize: 16,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '400',
    },
    infoInput: {
        fontSize: 16,
        fontWeight: '500',
        minWidth: 150,
        padding: 0,
    },
    separator: {
        height: 1,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 24,
    },
    cancelButton: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    cancelButtonText: {
        fontWeight: '600',
        fontSize: 16,
    },
    saveButton: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
    },
    logoutButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        backgroundColor: 'transparent',
        marginTop: 20,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
    },
    deleteLink: {
        marginTop: 24,
        alignItems: 'center',
    },
    deleteLinkText: {
        textDecorationLine: 'underline',
    }
});