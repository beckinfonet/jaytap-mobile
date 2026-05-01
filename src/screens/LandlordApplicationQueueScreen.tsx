// Phase 4.5 — Admin queue for landlord applications.
// Mirrors the future ModerationQueueScreen pattern (Phase 3): FIFO list, Approve (single-tap),
// Reject (modal with canned reasons + free-text). Audit-logged server-side.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  Modal,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  LandlordApplicationService,
  LandlordApplication,
  RejectionReasonCode,
} from '../services/LandlordApplicationService';

interface Props {
  onBack: () => void;
}

const REJECT_CODES: RejectionReasonCode[] = ['incomplete-info', 'invalid-id', 'duplicate', 'other'];

export const LandlordApplicationQueueScreen: React.FC<Props> = ({ onBack }) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const [items, setItems] = useState<LandlordApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<LandlordApplication | null>(null);
  const [rejectCode, setRejectCode] = useState<RejectionReasonCode>('incomplete-info');
  const [rejectNote, setRejectNote] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await LandlordApplicationService.getAdminQueue('submitted');
      setItems(data);
    } catch (error: any) {
      console.error('Failed to load queue:', error);
      Alert.alert(t('common.error'), error?.response?.data?.message || error?.message || t('landlordApp.adminLoadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (app: LandlordApplication) => {
    Alert.alert(
      t('landlordApp.approveConfirmTitle'),
      t('landlordApp.approveConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('landlordApp.approve'),
          onPress: async () => {
            setDecidingId(app._id);
            try {
              await LandlordApplicationService.approve(app._id);
              setItems((prev) => prev.filter((i) => i._id !== app._id));
            } catch (error: any) {
              Alert.alert(t('common.error'), error?.response?.data?.message || error?.message || t('landlordApp.adminApproveFailed'));
            } finally {
              setDecidingId(null);
            }
          },
        },
      ]
    );
  };

  const openRejectModal = (app: LandlordApplication) => {
    setRejectTarget(app);
    setRejectCode('incomplete-info');
    setRejectNote('');
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    setDecidingId(rejectTarget._id);
    try {
      await LandlordApplicationService.reject(rejectTarget._id, rejectCode, rejectNote.trim() || undefined);
      setItems((prev) => prev.filter((i) => i._id !== rejectTarget._id));
      setRejectTarget(null);
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.response?.data?.message || error?.message || t('landlordApp.adminRejectFailed'));
    } finally {
      setDecidingId(null);
    }
  };

  const renderItem = ({ item }: { item: LandlordApplication }) => {
    const isDeciding = decidingId === item._id;
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {item.uid}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {new Date(item.submittedAt).toLocaleDateString()}
          </Text>
        </View>
        <Image source={{ uri: item.idPhotoUrl }} style={styles.idPhoto} resizeMode="cover" />
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{t('landlordApp.phoneLabel')}</Text>
          <Text style={[styles.rowValue, { color: colors.text }]}>{item.phone}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{t('landlordApp.intentLabel')}</Text>
          <Text style={[styles.rowValue, { color: colors.text }]}>
            {(item.listingTypeIntents || []).map((i) => t(`landlordApp.intent.${i}` as any)).join(', ')}
          </Text>
        </View>
        {item.applicantNote ? (
          <View style={styles.noteBlock}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{t('landlordApp.noteLabel')}</Text>
            <Text style={[styles.noteText, { color: colors.text }]}>{item.applicantNote}</Text>
          </View>
        ) : null}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => openRejectModal(item)}
            disabled={isDeciding}
          >
            <X size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>{t('landlordApp.reject')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => handleApprove(item)}
            disabled={isDeciding}
          >
            {isDeciding ? <ActivityIndicator color="#FFF" /> : <Check size={18} color="#FFF" />}
            <Text style={styles.actionBtnText}>{t('landlordApp.approve')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.iconButton}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('landlordApp.adminQueueTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('landlordApp.adminQueueEmpty')}
              </Text>
            </View>
          }
        />
      )}

      {/* Reject modal — KeyboardAvoidingView + ScrollView so the textarea + buttons clear the keyboard. */}
      <Modal visible={!!rejectTarget} transparent animationType="fade" onRequestClose={() => setRejectTarget(null)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.modalScrollWrap}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('landlordApp.rejectModalTitle')}</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{t('landlordApp.rejectModalSubtitle')}</Text>

              <View style={styles.codesGroup}>
                {REJECT_CODES.map((code) => {
                  const selected = rejectCode === code;
                  // Selected chip text must contrast with colors.primary (which is light in dark mode).
                  const selectedTextColor = isDark ? '#121212' : '#FFFFFF';
                  return (
                    <TouchableOpacity
                      key={code}
                      onPress={() => setRejectCode(code)}
                      style={[
                        styles.codeChip,
                        {
                          backgroundColor: selected ? colors.primary : colors.inputBackground,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.codeChipText, { color: selected ? selectedTextColor : colors.text }]}>
                        {t(`landlordApp.rejectReason.${code}` as any)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                placeholder={t('landlordApp.rejectNotePlaceholder')}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                value={rejectNote}
                onChangeText={setRejectNote}
              />

              <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.inputBackground }]}
                onPress={() => setRejectTarget(null)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.rejectBtn]}
                onPress={submitReject}
                disabled={!!decidingId}
              >
                {decidingId ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.modalButtonText, { color: '#FFF' }]}>{t('landlordApp.rejectConfirm')}</Text>}
              </TouchableOpacity>
            </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
  headerTitle: { fontSize: 18, fontWeight: '700' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  cardMeta: { fontSize: 12 },
  idPhoto: { width: '100%', height: 200, borderRadius: 10, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  rowLabel: { fontSize: 13, width: 100 },
  rowValue: { fontSize: 14, flex: 1 },
  noteBlock: { marginTop: 6, marginBottom: 6 },
  noteText: { fontSize: 14, marginTop: 4, lineHeight: 19 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  approveBtn: { backgroundColor: '#059669' },
  rejectBtn: { backgroundColor: '#DC2626' },
  emptyContainer: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalScrollWrap: { flex: 1 },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, marginBottom: 16 },
  codesGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  codeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  codeChipText: { fontSize: 13, fontWeight: '600' },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtonRow: { flexDirection: 'row', gap: 10 },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: { fontSize: 14, fontWeight: '700' },
});
