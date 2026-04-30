import { apiClient } from './apiClient';
import type { Appointment, AvailabilityResponse, OwnerSettings, TimeSlot } from '../types/Appointment';

// Phase 1 Plan 11 (ROLE-05): all backend HTTP migrated to the shared apiClient.
// baseURL + Authorization: Bearer header are owned by `apiClient` (see Plan 10).
// AuthService stays on direct axios (Firebase Identity Toolkit, not backend).

export const AppointmentService = {
  getAppointments: async (): Promise<Appointment[]> => {
    const response = await apiClient.get('/appointments');
    return response.data.map((a: any) => ({ ...a, id: a._id || a.id }));
  },

  getAvailability: async (
    propertyId: string,
    from: string,
    to: string
  ): Promise<AvailabilityResponse> => {
    const response = await apiClient.get(
      `/appointments/availability/${propertyId}?from=${from}&to=${to}`
    );
    return response.data;
  },

  getOwnerSettings: async (): Promise<OwnerSettings> => {
    const response = await apiClient.get('/appointments/owner-settings');
    return response.data;
  },

  updateOwnerSettings: async (
    settings: Partial<OwnerSettings>
  ): Promise<OwnerSettings> => {
    const response = await apiClient.put(
      '/appointments/owner-settings',
      settings
    );
    return response.data;
  },

  createAppointment: async (
    propertyId: string,
    slot: TimeSlot,
    participantUid?: string
  ): Promise<Appointment> => {
    const body: Record<string, string> = {
      propertyId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    };
    if (participantUid) body.participantUid = participantUid;
    const response = await apiClient.post('/appointments', body);
    return { ...response.data, id: response.data._id || response.data.id };
  },

  confirmAppointment: async (
    appointmentId: string,
    useSuggested: boolean = false
  ): Promise<Appointment> => {
    const response = await apiClient.put(
      `/appointments/${appointmentId}/confirm`,
      { useSuggested }
    );
    return { ...response.data, id: response.data._id || response.data.id };
  },

  declineAppointment: async (appointmentId: string): Promise<void> => {
    await apiClient.put(
      `/appointments/${appointmentId}/decline`,
      {}
    );
  },

  suggestAppointment: async (
    appointmentId: string,
    slot: TimeSlot
  ): Promise<Appointment> => {
    const response = await apiClient.put(
      `/appointments/${appointmentId}/suggest`,
      slot
    );
    return { ...response.data, id: response.data._id || response.data.id };
  },
};
