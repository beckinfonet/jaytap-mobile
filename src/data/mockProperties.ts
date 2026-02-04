export interface Property {
  id: string;
  title: string;
  price: number;
  currency: string;
  period?: string; // e.g., 'month' for rent
  address: string;
  specs: {
    beds: number;
    baths: number;
    sqft: number;
  };
  features: string[];
  imageUrl: string;
  videoUrl?: string; // Added videoUrl
  agent: {
    name: string;
    rating: number;
    reviews: number;
    imageUrl?: string;
  };
  is3DTourAvailable: boolean;
  matterportUrl?: string;
  type: 'rent' | 'sale';
}

export const MOCK_PROPERTIES: Property[] = [
  {
    id: '1',
    title: 'Modern Apartment in Bishkek Center',
    price: 850,
    currency: '$',
    period: 'month',
    address: 'Chui Avenue, Bishkek',
    specs: {
      beds: 2,
      baths: 1,
      sqft: 65,
    },
    features: ['Wifi', 'Parking', 'Ac'],
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=800&auto=format&fit=crop',
    videoUrl: 'https://www.youtube.com/watch?v=placeholder',
    agent: {
      name: 'Aida Sultanbekova',
      rating: 4.8,
      reviews: 24,
    },
    is3DTourAvailable: true,
    matterportUrl: 'https://my.matterport.com/show/?m=placeholder',
    type: 'rent',
  },
  {
    id: '2',
    title: 'Luxury Villa with Mountain View',
    price: 250000,
    currency: '$',
    address: 'Kok-Jar, Bishkek',
    specs: {
      beds: 4,
      baths: 3,
      sqft: 250,
    },
    features: ['Pool', 'Garage', 'Garden', 'Security'],
    imageUrl: 'https://images.unsplash.com/photo-1600596542815-e328700240eb?q=80&w=800&auto=format&fit=crop',
    agent: {
      name: 'Ulanbek T.',
      rating: 4.9,
      reviews: 12,
    },
    is3DTourAvailable: true,
    matterportUrl: 'https://my.matterport.com/show/?m=placeholder2',
    type: 'sale',
  },
  {
    id: '3',
    title: 'Cozy Studio near Philharmonia',
    price: 400,
    currency: '$',
    period: 'month',
    address: 'Manas Avenue, Bishkek',
    specs: {
      beds: 1,
      baths: 1,
      sqft: 35,
    },
    features: ['Wifi', 'Furnished'],
    imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop',
    agent: {
      name: 'Elena K.',
      rating: 4.7,
      reviews: 8,
    },
    is3DTourAvailable: false,
    type: 'rent',
  },
  {
    id: '4',
    title: 'Spacious Family House',
    price: 180000,
    currency: '$',
    address: 'Orto-Sai Village',
    specs: {
      beds: 5,
      baths: 2,
      sqft: 180,
    },
    features: ['Parking', 'Garden', 'Fireplace'],
    imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=800&auto=format&fit=crop',
    videoUrl: 'https://www.youtube.com/watch?v=placeholder2',
    agent: {
      name: 'Aida Sultanbekova',
      rating: 4.8,
      reviews: 24,
    },
    is3DTourAvailable: true,
    matterportUrl: 'https://my.matterport.com/show/?m=placeholder3',
    type: 'sale',
  },
];
