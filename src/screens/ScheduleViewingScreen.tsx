import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AppointmentService } from '../services/AppointmentService';
import { Property } from '../types/Property';
import type { Appointment, TimeSlot } from '../types/Appointment';

interface ScheduleViewingScreenProps {
  property: Property;
  participantUid?: string; // When owner initiates from chat
  onBack: () => void;
  onSuccess?: () => void;
}

// Generate YYYY-MM-DD for next N days
function getDateRange(days: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < days; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dNorm = new Date(d);
  dNorm.setHours(0, 0, 0, 0);
  if (dNorm.getTime() === today.getTime()) return 'Today';
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dNorm.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export const ScheduleViewingScreen: React.FC<ScheduleViewingScreenProps> = ({
  property,
  participantUid,
  onBack,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState<{ blockSize: string; available: TimeSlot[] } | null>(null);
  const [pendingAppointment, setPendingAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [dates] = useState(() => getDateRange(14));

  const loadAvailability = useCallback(async () => {
    if (!property?.id) return;
    setLoading(true);
    try {
      const [res, appointments] = await Promise.all([
        AppointmentService.getAvailability(property.id, dates[0], dates[dates.length - 1]),
        AppointmentService.getAppointments(),
      ]);
      setAvailability({ blockSize: res.blockSize, available: res.available });
      const getPropId = (a: Appointment) =>
        (a.property as any)?.id || a.propertyId?.toString?.() || a.propertyId;
      const pending = appointments.find(
        (a) => a.status === 'pending' && getPropId(a) === property.id
      );
      setPendingAppointment(pending || null);
      setSelectedDate((prev) => {
        if (prev) return prev;
        if (pending?.requestedSlot || pending?.suggestedSlot) {
          const slot = pending.requestedSlot || pending.suggestedSlot!;
          const d = slot.date;
          return typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10);
        }
        return res.available.length > 0 ? res.available[0].date : prev;
      });
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  }, [property?.id, dates]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const slotsForDate = selectedDate && availability
    ? availability.available.filter((s) => s.date === selectedDate)
    : [];

  const pendingSlot = pendingAppointment?.requestedSlot || pendingAppointment?.suggestedSlot;
  const normalizeDate = (d: string | Date | undefined) =>
    !d ? '' : typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10);
  const pendingDateStr = normalizeDate(pendingSlot?.date as string | Date | undefined);

  const handleSubmit = async () => {
    if (!selectedSlot || !property?.id || !user?.localId) return;
    setSubmitting(true);
    try {
      await AppointmentService.createAppointment(
        property.id,
        selectedSlot,
        participantUid
      );
      Alert.alert('Request sent', 'The other party will be notified to confirm the appointment.', [
        { text: 'OK', onPress: () => { onSuccess?.(); onBack(); } },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to request appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const ownerUid = (property as any).owner?.uid || (property as any).ownerUid;
  const canSchedule = !!ownerUid;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.text }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Schedule viewing</Text>
        <View style={{ width: 60 }} />
      </View>

      <Text style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={1}>
        {property.title}
      </Text>
      <Text style={[styles.tzNote, { color: colors.textSecondary }]}>
        Times in Bishkek (Asia/Bishkek)
      </Text>

      {!canSchedule ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            This listing has no owner. Cannot schedule a viewing.
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {pendingAppointment && pendingSlot && (
            <View style={[styles.pendingBanner, { backgroundColor: colors.accent + '25', borderColor: colors.accent }]}>
              <Text style={[styles.pendingBannerText, { color: colors.text }]}>
                Pending request: {pendingDateStr} at {pendingSlot.startTime}–{pendingSlot.endTime}
              </Text>
              <Text style={[styles.pendingBannerSubtext, { color: colors.textSecondary }]}>
                Waiting for confirmation
              </Text>
              <TouchableOpacity
                style={[styles.cancelRequestButton, { borderColor: colors.textSecondary }]}
                onPress={() => {
                  Alert.alert(
                    'Cancel request',
                    'Are you sure you want to cancel this viewing request?',
                    [
                      { text: 'No', style: 'cancel' },
                      {
                        text: 'Yes, cancel',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await AppointmentService.declineAppointment(pendingAppointment.id);
                            loadAvailability();
                          } catch (e: any) {
                            Alert.alert('Error', e?.response?.data?.message || 'Failed to cancel');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={[styles.cancelRequestText, { color: colors.textSecondary }]}>Cancel request</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.dateSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select date</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.datesScroll}
              style={styles.datesScrollView}
            >
              {dates.map((d) => {
                const hasSlots = availability?.available.some((s) => s.date === d);
                const active = selectedDate === d;
                const hasPending = pendingDateStr === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.dateChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      active && { backgroundColor: colors.accent, borderColor: colors.accent },
                      hasPending && !active && { borderColor: colors.accent, borderWidth: 2 },
                      !hasSlots && styles.dateChipDisabled,
                    ]}
                    onPress={() => hasSlots && setSelectedDate(d)}
                    disabled={!hasSlots}
                  >
                    <Text
                      style={[
                        styles.dateChipDay,
                        { color: hasSlots ? (active ? '#FFF' : colors.text) : colors.textSecondary },
                      ]}
                    >
                      {formatDateLabel(d).split(' ')[0]}
                    </Text>
                    <Text
                      style={[
                        styles.dateChipDate,
                        { color: hasSlots ? (active ? '#FFF' : colors.textSecondary) : colors.textSecondary },
                      ]}
                    >
                      {d.slice(8, 10)}/{d.slice(5, 7)}
                    </Text>
                    {hasPending && (
                      <View style={[styles.pendingDot, { backgroundColor: active ? '#FFF' : colors.accent }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Select time</Text>
          <View style={styles.slotsGrid}>
            {slotsForDate.map((slot) => {
              const active = selectedSlot?.date === slot.date && selectedSlot?.startTime === slot.startTime;
              const isPending =
                pendingDateStr === slot.date &&
                pendingSlot?.startTime === slot.startTime;
              return (
                <TouchableOpacity
                  key={`${slot.date}-${slot.startTime}`}
                  style={[
                    styles.slotChip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    active && { backgroundColor: colors.accent, borderColor: colors.accent },
                    isPending && !active && { backgroundColor: colors.accent + '40', borderColor: colors.accent, borderWidth: 2 },
                  ]}
                  onPress={() => !pendingAppointment && setSelectedSlot(slot)}
                  disabled={!!pendingAppointment}
                >
                  <Text
                    style={[
                      styles.slotChipText,
                      { color: active ? '#FFF' : isPending ? colors.accent : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {slot.startTime}–{slot.endTime}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedDate && slotsForDate.length === 0 && (
            <Text style={[styles.noSlots, { color: colors.textSecondary }]}>
              No available slots for this date
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.accent },
              (!selectedSlot || submitting || pendingAppointment) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!selectedSlot || submitting || !!pendingAppointment}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : pendingAppointment ? (
              <Text style={styles.submitButtonText}>Request pending</Text>
            ) : (
              <Text style={styles.submitButtonText}>Request appointment</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

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
  propertyTitle: { fontSize: 16, fontWeight: '600', marginHorizontal: 16, marginTop: 16 },
  tzNote: { fontSize: 12, marginHorizontal: 16, marginTop: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentScroll: { flex: 1 },
  contentScrollContent: { paddingBottom: 24 },
  pendingBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pendingBannerText: { fontSize: 14, fontWeight: '600' },
  pendingBannerSubtext: { fontSize: 12, marginTop: 4 },
  cancelRequestButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  cancelRequestText: { fontSize: 14, fontWeight: '600' },
  dateSection: { marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginHorizontal: 16, marginTop: 20 },
  datesScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  datesScrollView: { flexGrow: 0, minHeight: 72 },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  dateChipDisabled: { opacity: 0.5 },
  dateChipDay: { fontSize: 13, fontWeight: '600' },
  dateChipDate: { fontSize: 11 },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  slotChip: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    width: '31%',
    minWidth: 85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotChipText: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  noSlots: { fontSize: 14, marginHorizontal: 16, marginTop: 8 },
  submitButton: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, textAlign: 'center' },
});
