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

  /** Firebase Identity Toolkit REST — same flow as CarEx; no Firebase client SDK. */
  sendPasswordResetEmail: async (email: string) => {
    try {
      const response = await axios.post(`${AUTH_URL}:sendOobCode?key=${API_KEY}`, {
        requestType: 'PASSWORD_RESET',
        email,
      });
      return response.data;
    } catch (error: any) {
      throw error.response ? error.response.data.error : error;
    }
  },

  confirmPasswordReset: async (oobCode: string, newPassword: string) => {
    try {
      const response = await axios.post(`${AUTH_URL}:resetPassword?key=${API_KEY}`, {
        oobCode,
        newPassword,
      });
      return response.data;
    } catch (error: any) {
      throw error.response ? error.response.data.error : error;
    }
  },

  /**
   * Exchange a Firebase refresh token for a fresh id_token via the Identity
   * Toolkit secure-token endpoint. Persists BOTH the new id_token (under
   * `userToken`) and the new refresh_token (under `refreshToken`) — Firebase
   * may rotate the refresh token, so always overwrite.
   *
   * Phase 1 / ROLE-06 / D-10: closes the latent M1 60-min session-death bug.
   * Consumed by `apiClient.ts` 401 token-expired interceptor (single-flight).
   */
  refreshIdToken: async (refreshToken: string): Promise<string> => {
    const formBody = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`;
    const response = await axios.post(
      `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`,
      formBody,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { id_token, refresh_token } = response.data;
    await AsyncStorage.setItem('userToken', id_token);
    await AsyncStorage.setItem('refreshToken', refresh_token);
    return id_token;
  },

  saveToken: async (token: string, userData: any, refreshToken?: string) => {
    await AsyncStorage.setItem('userToken', token);
    await AsyncStorage.setItem('userData', JSON.stringify(userData));
    if (refreshToken) {
      await AsyncStorage.setItem('refreshToken', refreshToken);
    }
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
    await AsyncStorage.removeItem('refreshToken');
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

      // First, soft delete and lock account in MongoDB backend
      const backendResponse = await axios.delete(`${BACKEND_URL}/auth/users/${firebaseUid}`);

      // Then, delete from Firebase Auth using REST API (prevents login)
      try {
        await axios.post(`${AUTH_URL}:delete?key=${API_KEY}`, {
          idToken,
        });
      } catch (firebaseError: any) {
        // If Firebase deletion fails but backend succeeded, log warning but continue
        // The account is already locked in backend, so user can't access it anyway
        console.warn('Firebase Auth deletion failed, but account is already locked in backend:', firebaseError?.response?.data || firebaseError?.message);
        // Don't throw - backend soft delete succeeded, which is the important part
      }

      // Clear local storage
      await AuthService.logout();
    } catch (error: any) {
      if (error?.response) {
        const errorData = error.response.data;
        if (errorData?.message) {
          throw new Error(errorData.message);
        } else if (errorData?.error?.message) {
          throw new Error(errorData.error.message);
        } else if (errorData?.error) {
          throw new Error(typeof errorData.error === 'string' ? errorData.error : 'Failed to delete account');
        }
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
