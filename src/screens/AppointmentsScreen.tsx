import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Check, X, Clock } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AppointmentService } from '../services/AppointmentService';
import { Appointment, TimeSlot } from '../types/Appointment';
import { ScheduleViewingScreen } from './ScheduleViewingScreen';
import { Property } from '../types/Property';

interface AppointmentsScreenProps {
  onBack: () => void;
  propertyToOpen?: Property | null;
  participantUid?: string;
}

function formatSlot(slot?: TimeSlot): string {
  if (!slot || !slot.startTime || !slot.endTime) return '';
  const dateStr =
    typeof slot.date === 'string'
      ? slot.date.slice(0, 10)
      : slot.date
        ? new Date(slot.date).toISOString().slice(0, 10)
        : '';
  if (!dateStr) return `${slot.startTime}–${slot.endTime}`;
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return `${dateStr} at ${slot.startTime}–${slot.endTime}`;
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${slot.startTime}–${slot.endTime}`;
}

export const AppointmentsScreen: React.FC<AppointmentsScreenProps> = ({
  onBack,
  propertyToOpen,
  participantUid,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleProperty, setScheduleProperty] = useState<Property | null>(null);
  const [scheduleParticipantUid, setScheduleParticipantUid] = useState<string | undefined>();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestAppointment, setSuggestAppointment] = useState<Appointment | null>(null);

  const loadAppointments = useCallback(async () => {
    if (!user?.localId) {
      setLoading(false);
      return;
    }
    try {
      const data = await AppointmentService.getAppointments();
      setAppointments(data);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.localId]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    if (propertyToOpen) {
      setScheduleProperty(propertyToOpen);
      setScheduleParticipantUid(participantUid);
    }
  }, [propertyToOpen, participantUid]);

  const handleConfirm = async (a: Appointment) => {
    setRespondingId(a.id);
    try {
      await AppointmentService.confirmAppointment(a.id, !!a.suggestedSlot);
      loadAppointments();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to confirm');
    } finally {
      setRespondingId(null);
    }
  };

  const handleDecline = async (a: Appointment) => {
    Alert.alert('Decline appointment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setRespondingId(a.id);
          try {
            await AppointmentService.declineAppointment(a.id);
            loadAppointments();
          } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to decline');
          } finally {
            setRespondingId(null);
          }
        },
      },
    ]);
  };

  const handleSuggest = (a: Appointment) => {
    setSuggestAppointment(a);
    setShowSuggestModal(true);
  };

  const handleScheduleSuccess = () => {
    setScheduleProperty(null);
    setScheduleParticipantUid(undefined);
    loadAppointments();
  };

  if (scheduleProperty) {
    return (
      <ScheduleViewingScreen
        property={scheduleProperty}
        participantUid={scheduleParticipantUid}
        onBack={() => {
          setScheduleProperty(null);
          setScheduleParticipantUid(undefined);
        }}
        onSuccess={handleScheduleSuccess}
      />
    );
  }

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={[styles.backButtonText, { color: colors.text }]}>← Back</Text>
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Appointments</Text>
      <View style={{ width: 60 }} />
    </View>
  );

  const renderItem = ({ item }: { item: Appointment }) => {
    const needsResponse =
      item.status === 'pending' &&
      ((item.isInitiator && item.suggestedSlot) || (!item.isInitiator && !item.suggestedSlot));
    const otherName = item.otherUser
      ? [item.otherUser.firstName, item.otherUser.lastName].filter(Boolean).join(' ') ||
        item.otherUser.email ||
        'Unknown'
      : 'Unknown';
    const imageUrl = item.property?.images?.[0] || (item.property as any)?.imageUrl;

    const requesterText = item.isInitiator ? 'Requested by you' : `Requested by ${otherName}`;
    const approverText =
      item.status === 'confirmed'
        ? item.isInitiator
          ? `, approved by ${otherName}`
          : ', approved by you'
        : '';

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardRow}>
          <View style={[styles.avatar, { backgroundColor: colors.inputBackground }]}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.textSecondary }]}>
                {item.property?.title?.charAt(0) || '?'}
              </Text>
            )}
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.property?.title || 'Listing'}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              {requesterText}{approverText}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'confirmed' ? '#10B981' + '30' : item.status === 'declined' ? '#EF4444' + '30' : colors.accent + '30' }]}>
              <Text style={[styles.statusText, { color: colors.text }]}>
                {item.status === 'pending' ? 'Pending' : item.status === 'confirmed' ? 'Confirmed' : 'Declined'}
              </Text>
            </View>
            <Text style={[styles.slotText, { color: colors.textSecondary }]}>
              {formatSlot(item.displaySlot)}
            </Text>
            {item.suggestedSlot && item.status === 'pending' && (
              <Text style={[styles.suggestedText, { color: colors.accent }]}>
                {item.isInitiator ? 'They suggested: ' : 'You suggested: '}{formatSlot(item.suggestedSlot)}
              </Text>
            )}
          </View>
        </View>
        {needsResponse && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#10B981' }]}
              onPress={() => handleConfirm(item)}
              disabled={!!respondingId}
            >
              {respondingId === item.id ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Check size={18} color="#FFF" />
                  <Text style={styles.actionButtonText}>Confirm</Text>
                </>
              )}
            </TouchableOpacity>
            {!item.isInitiator && !item.suggestedSlot && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonOutline, { borderColor: colors.border }]}
                onPress={() => handleSuggest(item)}
                disabled={!!respondingId}
              >
                <Clock size={18} color={colors.text} />
                <Text style={[styles.actionButtonTextOutline, { color: colors.text }]}>Suggest</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={() => handleDecline(item)}
              disabled={!!respondingId}
            >
              <X size={18} color="#FFF" />
              <Text style={styles.actionButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {renderHeader()}
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Please sign in to view appointments.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {renderHeader()}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : appointments.length === 0 ? (
        <View style={styles.emptyState}>
          <Calendar size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No appointments yet.</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Schedule a viewing from a property or chat to get started.
          </Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAppointments(); }} tintColor={colors.accent} />
          }
        />
      )}

      {showSuggestModal && suggestAppointment && (
        <SuggestTimeModal
          appointment={suggestAppointment}
          visible={showSuggestModal}
          onClose={() => { setShowSuggestModal(false); setSuggestAppointment(null); }}
          onSuccess={() => { setShowSuggestModal(false); setSuggestAppointment(null); loadAppointments(); }}
          colors={colors}
        />
      )}
    </SafeAreaView>
  );
};

// Modal for suggesting a different time - simplified: user picks from availability
interface SuggestTimeModalProps {
  appointment: Appointment;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  colors: any;
}

function SuggestTimeModal({ appointment, visible, onClose, onSuccess, colors }: SuggestTimeModalProps) {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selected, setSelected] = useState<TimeSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && appointment?.property?.id) {
      setLoading(true);
      const from = new Date().toISOString().slice(0, 10);
      const to = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
      AppointmentService.getAvailability(appointment.property.id, from, to)
        .then((r) => setSlots(r.available))
        .catch(() => setSlots([]))
        .finally(() => setLoading(false));
    }
  }, [visible, appointment?.property?.id]);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await AppointmentService.suggestAppointment(appointment.id, selected);
      onSuccess();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to suggest time');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Suggest a different time</Text>
          {loading ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: 24 }} />
          ) : (
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {slots.slice(0, 30).map((s) => {
                const active = selected?.date === s.date && selected?.startTime === s.startTime;
                return (
                  <TouchableOpacity
                    key={`${s.date}-${s.startTime}`}
                    style={[styles.suggestSlot, { borderColor: colors.border }, active && { backgroundColor: colors.accent + '30', borderColor: colors.accent }]}
                    onPress={() => setSelected(s)}
                  >
                    <Text style={[styles.suggestSlotText, { color: colors.text }]}>
                      {s.date} {s.startTime}–{s.endTime}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.inputBackground }]} onPress={onClose}>
              <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.accent }, (!selected || submitting) && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={!selected || submitting}
            >
              {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.modalButtonTextWhite}>Suggest</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8 },
  backButtonText: { fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 32 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: { width: 48, height: 48 },
  avatarText: { fontSize: 18, fontWeight: '600' },
  cardContent: { flex: 1, marginLeft: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  cardSubtitle: { fontSize: 13, marginBottom: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  slotText: { fontSize: 13 },
  suggestedText: { fontSize: 12, marginTop: 4 },
  actionsRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonOutline: { backgroundColor: 'transparent', borderWidth: 1 },
  actionButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  actionButtonTextOutline: { fontSize: 14, fontWeight: '600' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  emptySubtext: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  modalScroll: { maxHeight: 300 },
  suggestSlot: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  suggestSlotText: { fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalButtonText: { fontSize: 16, fontWeight: '600' },
  modalButtonTextWhite: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
