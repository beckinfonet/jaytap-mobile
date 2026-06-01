import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    TextInput,
    ActivityIndicator,
    Animated,
    LayoutChangeEvent,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { ChevronRight, Pencil, Trash2, Briefcase } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthService } from '../services/AuthService';
import { DeleteAccountModal } from '../components/DeleteAccountModal';
import SectionLabel from '../components/SectionLabel';
import FilterStyleRow from '../components/FilterStyleRow';

interface AccountSettingsScreenProps {
    onBack: () => void;
    onAccountDeleted?: () => void;
    /** Phase 4.5 — route to LandlordApplicationScreen when user taps "Become a Landlord". */
    onApplyLandlord?: () => void;
}

const LANG_TRACK_PADDING = 4;
const LANG_INNER_GAP = 4;

// Loose name check: any-script letters (Latin, Cyrillic, …), spaces, hyphens, and
// apostrophes (straight + curly U+2019, since iOS auto-converts '). Empty allowed.
// Passes: "O'Brian", "Marie-Jane", "Анна". Fails: digits, "." "," "@" etc.
const isValidName = (v: string): boolean => /^[\p{L}'’\- ]*$/u.test(v.trim());

// Loose phone check: digits, leading/embedded "+", spaces, hyphens, parentheses.
// Empty allowed. Passes: "+996 555 123 456", "+1 (202) 555-0123", "0555123456".
// Fails: letters, "@", "#", "$".
const isValidPhone = (v: string): boolean => /^[0-9+\-() ]*$/.test(v.trim());

/**
 * EditLink — inline subcomponent rendered inside the ACCOUNT SectionLabel's
 * action slot per D-10. Pink-accent pencil + "Edit" text link. Returns null
 * when isEditing so the Save/Cancel buttons inside the ACCOUNT card take over.
 * Reuses 'common.edit' (en.ts:7) per PATTERNS Correction §2.
 */
const EditLink: React.FC<{ onPress: () => void; isEditing: boolean }> = ({ onPress, isEditing }) => {
    const { colors } = useTheme();
    const { t } = useLanguage();
    if (isEditing) return null;
    return (
        <Pressable
            onPress={onPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.edit')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
        >
            <Pencil size={15} color={colors.accent} strokeWidth={2} />
            <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>
                {t('common.edit')}
            </Text>
        </Pressable>
    );
};

export const AccountSettingsScreen: React.FC<AccountSettingsScreenProps> = ({ onBack, onAccountDeleted, onApplyLandlord }) => {
    const { user, deleteAccount } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const { colors } = useTheme();

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
    const [canListProperties, setCanListProperties] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

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
                setCanListProperties(profile.canListProperties || false);
            }
        } catch (error) {
            console.error('Failed to load profile', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user?.localId) return;
        if (!isValidName(firstName) || !isValidName(lastName)) {
            Alert.alert(t('common.error'), t('accountSettings.invalidName'));
            return;
        }
        if (!isValidPhone(phone)) {
            Alert.alert(t('common.error'), t('accountSettings.invalidPhone'));
            return;
        }
        if (!isValidPhone(whatsapp)) {
            Alert.alert(t('common.error'), t('accountSettings.invalidPhone'));
            return;
        }
        setSaving(true);
        try {
            // canListProperties is intentionally NOT passed — it's admin-controlled (Phase 4.5).
            await AuthService.createBackendUser(user.localId, user.email, {
                firstName,
                lastName,
                phone,
                whatsapp,
                telegram,
            });
            Alert.alert(t('common.success'), t('accountSettings.profileUpdated'));
            setIsEditing(false);
        } catch (error) {
            Alert.alert(t('common.error'), t('accountSettings.profileUpdateFailed'));
        } finally {
            setSaving(false);
        }
    };

    const renderInfoRow = (label: string, value: string, setValue: (v: string) => void, isEditing: boolean, keyboardType: any = 'default', placeholder = '', errorText?: string) => (
        <View>
            <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>{label}</Text>
                {isEditing ? (
                    <TextInput
                        style={[styles.infoInput, { color: colors.text }]}
                        value={value}
                        onChangeText={setValue}
                        placeholder={placeholder}
                        placeholderTextColor={colors.textSecondary}
                        textAlign="right"
                        keyboardType={keyboardType}
                    />
                ) : (
                    <Text style={[styles.infoValue, { color: colors.textSecondary }]}>{value || '-'}</Text>
                )}
            </View>
            {isEditing && errorText ? (
                <Text style={[styles.infoError, { color: colors.destructiveRed }]}>{errorText}</Text>
            ) : null}
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={colors.accent} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.iconButton}>
                    <Text style={{ fontSize: 24, color: colors.accent }}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('accountSettings.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAwareScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                bottomOffset={20}
                showsVerticalScrollIndicator={false}
            >
                {/* ─────────────────────── ACCOUNT section ─────────────────────── */}
                <View style={styles.section}>
                    <SectionLabel action={<EditLink onPress={() => setIsEditing(true)} isEditing={isEditing} />}>
                        {t('accountSettings.section.account')}
                    </SectionLabel>
                    <View style={[styles.card, { backgroundColor: colors.surface }]}>
                        {renderInfoRow(t('accountSettings.firstName'), firstName, setFirstName, isEditing, 'default', '', !isValidName(firstName) ? t('accountSettings.invalidName') : undefined)}
                        <View style={[styles.separator, { backgroundColor: colors.hair2 }]} />
                        {renderInfoRow(t('accountSettings.lastName'), lastName, setLastName, isEditing, 'default', '', !isValidName(lastName) ? t('accountSettings.invalidName') : undefined)}
                        <View style={[styles.separator, { backgroundColor: colors.hair2 }]} />
                        {renderInfoRow(t('accountSettings.phoneNumber'), phone, setPhone, isEditing, 'phone-pad', t('accountSettings.placeholderPhone'), !isValidPhone(phone) ? t('accountSettings.invalidPhone') : undefined)}
                        <View style={[styles.separator, { backgroundColor: colors.hair2 }]} />
                        {renderInfoRow(t('accountSettings.whatsapp'), whatsapp, setWhatsapp, isEditing, 'phone-pad', t('accountSettings.placeholderWhatsapp'), !isValidPhone(whatsapp) ? t('accountSettings.invalidPhone') : undefined)}
                        <View style={[styles.separator, { backgroundColor: colors.hair2 }]} />
                        {renderInfoRow(t('accountSettings.telegram'), telegram, setTelegram, isEditing, 'default', t('accountSettings.placeholderTelegram'))}

                        {/* D-11: Save/Cancel buttons live INSIDE the ACCOUNT card. */}
                        {isEditing && (
                            <View style={styles.cardActionRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.cardActionButton,
                                        {
                                            backgroundColor: colors.surface2,
                                            borderWidth: 1,
                                            borderColor: colors.hair2,
                                        },
                                    ]}
                                    onPress={() => setIsEditing(false)}
                                    disabled={saving}
                                >
                                    <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>{t('common.cancel')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.cardActionButton, { backgroundColor: colors.accent }]}
                                    onPress={handleSave}
                                    disabled={saving}
                                >
                                    <Text style={{ color: colors.onAccent, fontWeight: '600', fontSize: 16 }}>
                                        {saving ? t('accountSettings.saving') : t('common.save')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* ─────────────────────── PREFERENCES section ─────────────────────── */}
                <View style={styles.section}>
                    <SectionLabel>{t('accountSettings.section.preferences')}</SectionLabel>
                    <View style={[styles.card, { backgroundColor: colors.surface, padding: 16 }]}>
                        {/* Language sliding-pill toggle — animation machinery preserved verbatim from
                            lines 48-58 + 222-292 of the pre-Phase-15 file; only colors swap per D-08.
                            Plan 15-02 will mount <FilterStyleRow /> below the Language toggle. */}
                        <View
                            style={[
                                styles.languageTrack,
                                {
                                    backgroundColor: colors.surface2,
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
                                            backgroundColor: colors.accent,
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
                                                color: language === 'en' ? colors.onAccent : colors.text,
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
                                                color: language === 'ru' ? colors.onAccent : colors.text,
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
                        {/* Plan 15-02 (SET-02) — filter-style picker (D-03 self-contained;
                            reads useFilterStyle() directly; Phase 14 HomeScreen dispatcher
                            live-swaps on next filter-button press per D-07 / SC3). */}
                        <FilterStyleRow />
                    </View>
                </View>

                {/* ─────────────────────── APPLICATION section (conditional) ─────────────────────── */}
                {/* Phase 4.5 — Landlord application entry-point.
                    Hidden when user already has the capability (admin/moderator/approved landlord). */}
                {!canListProperties && onApplyLandlord && (
                    <View style={styles.section}>
                        <SectionLabel>{t('accountSettings.section.application')}</SectionLabel>
                        <View style={[styles.card, { backgroundColor: colors.surface }]}>
                            <TouchableOpacity
                                onPress={onApplyLandlord}
                                activeOpacity={0.75}
                                style={styles.linkRow}
                            >
                                <View style={[styles.iconChip, { backgroundColor: colors.surface2 }]}>
                                    <Briefcase size={18} color={colors.iconChipFg} />
                                </View>
                                <Text style={[styles.linkRowLabel, { color: colors.text }]}>
                                    {t('landlordApp.becomeLandlord')}
                                </Text>
                                <ChevronRight size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ─────────────────────── DANGER ZONE section ─────────────────────── */}
                <View style={styles.section}>
                    <SectionLabel>{t('accountSettings.section.dangerZone')}</SectionLabel>
                    <View style={[styles.card, { backgroundColor: colors.surface }]}>
                        <TouchableOpacity
                            onPress={() => setShowDeleteModal(true)}
                            activeOpacity={0.75}
                            style={styles.linkRow}
                        >
                            <View style={[styles.iconChip, { backgroundColor: colors.destructiveSoft }]}>
                                <Trash2 size={18} color={colors.destructiveRed} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.destructiveRed, fontSize: 16, fontWeight: '600' }}>
                                    {t('accountSettings.deleteAccount')}
                                </Text>
                            </View>
                            <ChevronRight size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
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
        paddingBottom: 110,
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
    card: {
        borderRadius: 20,
        overflow: 'hidden',
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
    infoError: {
        fontSize: 13,
        lineHeight: 18,
        textAlign: 'right',
        paddingBottom: 10,
    },
    separator: {
        height: 1,
    },
    cardActionRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
        marginBottom: 12,
    },
    cardActionButton: {
        flex: 1,
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
    },
    linkRowLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    iconChip: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
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
});
