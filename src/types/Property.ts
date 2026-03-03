export interface Tour {
  id: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
}

export interface Property {
  id: string;
  listingId?: string; // 6-digit listing ID in format "123-456"
  title: string;
  price: number | string;
  currency: string;
  period?: string; // e.g., 'month' for rent
  address: string;
  city?: string; // Added city
  latitude?: number; // Property coordinates for map display
  longitude?: number; // Property coordinates for map display
  description: string;
  specs: {
    beds: number;
    baths: number;
    sqft: number;
  };
  features: string[];
  imageUrl: string;
  images?: string[]; // Optional, if we want to show carousel
  videoUrl?: string; // Added videoUrl
  agent?: {
    name: string;
    rating: number;
    reviews: number;
    imageUrl?: string;
  };
  is3DTourAvailable: boolean;
  tours: Tour[]; // Changed from singular matterportUrl to array of Tours
  type: 'rent' | 'sale';
  propertyType?: string; // Added propertyType (apartment, house, office, etc.)
  matterportUrl?: string; // Kept for backward compatibility if needed, but prefer tours[]
  instagramUrl?: string; // Instagram URL for renter contact
  owner?: {
    uid?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    telegram?: string;
    firstName?: string;
    lastName?: string;
  };
}
