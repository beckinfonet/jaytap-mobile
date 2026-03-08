import axios from 'axios';
import { Platform } from 'react-native';
import { AuthService } from './AuthService';
import type { Appointment, AvailabilityResponse, OwnerSettings, TimeSlot } from '../types/Appointment';

const PRODUCTION_URL = 'https://jaytap-services-production.up.railway.app/api';
const LOCAL_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';
const API_URL = PRODUCTION_URL;

const getHeaders = async () => {
  const userData = await AuthService.getUserData();
  const uid = userData?.localId;
  return uid ? { 'x-firebase-uid': uid } : {};
};

export const AppointmentService = {
  getAppointments: async (): Promise<Appointment[]> => {
    const headers = await getHeaders();
    const response = await axios.get(`${API_URL}/appointments`, { headers });
    return response.data.map((a: any) => ({ ...a, id: a._id || a.id }));
  },

  getAvailability: async (
    propertyId: string,
    from: string,
    to: string
  ): Promise<AvailabilityResponse> => {
    const headers = await getHeaders();
    const response = await axios.get(
      `${API_URL}/appointments/availability/${propertyId}?from=${from}&to=${to}`,
      { headers }
    );
    return response.data;
  },

  getOwnerSettings: async (): Promise<OwnerSettings> => {
    const headers = await getHeaders();
    const response = await axios.get(`${API_URL}/appointments/owner-settings`, { headers });
    return response.data;
  },

  updateOwnerSettings: async (
    settings: Partial<OwnerSettings>
  ): Promise<OwnerSettings> => {
    const headers = await getHeaders();
    const response = await axios.put(
      `${API_URL}/appointments/owner-settings`,
      settings,
      { headers }
    );
    return response.data;
  },

  createAppointment: async (
    propertyId: string,
    slot: TimeSlot,
    participantUid?: string
  ): Promise<Appointment> => {
    const headers = await getHeaders();
    const body: Record<string, string> = {
      propertyId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    };
    if (participantUid) body.participantUid = participantUid;
    const response = await axios.post(`${API_URL}/appointments`, body, { headers });
    return { ...response.data, id: response.data._id || response.data.id };
  },

  confirmAppointment: async (
    appointmentId: string,
    useSuggested: boolean = false
  ): Promise<Appointment> => {
    const headers = await getHeaders();
    const response = await axios.put(
      `${API_URL}/appointments/${appointmentId}/confirm`,
      { useSuggested },
      { headers }
    );
    return { ...response.data, id: response.data._id || response.data.id };
  },

  declineAppointment: async (appointmentId: string): Promise<void> => {
    const headers = await getHeaders();
    await axios.put(
      `${API_URL}/appointments/${appointmentId}/decline`,
      {},
      { headers }
    );
  },

  suggestAppointment: async (
    appointmentId: string,
    slot: TimeSlot
  ): Promise<Appointment> => {
    const headers = await getHeaders();
    const response = await axios.put(
      `${API_URL}/appointments/${appointmentId}/suggest`,
      slot,
      { headers }
    );
    return { ...response.data, id: response.data._id || response.data.id };
  },
};
