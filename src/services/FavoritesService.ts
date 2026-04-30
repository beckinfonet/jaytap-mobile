import { apiClient } from './apiClient';
import { AuthService } from './AuthService';

// Phase 1 Plan 11 (ROLE-05): all backend HTTP migrated to the shared apiClient.
// baseURL + Authorization: Bearer header are owned by `apiClient` (see Plan 10).
//
// Soft-auth GET pattern preserved: when there is no userToken, the GET routes
// return [] / false locally without round-tripping. The backend GET /favorites
// route is also soft-auth (Plan 06 mounted Bearer middleware on writes only),
// so a no-token request would still succeed — but we keep the client-side
// short-circuit to avoid an unnecessary network call.

export const FavoritesService = {
  /**
   * Get all favorites for the current user
   */
  getFavorites: async () => {
    try {
      const userData = await AuthService.getUserData();
      if (!userData?.localId) {
        // Anonymous shortcut — skip the round-trip.
        return [];
      }

      const response = await apiClient.get('/favorites');

      if (!response.data) {
        return [];
      }

      if (!Array.isArray(response.data)) {
        return [];
      }

      const mapped = response.data.map((p: any) => {
        const property = { ...p, id: p._id || p.id };
        return property;
      });

      return mapped;
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 500) {
        return [];
      }

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
        return false;
      }

      const response = await apiClient.get(`/favorites/check/${propertyId}`);

      return response.data.isFavorited;
    } catch (error: any) {
      console.error('Error checking favorite:', error);
      return false;
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

      const response = await apiClient.post(`/favorites/${propertyId}`, {});

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

      const response = await apiClient.delete(`/favorites/${propertyId}`);

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

      const response = await apiClient.post(`/favorites/toggle/${propertyId}`, {});

      return response.data;
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  },
};
