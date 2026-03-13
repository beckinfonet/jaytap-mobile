import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthService } from '../services/AuthService';
import { DeleteAccountModal } from '../components/DeleteAccountModal';

interface AccountSettingsScreenProps {
    onBack: () => void;
    onAccountDeleted?: () => void;
}

export const AccountSettingsScreen: React.FC<AccountSettingsScreenProps> = ({ onBack, onAccountDeleted }) => {
    const { user, deleteAccount } = useAuth();
    const { colors, isDark } = useTheme();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [telegram, setTelegram] = useState('');
    const [isRenterApplicant, setIsRenterApplicant] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const themeStyles = {
        background: isDark ? '#000000' : '#F2F2F7',
        surface: isDark ? '#1E1E1E' : '#FFFFFF',
        text: isDark ? '#FFFFFF' : '#000000',
        textSecondary: isDark ? '#8E8E93' : '#3C3C4399',
        border: isDark ? '#2C2C2E' : '#E5E5EA',
        accent: '#3B82F6',
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
                <Text style={[styles.headerTitle, { color: themeStyles.text }]}>Account Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                    style={styles.deleteLink}
                    onPress={() => setShowDeleteModal(true)}
                >
                    <Text style={[styles.deleteLinkText, { color: themeStyles.danger }]}>Delete Account</Text>
                </TouchableOpacity>
            </ScrollView>

            <DeleteAccountModal
                visible={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={async () => {
                    await deleteAccount();
                    setShowDeleteModal(false);
                    (onAccountDeleted ?? onBack)();
                }}
                userEmail={user?.email}
            />
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
    deleteLink: {
        marginTop: 24,
        alignItems: 'center',
    },
    deleteLinkText: {
        textDecorationLine: 'underline',
        fontSize: 16,
    },
});
