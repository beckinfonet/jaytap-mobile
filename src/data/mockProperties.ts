export interface Tour {
  id: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
}

export interface Property {
  id: string;
  title: string;
  price: number;
  currency: string;
  period?: string; // e.g., 'month' for rent
  address: string;
  description: string;
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
  tours: Tour[]; // Changed from singular matterportUrl to array of Tours
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
    description: 'Beautiful modern apartment located in the heart of Bishkek. Recently renovated with high-end finishes, this apartment offers stunning city views and easy access to local amenities. Features include a spacious living room, modern kitchen with built-in appliances, and a private balcony.',
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
    tours: [
      {
        id: 't1',
        title: 'Full Apartment Walkthrough',
        url: 'https://my.matterport.com/show/?m=6GNETgQLzxV',
        thumbnailUrl: 'https://my.matterport.com/api/v1/player/models/6GNETgQLzxV/thumb'
      },
      {
        id: 't2',
        title: 'Living Room Detail',
        url: 'https://my.matterport.com/show/?m=6GNETgQLzxV&start={"rotation":{"x":0,"y":180}}', // Just mimicking a different view
        thumbnailUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=400&auto=format&fit=crop'
      }
    ],
    type: 'rent',
  },
  {
    id: '2',
    title: 'Luxury Villa with Mountain View',
    price: 250000,
    currency: '$',
    address: 'Kok-Jar, Bishkek',
    description: 'Exquisite luxury villa situated in the prestigious Kok-Jar area. This property boasts breathtaking mountain views, a large private swimming pool, and a landscaped garden. The interior features spacious rooms, a home theater, and a state-of-the-art security system.',
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
    tours: [
      {
        id: 't3',
        title: 'Virtual Tour',
        url: 'https://my.matterport.com/show/?m=placeholder2',
        thumbnailUrl: 'https://images.unsplash.com/photo-1600596542815-e328700240eb?q=80&w=400&auto=format&fit=crop'
      }
    ],
    type: 'sale',
  },
  {
    id: '3',
    title: 'Cozy Studio near Philharmonia',
    price: 400,
    currency: '$',
    period: 'month',
    address: 'Manas Avenue, Bishkek',
    description: 'Charming studio apartment perfect for students or young professionals. Located just steps away from the Philharmonia, this cozy space comes fully furnished and includes high-speed internet. Enjoy the convenience of city living with shops and cafes right at your doorstep.',
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
    tours: [],
    type: 'rent',
  },
  {
    id: '4',
    title: 'Spacious Family House',
    price: 180000,
    currency: '$',
    address: 'Orto-Sai Village',
    description: 'A wonderful family home in the quiet and safe Orto-Sai Village. This house offers plenty of space for a growing family, with 5 bedrooms and a large backyard. Features include a cozy fireplace, a double garage, and proximity to top-rated schools.',
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
    tours: [
      {
        id: 't4',
        title: 'Main House Tour',
        url: 'https://my.matterport.com/show/?m=placeholder3',
        thumbnailUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=400&auto=format&fit=crop'
      }
    ],
    type: 'sale',
  },
];
