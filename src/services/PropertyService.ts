import axios from 'axios';
import { Platform } from 'react-native';

const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';

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

