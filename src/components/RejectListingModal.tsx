// Phase 3 — Reusable reject-listing modal for moderators.
//
// Extracted from Phase 4.5's inline reject modal (LandlordApplicationQueueScreen lines 207-275)
// because Phase 3 mounts the same modal in TWO places: the moderation queue (this plan)
// and the PropertyDetailsScreen action footer (Plan 06). Visual + interaction parity with
// Phase 4.5 is intentional per CONTEXT.md D-06.
//
// The component is fully presentational — no service calls, no navigation logic. Parents
// own the HTTP call (queue screen calls PropertyService.rejectListing in onSubmit;
// PropertyDetailsScreen does the same in Plan 06).
//
// Phase 3 deviates from Phase 4.5 verbatim styles in two ways per UI-SPEC §"Typography":
//   1. modalTitle weight 700 -> 600 (honor 2-weight cap)
//   2. button label uses verb-noun "Reject Listing" / «Отклонить объявление» via
//      t('moderation.reject.submit'), NOT the generic "Submit" / «Отправить»
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// Single-line union for grep-friendly acceptance gate (Plan 03-04 Task 01).
export type RejectReasonCode = 'incomplete-info' | 'prohibited-content' | 'out-of-service-area' | 'other';

const REJECT_CODES: RejectReasonCode[] = ['incomplete-info', 'prohibited-content', 'out-of-service-area', 'other'];

interface RejectListingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (params: { reasonCode: RejectReasonCode; reasonNote?: string }) => Promise<void>;
  submitting?: boolean;
}

const RejectListingModal: React.FC<RejectListingModalProps> = ({
  visible,
  onClose,
  onSubmit,
  submitting = false,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [rejectCode, setRejectCode] = useState<RejectReasonCode>('incomplete-info');
  const [rejectNote, setRejectNote] = useState('');

  // Reset to default on open (per Phase 4.5 precedent at line 94 — pre-selects 'incomplete-info'
  // chip so submit is always enabled from the start; user can re-pick before tapping Reject Listing).
  useEffect(() => {
    if (visible) {
      setRejectCode('incomplete-info');
      setRejectNote('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    const trimmed = rejectNote.trim();
    // Strip empty/whitespace-only note before sending — PropertyService.rejectListing
    // accepts reasonNote?: string and the backend coalesces null/empty/whitespace.
    await onSubmit({ reasonCode: rejectCode, reasonNote: trimmed || undefined });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollWrap}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('moderation.reject.modalTitle')}
            </Text>

            <View style={styles.codesGroup}>
              {REJECT_CODES.map((code) => {
                const selected = rejectCode === code;
                // Selected chip text must contrast with colors.primary (which is dark in light
                // mode and white in dark mode). Phase 4.5 uses these exact contrast values
                // (LandlordApplicationQueueScreen.tsx:226) — Phase 3 inherits verbatim.
                const selectedTextColor = isDark ? '#121212' : '#FFFFFF';
                return (
                  <TouchableOpacity
                    key={code}
                    onPress={() => setRejectCode(code)}
                    disabled={submitting}
                    style={[
                      styles.codeChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.inputBackground,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.codeChipText,
                        { color: selected ? selectedTextColor : colors.text },
                      ]}
                    >
                      {t(`moderation.reject.reason.${code}` as any)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder={t('moderation.reject.notePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              maxLength={500}
              value={rejectNote}
              onChangeText={setRejectNote}
              editable={!submitting}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.inputBackground }]}
                onPress={onClose}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.error }]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.7}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={[styles.buttonText, { color: '#FFF' }]}>
                    {t('moderation.reject.submit')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  scrollWrap: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { borderRadius: 14, padding: 20 },
  // Heading role per UI-SPEC §"Typography": 18/600/24. Phase 3 diverges from Phase 4.5's
  // 700 weight to honor the 2-weight cap.
  title: { fontSize: 18, fontWeight: '600', lineHeight: 24, marginBottom: 16 },
  codesGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  // 12px and 8px are documented brownfield-reuse values per UI-SPEC §"Spacing Exceptions"
  // (sampled from LandlordApplicationQueueScreen.tsx:331).
  codeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  codeChipText: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  input: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    minHeight: 96,
    textAlignVertical: 'top',
    fontSize: 13,
    marginBottom: 16,
  },
  buttonRow: { flexDirection: 'row', gap: 8 },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Action label role per UI-SPEC §"Typography": 14/600/20.
  buttonText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
});

export default RejectListingModal;
