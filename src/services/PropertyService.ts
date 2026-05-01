import { apiClient } from './apiClient';
import { AuthService } from './AuthService';
import { canFromUser, PermissionDeniedError } from '../hooks/useRole';

// Phase 1 Plan 11 (ROLE-05): all backend HTTP migrated to the shared apiClient.
// baseURL + Authorization: Bearer header are owned by `apiClient` (see Plan 10).
// Per plan: AuthService stays on direct axios because it talks to Firebase
// Identity Toolkit, not the JayTap backend.

export const PropertyService = {
  getAllProperties: async () => {
    try {
      const response = await apiClient.get('/properties');
      // Map _id to id for frontend compatibility
      const mapped = response.data.map((p: any) => ({ ...p, id: p._id }));
      return mapped;
    } catch (error: any) {
      console.error('Error fetching properties:', error?.message);
      throw error;
    }
  },

  getPropertyById: async (id: string) => {
    try {
      const response = await apiClient.get(`/properties/${id}`);
      return { ...response.data, id: response.data._id };
    } catch (error: any) {
      console.error('Error fetching property:', error?.message);
      throw error;
    }
  },

  getUserProperties: async (firebaseUid: string) => {
    try {
      const response = await apiClient.get(`/properties/user/${firebaseUid}`);
      // Map _id to id for frontend compatibility
      return response.data.map((p: any) => ({ ...p, id: p._id }));
    } catch (error: any) {
      console.error('Error fetching user properties:', error?.message);
      throw error;
    }
  },

  createProperty: async (propertyData: any, images: any[] = []) => {
    try {
      const userData = await AuthService.getUserData();
      if (!userData?.localId) {
        throw new Error('User not authenticated');
      }

      // Create FormData for multipart/form-data
      const formData = new FormData();

      // Legacy body field — backend (Plan 06) now derives uid from the
      // JWKS-verified Bearer (req.user.uid). Kept for the dual-accept window
      // (D-04) and removed when the backend cuts over in Phase 6 (D-05).
      formData.append('firebaseUid', userData.localId);

      // Add property fields
      formData.append('title', propertyData.title);
      formData.append('description', propertyData.description || '');
      formData.append('address', propertyData.address);
      formData.append('city', propertyData.city || 'Bishkek');
      formData.append('price', propertyData.price?.toString() || '0');
      formData.append('currency', propertyData.currency || '$');
      formData.append('period', propertyData.period || '');
      formData.append('type', propertyData.type || 'rent');
      formData.append('propertyType', propertyData.propertyType || 'apartment');
      formData.append('bedrooms', propertyData.bedrooms?.toString() || '0');
      formData.append('bathrooms', propertyData.bathrooms?.toString() || '0');
      formData.append('areaSqm', propertyData.areaSqm?.toString() || '0');
      formData.append('features', JSON.stringify(propertyData.features || []));
      formData.append('videoUrl', propertyData.videoUrl || '');
      formData.append('panoramicPhotosUrl', propertyData.panoramicPhotosUrl || '');
      formData.append('instagramUrl', propertyData.instagramUrl || '');
      formData.append('status', propertyData.status || 'draft');
      // Phase 6 (HOSP-05 / Gap 9.1) — Hospitality fields wired to backend
      formData.append('rooms', propertyData.rooms?.toString() || '0');
      formData.append('maxGuests', propertyData.maxGuests?.toString() || '0');
      formData.append('amenities', JSON.stringify(propertyData.amenities || []));
      if (propertyData.availableDate) {
        formData.append('availableDate', propertyData.availableDate);
      }

      // Add Matterport tours if provided
      if (propertyData.tours && propertyData.tours.length > 0) {
        formData.append('tours', JSON.stringify(propertyData.tours));
      }

      if (propertyData.platformVerifications) {
        formData.append('platformVerifications', JSON.stringify(propertyData.platformVerifications));
      }

      // Add images
      images.forEach((image, index) => {
        formData.append('images', {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: image.name || `image-${index}.jpg`,
        } as any);
      });

      // No manual Content-Type header — axios auto-detects FormData and sets
      // multipart/form-data with the correct boundary. Setting it manually
      // strips the boundary and breaks the upload.
      const response = await apiClient.post('/properties', formData);

      return { ...response.data, id: response.data._id };
    } catch (error: any) {
      console.error('Error creating property:', error);
      throw error;
    }
  },

  updateProperty: async (propertyId: string, propertyData: any, images: any[] = []) => {
    try {
      const userData = await AuthService.getUserData();
      if (!userData?.localId) {
        throw new Error('User not authenticated');
      }

      // Create FormData for multipart/form-data
      const formData = new FormData();

      // Legacy body field — see createProperty note above.
      formData.append('firebaseUid', userData.localId);

      // Add property fields
      formData.append('title', propertyData.title);
      formData.append('description', propertyData.description || '');
      formData.append('address', propertyData.address);
      formData.append('city', propertyData.city || 'Bishkek');
      formData.append('price', propertyData.price?.toString() || '0');
      formData.append('currency', propertyData.currency || '$');
      formData.append('period', propertyData.period || '');
      formData.append('type', propertyData.type || 'rent');
      formData.append('propertyType', propertyData.propertyType || 'apartment');
      formData.append('bedrooms', propertyData.bedrooms?.toString() || '0');
      formData.append('bathrooms', propertyData.bathrooms?.toString() || '0');
      formData.append('areaSqm', propertyData.areaSqm?.toString() || '0');
      formData.append('features', JSON.stringify(propertyData.features || []));
      formData.append('videoUrl', propertyData.videoUrl || '');
      formData.append('panoramicPhotosUrl', propertyData.panoramicPhotosUrl || '');
      formData.append('instagramUrl', propertyData.instagramUrl || '');
      formData.append('status', propertyData.status || 'draft');
      // Phase 6 (HOSP-05 / Gap 9.1) — Hospitality fields wired to backend
      formData.append('rooms', propertyData.rooms?.toString() || '0');
      formData.append('maxGuests', propertyData.maxGuests?.toString() || '0');
      formData.append('amenities', JSON.stringify(propertyData.amenities || []));
      if (propertyData.availableDate) {
        formData.append('availableDate', propertyData.availableDate);
      }

      // Add Matterport tours if provided
      if (propertyData.tours && propertyData.tours.length > 0) {
        formData.append('tours', JSON.stringify(propertyData.tours));
      }

      if (propertyData.platformVerifications) {
        formData.append('platformVerifications', JSON.stringify(propertyData.platformVerifications));
      }

      // Add existing images (URLs) if provided (for updates)
      if (propertyData.existingImages && propertyData.existingImages.length > 0) {
        formData.append('existingImages', JSON.stringify(propertyData.existingImages));
      }

      // Add new images (files to upload)
      images.forEach((image, index) => {
        formData.append('images', {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: image.name || `image-${index}.jpg`,
        } as any);
      });

      // No manual Content-Type header — see createProperty note above.
      const response = await apiClient.put(`/properties/${propertyId}`, formData);

      return { ...response.data, id: response.data._id };
    } catch (error: any) {
      console.error('Error updating property:', error);
      throw error;
    }
  },

  /** Admin only: update verification flags on any listing */
  patchPlatformVerifications: async (
    propertyId: string,
    platformVerifications: {
      ownershipDocuments: boolean;
      ownerIdentityVerified: boolean;
      stateIssuedDocumentsVerified: boolean;
    }
  ) => {
    const userData = await AuthService.getUserData();
    if (!userData?.localId) {
      throw new Error('User not authenticated');
    }
    if (!canFromUser(userData, 'editVerifications')) {
      console.error('[PropertyService.patchPlatformVerifications] permission denied', { userId: userData?.localId });
      throw new PermissionDeniedError();
    }
    const response = await apiClient.patch(
      `/properties/${propertyId}/verifications`,
      // Legacy body field — see createProperty note. Backend dual-accepts.
      { firebaseUid: userData.localId, platformVerifications }
    );
    return { ...response.data, id: response.data._id };
  },

  /** Soft-delete: move a listing to 'archived'. Hidden from public browse, restorable to draft. */
  archiveProperty: async (propertyId: string) => {
    try {
      const userData = await AuthService.getUserData();
      if (!userData?.localId) {
        throw new Error('User not authenticated');
      }

      const formData = new FormData();
      formData.append('firebaseUid', userData.localId);
      formData.append('status', 'archived');

      const response = await apiClient.put(`/properties/${propertyId}`, formData);
      return { ...response.data, id: response.data._id };
    } catch (error: any) {
      console.error('Error archiving property:', error);
      throw error;
    }
  },

  /** Restore an archived listing back to 'draft'. Author re-publishes from the edit screen when ready. */
  unarchiveProperty: async (propertyId: string) => {
    try {
      const userData = await AuthService.getUserData();
      if (!userData?.localId) {
        throw new Error('User not authenticated');
      }

      const formData = new FormData();
      formData.append('firebaseUid', userData.localId);
      formData.append('status', 'draft');

      const response = await apiClient.put(`/properties/${propertyId}`, formData);
      return { ...response.data, id: response.data._id };
    } catch (error: any) {
      console.error('Error unarchiving property:', error);
      throw error;
    }
  },

  deleteProperty: async (propertyId: string) => {
    try {
      const userData = await AuthService.getUserData();
      if (!userData?.localId) {
        throw new Error('User not authenticated');
      }

      const response = await apiClient.delete(`/properties/${propertyId}`, {
        // Legacy body field — see createProperty note.
        data: { firebaseUid: userData.localId },
      });

      return response.data;
    } catch (error: any) {
      console.error('Error deleting property:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },
};
