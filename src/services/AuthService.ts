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
  createBackendUser: async (firebaseUid: string, email: string, profileData: any = {}) => {
    try {
      await axios.post(`${BACKEND_URL}/auth/users`, { firebaseUid, email, ...profileData });
    } catch (error: any) {
      console.error('Failed to create/update backend user', error);
      // Check if account is locked
      if (error.response?.data?.code === 'ACCOUNT_LOCKED') {
        throw new Error(error.response.data.message || 'This account has been locked. Please contact support.');
      }
      throw error; // Re-throw so UI can handle success/failure
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
      // Check if account is locked
      if (error.response?.data?.code === 'ACCOUNT_LOCKED') {
        throw new Error(error.response.data.message || 'This account has been locked. Please contact support.');
      }
      console.error('Failed to get backend user', error);
      return null;
    }
  },

  // Delete Account - Soft delete with account lock (keeps record for dispute handling)
  deleteAccount: async (firebaseUid: string, idToken: string) => {
    try {
      console.log('Starting account deletion for:', firebaseUid);

      // First, soft delete and lock account in MongoDB backend
      const backendResponse = await axios.delete(`${BACKEND_URL}/auth/users/${firebaseUid}`);
      console.log('Backend soft delete successful:', backendResponse.data);

      // Then, delete from Firebase Auth using REST API (prevents login)
      try {
        await axios.post(`${AUTH_URL}:delete?key=${API_KEY}`, {
          idToken,
        });
        console.log('Firebase Auth deletion successful');
      } catch (firebaseError: any) {
        // If Firebase deletion fails but backend succeeded, log warning but continue
        // The account is already locked in backend, so user can't access it anyway
        console.warn('Firebase Auth deletion failed, but account is already locked in backend:', firebaseError?.response?.data || firebaseError?.message);
        // Don't throw - backend soft delete succeeded, which is the important part
      }

      // Clear local storage
      await AuthService.logout();
      console.log('Account deletion completed successfully');
    } catch (error: any) {
      console.error('Failed to delete account - Full error:', error);
      console.error('Error response:', error?.response?.data);
      console.error('Error status:', error?.response?.status);

      // Handle different error structures
      if (error?.response) {
        // Backend error
        const errorData = error.response.data;
        if (errorData?.message) {
          throw new Error(errorData.message);
        } else if (errorData?.error?.message) {
          throw new Error(errorData.error.message);
        } else if (errorData?.error) {
          throw new Error(typeof errorData.error === 'string' ? errorData.error : 'Failed to delete account');
        }
        // If we have a status but no message, provide a generic one
        throw new Error(`Failed to delete account (${error.response.status}). Please try again or contact support.`);
      }

      // Firebase or network error
      if (error?.message) {
        throw new Error(error.message);
      }

      throw new Error('Failed to delete account. Please try again or contact support.');
    }
  },
};
