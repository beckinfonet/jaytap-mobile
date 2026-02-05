import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Key from GoogleService-Info.plist
const API_KEY = 'AIzaSyA4Cnt_v1WeULFl8b4e0kNt-l6IgyX-DoY';

const AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';

// Backend API URL
const BACKEND_URL = 'https://jaytap-services-production.up.railway.app/api';

export const AuthService = {
  signUp: async (email: string, password: string) => {
    try {
      const response = await axios.post(`${AUTH_URL}:signUp?key=${API_KEY}`, {
        email,
        password,
        returnSecureToken: true,
      });
      return response.data;
    } catch (error: any) {
      throw error.response ? error.response.data.error : error;
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const response = await axios.post(`${AUTH_URL}:signInWithPassword?key=${API_KEY}`, {
        email,
        password,
        returnSecureToken: true,
      });
      return response.data;
    } catch (error: any) {
      throw error.response ? error.response.data.error : error;
    }
  },

  saveToken: async (token: string, userData: any) => {
    await AsyncStorage.setItem('userToken', token);
    await AsyncStorage.setItem('userData', JSON.stringify(userData));
  },

  getToken: async () => {
    return await AsyncStorage.getItem('userToken');
  },

  getUserData: async () => {
    const data = await AsyncStorage.getItem('userData');
    return data ? JSON.parse(data) : null;
  },

  logout: async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
  },

  // Backend User Methods
  createBackendUser: async (firebaseUid: string, email: string) => {
    try {
      await axios.post(`${BACKEND_URL}/auth/users`, { firebaseUid, email });
    } catch (error: any) {
      console.error('Failed to create backend user', error);
    }
  },

  getBackendUser: async (firebaseUid: string) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/auth/users/${firebaseUid}`);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // User not found is expected for new users or fresh DB
        return null;
      }
      console.error('Failed to get backend user', error);
      return null;
    }
  },
};
