export interface Room {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string;
  price: number;
  capacity: number;
  maxOccupancy: number;
  imageUrl: string;
  images: string[];
  amenities: string[];
  isAvailable: boolean;
}

const ROOM_IMAGES = {
  standard: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=85',
  deluxe: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=85',
  executive: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=85',
  family: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=85',
  suite: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=85',
};

export const FALLBACK_ROOMS: Room[] = [
  {
    id: 'tule-standard',
    slug: 'tule-standard-room',
    name: 'Tule Standard Room',
    type: 'Standard',
    description: 'A comfortable and welcoming room designed for relaxed stays at Tule Resort, with a clean modern atmosphere and essential amenities.',
    price: 3500,
    capacity: 2,
    maxOccupancy: 2,
    imageUrl: ROOM_IMAGES.standard,
    images: [ROOM_IMAGES.standard],
    amenities: ['Wi-Fi', 'Air conditioning', 'Private bathroom', 'TV', 'Room service'],
    isAvailable: true,
  },
  {
    id: 'tule-deluxe',
    slug: 'tule-deluxe-room',
    name: 'Tule Deluxe Room',
    type: 'Deluxe',
    description: 'A more spacious stay combining comfort, modern design, and a relaxed lakeside resort atmosphere.',
    price: 5000,
    capacity: 2,
    maxOccupancy: 2,
    imageUrl: ROOM_IMAGES.deluxe,
    images: [ROOM_IMAGES.deluxe],
    amenities: ['Wi-Fi', 'Air conditioning', 'Private bathroom', 'TV', 'Mini fridge', 'Room service', 'Balcony'],
    isAvailable: true,
  },
  {
    id: 'tule-executive',
    slug: 'tule-executive-room',
    name: 'Tule Executive Room',
    type: 'Executive',
    description: 'An upgraded room designed for guests who want additional space and a more refined resort experience.',
    price: 7000,
    capacity: 2,
    maxOccupancy: 2,
    imageUrl: ROOM_IMAGES.executive,
    images: [ROOM_IMAGES.executive],
    amenities: ['Wi-Fi', 'Air conditioning', 'Private bathroom', 'Smart TV', 'Mini fridge', 'Work desk', 'Room service', 'Balcony'],
    isAvailable: true,
  },
  {
    id: 'tule-family',
    slug: 'tule-family-room',
    name: 'Tule Family Room',
    type: 'Family',
    description: 'A spacious option designed for families and small groups looking for a comfortable stay together.',
    price: 8500,
    capacity: 4,
    maxOccupancy: 4,
    imageUrl: ROOM_IMAGES.family,
    images: [ROOM_IMAGES.family],
    amenities: ['Wi-Fi', 'Air conditioning', 'Private bathroom', 'TV', 'Mini fridge', 'Extra beds', 'Room service', 'Family seating area'],
    isAvailable: true,
  },
  {
    id: 'tule-lake-view-suite',
    slug: 'tule-lake-view-suite',
    name: 'Tule Lake View Suite',
    type: 'Lake View Suite',
    description: 'A premium suite designed around a relaxed lakeside experience, with generous space and an elegant resort atmosphere.',
    price: 12000,
    capacity: 4,
    maxOccupancy: 4,
    imageUrl: ROOM_IMAGES.suite,
    images: [ROOM_IMAGES.suite],
    amenities: ['Wi-Fi', 'Air conditioning', 'Luxury bathroom', 'Smart TV', 'Mini fridge', 'Living area', 'Room service', 'Private balcony', 'Lake view'],
    isAvailable: true,
  },
];
