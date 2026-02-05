import axios from 'axios';
import { Platform } from 'react-native';

// Use deployed backend URL for production, or fallback to localhost for dev if needed.
// Ideally, use environment variables (react-native-config or similar).
const PRODUCTION_URL = 'https://jaytap-services-production.up.railway.app/api';
const LOCAL_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';

// Simple toggle for now. In a real app, use __DEV__ check.
const API_URL = PRODUCTION_URL; 

export const PropertyService = {
  getAllProperties: async () => {
    try {
      const response = await axios.get(`${API_URL}/properties`);
      // Map _id to id for frontend compatibility
      return response.data.map((p: any) => ({ ...p, id: p._id }));
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }
  },

  getPropertyById: async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/properties/${id}`);
      return { ...response.data, id: response.data._id };
    } catch (error) {
      console.error('Error fetching property details:', error);
      throw error;
    }
  },
};

