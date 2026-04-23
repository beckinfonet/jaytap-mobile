import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    TextInput,
    Switch,
    ActivityIndicator,
    Animated,
    LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthService } from '../services/AuthService';
import { DeleteAccountModal } from '../components/DeleteAccountModal';

interface AccountSettingsScreenProps {
    onBack: () => void;
    onAccountDeleted?: () => void;
}

const LANG_TRACK_PADDING = 4;
const LANG_INNER_GAP = 4;

export const AccountSettingsScreen: React.FC<AccountSettingsScreenProps> = ({ onBack, onAccountDeleted }) => {
    const { user, deleteAccount } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const { colors, isDark } = useTheme();

    const langSlide = useRef(new Animated.Value(language === 'en' ? 0 : 1)).current;
    const [langTrackWidth, setLangTrackWidth] = useState(0);

    useEffect(() => {
        Animated.spring(langSlide, {
            toValue: language === 'en' ? 0 : 1,
            useNativeDriver: true,
            friction: 9,
            tension: 80,
        }).start();
    }, [language, langSlide]);

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
            Alert.alert(t('common.success'), t('accountSettings.profileUpdated'));
            setIsEditing(false);
        } catch (error) {
            Alert.alert(t('common.error'), t('accountSettings.profileUpdateFailed'));
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
                <Text style={[styles.headerTitle, { color: themeStyles.text }]}>{t('accountSettings.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAwareScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                bottomOffset={20}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: themeStyles.accent }]}>{t('accountSettings.mainInformation')}</Text>
                        <TouchableOpacity onPress={() => setIsEditing(!isEditing)} disabled={saving}>
                            <Text style={{ fontSize: 18, color: themeStyles.accent }}>{isEditing ? '' : '✎'}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.infoContainer, { backgroundColor: themeStyles.surface }]}>
                        {renderInfoRow(t('accountSettings.firstName'), firstName, setFirstName, isEditing)}
                        <View style={[styles.separator, { backgroundColor: themeStyles.border }]} />
                        {renderInfoRow(t('accountSettings.lastName'), lastName, setLastName, isEditing)}
                        <View style={[styles.separator, { backgroundColor: themeStyles.border }]} />
                        {renderInfoRow(t('accountSettings.phoneNumber'), phone, setPhone, isEditing, "phone-pad", t('accountSettings.placeholderPhone'))}
                        <View style={[styles.separator, { backgroundColor: themeStyles.border }]} />
                        {renderInfoRow(t('accountSettings.telegram'), telegram, setTelegram, isEditing, "default", t('accountSettings.placeholderTelegram'))}
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: themeStyles.accent }]}>{t('accountSettings.language')}</Text>
                    </View>
                    <View
                        style={[
                            styles.languageTrack,
                            {
                                backgroundColor: isDark ? '#2C2C2E' : '#E8E8ED',
                                shadowColor: '#000',
                            },
                        ]}
                        onLayout={(e: LayoutChangeEvent) => setLangTrackWidth(e.nativeEvent.layout.width)}
                    >
                        {langTrackWidth > 0 && (
                            <Animated.View
                                pointerEvents="none"
                                style={[
                                    styles.languageSlidingPill,
                                    {
                                        width:
                                            (langTrackWidth - LANG_TRACK_PADDING * 2 - LANG_INNER_GAP) / 2,
                                        backgroundColor: themeStyles.accent,
                                        transform: [
                                            {
                                                translateX: langSlide.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [
                                                        LANG_TRACK_PADDING,
                                                        LANG_TRACK_PADDING +
                                                            (langTrackWidth - LANG_TRACK_PADDING * 2 - LANG_INNER_GAP) / 2 +
                                                            LANG_INNER_GAP,
                                                    ],
                                                }),
                                            },
                                        ],
                                    },
                                ]}
                            />
                        )}
                        <View style={styles.languageOptionsRow}>
                            <TouchableOpacity
                                style={styles.languageTouch}
                                onPress={() => setLanguage('en')}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                accessibilityState={{ selected: language === 'en' }}
                            >
                                <Text style={styles.languageFlag}>🇺🇸</Text>
                                <Text
                                    style={[
                                        styles.languageLabel,
                                        {
                                            color: language === 'en' ? '#FFFFFF' : themeStyles.text,
                                            opacity: language === 'en' ? 1 : 0.55,
                                        },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {t('accountSettings.english')}
                                </Text>
                                {language === 'en' ? <Text style={styles.languageCheck}>✓</Text> : <View style={styles.languageCheckSpacer} />}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.languageTouch}
                                onPress={() => setLanguage('ru')}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                accessibilityState={{ selected: language === 'ru' }}
                            >
                                <Text style={styles.languageFlag}>🇷🇺</Text>
                                <Text
                                    style={[
                                        styles.languageLabel,
                                        {
                                            color: language === 'ru' ? '#FFFFFF' : themeStyles.text,
                                            opacity: language === 'ru' ? 1 : 0.55,
                                        },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {t('accountSettings.russian')}
                                </Text>
                                {language === 'ru' ? <Text style={styles.languageCheck}>✓</Text> : <View style={styles.languageCheckSpacer} />}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: themeStyles.accent }]}>{t('accountSettings.applicationStatus')}</Text>
                    </View>
                    <View style={[styles.infoContainer, { backgroundColor: themeStyles.surface }]}>
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: isDark ? '#FFF' : '#000' }]}>{t('accountSettings.renterApplication')}</Text>
                            {isEditing ? (
                                <Switch
                                    value={isRenterApplicant}
                                    onValueChange={setIsRenterApplicant}
                                    trackColor={{ false: '#767577', true: '#34C759' }}
                                />
                            ) : (
                                <Text style={[styles.infoValue, { color: themeStyles.textSecondary }]}>{isRenterApplicant ? t('accountSettings.active') : t('accountSettings.inactive')}</Text>
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
                            <Text style={[styles.cancelButtonText, { color: themeStyles.text }]}>{t('common.cancel')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: themeStyles.accent }]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            <Text style={styles.saveButtonText}>{saving ? t('accountSettings.saving') : t('common.save')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity
                    style={styles.deleteLink}
                    onPress={() => setShowDeleteModal(true)}
                >
                    <Text style={[styles.deleteLinkText, { color: themeStyles.danger }]}>{t('accountSettings.deleteAccount')}</Text>
                </TouchableOpacity>
            </KeyboardAwareScrollView>

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
    languageTrack: {
        borderRadius: 22,
        paddingVertical: LANG_TRACK_PADDING,
        paddingHorizontal: LANG_TRACK_PADDING,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    languageSlidingPill: {
        position: 'absolute',
        top: LANG_TRACK_PADDING,
        bottom: LANG_TRACK_PADDING,
        borderRadius: 18,
    },
    languageOptionsRow: {
        flexDirection: 'row',
        gap: LANG_INNER_GAP,
    },
    languageTouch: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 10,
        gap: 8,
    },
    languageFlag: {
        fontSize: 22,
    },
    languageLabel: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    languageCheck: {
        fontSize: 14,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.95)',
        marginLeft: 2,
        width: 16,
        textAlign: 'center',
    },
    languageCheckSpacer: {
        width: 16,
        marginLeft: 2,
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
