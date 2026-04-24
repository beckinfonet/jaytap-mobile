import axios from 'axios';
import { Platform } from 'react-native';
import { AuthService } from './AuthService';
import { canFromUser, PermissionDeniedError } from '../hooks/useRole';

// Use deployed backend URL for production, or fallback to localhost for dev if needed.
// Ideally, use environment variables (react-native-config or similar).
const PRODUCTION_URL = 'https://jaytap-services-production.up.railway.app/api';
const LOCAL_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';

// Simple toggle for now. In a real app, use __DEV__ check.
const API_URL = PRODUCTION_URL;

export const PropertyService = {
  getAllProperties: async () => {
    const url = `${API_URL}/properties`;
    try {
      const response = await axios.get(url);
      // Map _id to id for frontend compatibility
      const mapped = response.data.map((p: any) => ({ ...p, id: p._id }));
      return mapped;
    } catch (error: any) {
      console.error('Error fetching properties:', error?.message);
      throw error;
    }
  },

  getPropertyById: async (id: string) => {
    const url = `${API_URL}/properties/${id}`;
    try {
      const response = await axios.get(url);
      return { ...response.data, id: response.data._id };
    } catch (error: any) {
      console.error('Error fetching property:', error?.message);
      throw error;
    }
  },

  getUserProperties: async (firebaseUid: string) => {
    const url = `${API_URL}/properties/user/${firebaseUid}`;
    try {
      const response = await axios.get(url);
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
      
      // Add firebaseUid for authentication
      formData.append('firebaseUid', userData.localId);
      
      // Add property fields
      formData.append('title', propertyData.title);
      formData.append('description', propertyData.description || '');
      formData.append('address', propertyData.address);
      formData.append('city', propertyData.city || 'Bishkek');
      formData.append('price', propertyData.price.toString());
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

      const response = await axios.post(`${API_URL}/properties`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-firebase-uid': userData.localId, // Send in headers for auth middleware
        },
      });

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
      
      // Add firebaseUid for authentication
      formData.append('firebaseUid', userData.localId);
      
      // Add property fields
      formData.append('title', propertyData.title);
      formData.append('description', propertyData.description || '');
      formData.append('address', propertyData.address);
      formData.append('city', propertyData.city || 'Bishkek');
      formData.append('price', propertyData.price.toString());
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

      const response = await axios.put(`${API_URL}/properties/${propertyId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-firebase-uid': userData.localId, // Send in headers for auth middleware
        },
      });

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
    const response = await axios.patch(
      `${API_URL}/properties/${propertyId}/verifications`,
      { firebaseUid: userData.localId, platformVerifications },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-firebase-uid': userData.localId,
        },
      }
    );
    return { ...response.data, id: response.data._id };
  },

  deleteProperty: async (propertyId: string) => {
    try {
      const userData = await AuthService.getUserData();
      if (!userData?.localId) {
        throw new Error('User not authenticated');
      }

      const response = await axios.delete(`${API_URL}/properties/${propertyId}`, {
        data: { firebaseUid: userData.localId },
        headers: {
          'x-firebase-uid': userData.localId,
        },
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

