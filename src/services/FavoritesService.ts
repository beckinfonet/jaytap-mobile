import axios from 'axios';
import { Platform } from 'react-native';
import { AuthService } from './AuthService';

// Use deployed backend URL for production, or fallback to localhost for dev if needed.
const PRODUCTION_URL = 'https://jaytap-services-production.up.railway.app/api';
const LOCAL_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';

// Simple toggle for now. In a real app, use __DEV__ check.
const API_URL = PRODUCTION_URL;

export const FavoritesService = {
  /**
   * Get all favorites for the current user
   */
  getFavorites: async () => {
    try {
      const userData = await AuthService.getUserData();
      if (!userData?.localId) {
        console.log('No user data, cannot fetch favorites');
        return [];
      }

      console.log('Fetching favorites from:', `${API_URL}/favorites`);
      console.log('With firebaseUid:', userData.localId);

      const response = await axios.get(`${API_URL}/favorites`, {
        headers: {
          'x-firebase-uid': userData.localId,
        },
      });
      
      console.log('Favorites response status:', response.status);
      console.log('Favorites response data:', response.data);
      
      // Handle empty array or null response
      if (!response.data) {
        console.log('No response data, returning empty array');
        return [];
      }
      
      if (!Array.isArray(response.data)) {
        console.log('Response data is not an array:', typeof response.data);
        return [];
      }
      
      console.log('Mapping', response.data.length, 'favorites');
      
      // Map _id to id for frontend compatibility
      const mapped = response.data.map((p: any) => {
        const property = { ...p, id: p._id || p.id };
        console.log('Mapped property:', property.id, property.title);
        return property;
      });
      
      console.log('Returning', mapped.length, 'mapped favorites');
      return mapped;
    } catch (error: any) {
      console.error('Error fetching favorites:', error);
      console.error('Error response:', error?.response?.data);
      console.error('Error status:', error?.response?.status);
      
      // If it's a 404 or 500, return empty array instead of throwing
      // This allows the app to continue working even if favorites service is down
      if (error?.response?.status === 404 || error?.response?.status === 500) {
        console.log('Favorites service returned error, returning empty array');
        return [];
      }
      
      // For other errors, also return empty array to prevent crashes
      console.log('Returning empty array due to error');
      return [];
    }
  },

  /**
   * Check if a property is favorited by the current user
   */
  checkFavorite: async (propertyId: string) => {
    try {
      const userData = await AuthService.getUserData();
      if (!userData?.localId) {
        return false; // Not authenticated, so not favorited
      }

      const response = await axios.get(`${API_URL}/favorites/check/${propertyId}`, {
        headers: {
          'x-firebase-uid': userData.localId,
        },
      });
      
      return response.data.isFavorited;
    } catch (error: any) {
      console.error('Error checking favorite:', error);
      return false; // Default to not favorited on error
    }
  },

  /**
   * Add a property to favorites
   */
  addFavorite: async (propertyId: string) => {
    try {
      const userData = await AuthService.getUserData();
      if (!userData?.localId) {
        throw new Error('User not authenticated');
      }

      const response = await axios.post(
        `${API_URL}/favorites/${propertyId}`,
        {},
        {
          headers: {
            'x-firebase-uid': userData.localId,
          },
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  },

  /**
   * Remove a property from favorites
   */
  removeFavorite: async (propertyId: string) => {
    try {
      const userData = await AuthService.getUserData();
      if (!userData?.localId) {
        throw new Error('User not authenticated');
      }

      const response = await axios.delete(`${API_URL}/favorites/${propertyId}`, {
        headers: {
          'x-firebase-uid': userData.localId,
        },
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  },

  /**
   * Toggle favorite status (add if not favorited, remove if favorited)
   */
  toggleFavorite: async (propertyId: string) => {
    try {
      const userData = await AuthService.getUserData();
      if (!userData?.localId) {
        throw new Error('User not authenticated');
      }

      const response = await axios.post(
        `${API_URL}/favorites/toggle/${propertyId}`,
        {},
        {
          headers: {
            'x-firebase-uid': userData.localId,
          },
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  },
};

