export type ResortServiceType = 'orderable' | 'bookable' | 'request' | 'informational';

export interface ResortService {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  type: ResortServiceType;
  imageUrl: string;
  sourceUrl: string;
  accent: string;
  features: string[];
}

// Offline fallback service names and positioning are mapped from the official Haile Hotels & Resorts website.
// Image URLs below are safe visual placeholders; replace them with licensed official assets
// uploaded to Supabase Storage before production if the official images are not licensed for hotlinking.
export const FALLBACK_RESORT_SERVICES: ResortService[] = [
  {
    id: 'restaurant',
    name: 'Restaurant & Bar',
    eyebrow: 'DINING',
    description: 'Signature Ethiopian flavors, fresh dishes and refreshing drinks in the Haile way.',
    type: 'orderable',
    imageUrl: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=85',
    sourceUrl: 'https://hailehotelsandresorts.com/',
    accent: '#F2B84B',
    features: ['Breakfast', 'Main course', 'Beverages', 'Ethiopian cuisine'],
  },
  {
    id: 'rooms',
    name: 'Accommodation',
    eyebrow: 'STAY',
    description: 'Comfortable rooms and suites designed for restful stays, with modern amenities and Ethiopian hospitality.',
    type: 'bookable',
    imageUrl: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85',
    sourceUrl: 'https://hailehotelsandresorts.com/rooms/twin-room/',
    accent: '#D99A3D',
    features: ['Twin Room', 'Suites', 'Family rooms', 'Private balcony'],
  },
  {
    id: 'spa',
    name: 'Spa, Beauty & Health',
    eyebrow: 'WELLNESS',
    description: 'Relax, restore and recharge with wellness experiences designed around your stay.',
    type: 'bookable',
    imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=85',
    sourceUrl: 'https://hailehotelsandresorts.com/',
    accent: '#C9828E',
    features: ['Spa treatments', 'Beauty care', 'Wellness', 'Relaxation'],
  },
  {
    id: 'pool-passes',
    name: 'Swimming Pool',
    eyebrow: 'LEISURE',
    description: 'Enjoy a refreshing pool experience for relaxation, recreation and quality time with family.',
    type: 'request',
    imageUrl: 'https://images.unsplash.com/photo-1572331165267-854da2b10ccc?auto=format&fit=crop&w=1200&q=85',
    sourceUrl: 'https://hailehotelsandresorts.com/',
    accent: '#5FA7C9',
    features: ['Pool access', 'Family leisure', 'Poolside relaxation'],
  },
  {
    id: 'gym-membership',
    name: 'Health & Fitness',
    eyebrow: 'FITNESS',
    description: 'Stay active with fitness facilities and wellness-focused activities during your visit.',
    type: 'request',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=85',
    sourceUrl: 'https://hailehotelsandresorts.com/',
    accent: '#7DBA62',
    features: ['Gymnasium', 'Fitness', 'Training', 'Wellness'],
  },
  {
    id: 'conference-room',
    name: 'Conference Rooms',
    eyebrow: 'BUSINESS',
    description: 'Professional meeting spaces for business gatherings, conferences and organized events.',
    type: 'bookable',
    imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=85',
    sourceUrl: 'https://hailehotelsandresorts.com/',
    accent: '#8D9CC8',
    features: ['Meetings', 'Conferences', 'Business events'],
  },
  {
    id: 'multi-purpose-halls',
    name: 'Multi-purpose Halls',
    eyebrow: 'EVENTS',
    description: 'Flexible venues for celebrations, weddings, corporate events and large gatherings.',
    type: 'bookable',
    imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=85',
    sourceUrl: 'https://hailehotelsandresorts.com/',
    accent: '#E56B4D',
    features: ['Weddings', 'Celebrations', 'Corporate events', 'Large gatherings'],
  },
  {
    id: 'experiences',
    name: 'Experiences',
    eyebrow: 'DISCOVER',
    description: 'Create memorable moments through family vacations, romantic getaways, wellness, culture and nature.',
    type: 'informational',
    imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=85',
    sourceUrl: 'https://hailehotelsandresorts.com/',
    accent: '#86A96B',
    features: ['Family vacation', 'Romantic getaway', 'Cultural discovery', 'Nature escape'],
  },
];

