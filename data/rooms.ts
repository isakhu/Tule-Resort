export interface Room {
  id: string;
  slug: string;
  name: string;
  type: string;
  category: string;
  description: string;
  price: number;
  capacity: number;
  maxOccupancy: number;
  imageUrl: string;
  images: string[];
  amenities: string[];
}

export const FALLBACK_ROOMS: Room[] = [
  {
    id: 'twin',
    slug: 'twin',
    name: 'Twin Room',
    type: 'Twin',
    category: 'Accommodation',
    description: 'Comfortable twin accommodation with a garden-view profile and resort amenities.',
    price: 220,
    capacity: 2,
    maxOccupancy: 2,
    imageUrl: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85',
    images: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85'],
    amenities: ['Wi-Fi', 'Private balcony', 'Swimming pool', '24hr room service'],
  },
  {
    id: 'suite',
    slug: 'suite',
    name: 'Suite Room',
    type: 'Suite',
    category: 'Accommodation',
    description: 'A more spacious stay for guests looking for extra comfort and a premium room experience.',
    price: 340,
    capacity: 3,
    maxOccupancy: 3,
    imageUrl: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85',
    images: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85'],
    amenities: ['Wi-Fi', 'Room service', 'Private balcony', 'Modern amenities'],
  },
  {
    id: 'family',
    slug: 'family',
    name: 'Family Room',
    type: 'Family',
    category: 'Accommodation',
    description: 'A family-focused option designed for guests travelling together.',
    price: 420,
    capacity: 4,
    maxOccupancy: 4,
    imageUrl: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85',
    images: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85'],
    amenities: ['Family friendly', 'Wi-Fi', 'Swimming pool', 'Children playground'],
  },
  {
    id: 'presidential',
    slug: 'presidential',
    name: 'Presidential Suite',
    type: 'Presidential',
    category: 'Accommodation',
    description: 'A premium suite category for an elevated Haile stay experience.',
    price: 620,
    capacity: 4,
    maxOccupancy: 4,
    imageUrl: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85',
    images: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85'],
    amenities: ['Premium stay', 'Wi-Fi', 'Room service', 'Resort amenities'],
  },
];
