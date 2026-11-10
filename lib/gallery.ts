import { supabase } from '@/lib/supabaseClient';

export interface GalleryItem {
  id: string;
  title: string;
  caption: string | null;
  category: string;
  image_url: string;
  is_featured: boolean;
  display_order: number;
}

export const FALLBACK_GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'gal-00',
    title: 'Tule Resort Iconic 3D Island Banner',
    caption: 'Artistic 3D emblem embodying Lake Hawassa nature, acacia groves, serene waters, and warm Ethiopian hospitality.',
    category: 'Lakeside',
    image_url: '/tule-resort-main-banner.jpg',
    is_featured: true,
    display_order: 0,
  },
  {
    id: 'gal-01',
    title: 'Lake Hawassa Shoreline at Dawn',
    caption: 'Serene sunrise over the tranquil waters of Lake Hawassa from Tule Resort pier.',
    category: 'Lakeside',
    image_url: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=85',
    is_featured: true,
    display_order: 1,
  },
  {
    id: 'gal-02',
    title: 'Deluxe One-Bedroom Suite',
    caption: 'Refined comfort and private lake-facing balcony in our premier suite.',
    category: 'Suites',
    image_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=85',
    is_featured: true,
    display_order: 2,
  },
  {
    id: 'gal-03',
    title: 'Tule Aqua Poolside Leisure',
    caption: 'Sun loungers, heated pool, and lush acacia gardens for midday relaxation.',
    category: 'Leisure',
    image_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85',
    is_featured: true,
    display_order: 3,
  },
  {
    id: 'gal-04',
    title: 'Lakeside Fine Dining Terrace',
    caption: 'Exceptional Ethiopian culinary heritage and fresh Hawassa catch served under the open sky.',
    category: 'Dining',
    image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=85',
    is_featured: true,
    display_order: 4,
  },
  {
    id: 'gal-05',
    title: 'Traditional Sidama Coffee Ceremony',
    caption: 'Handcrafted roasting, aromatic frankincense, and warm Ethiopian hospitality.',
    category: 'Dining',
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=85',
    is_featured: false,
    display_order: 5,
  },
  {
    id: 'gal-06',
    title: 'Executive Lakefront Villa',
    caption: 'Architectural beauty with panoramic floor-to-ceiling glass and private sundeck.',
    category: 'Suites',
    image_url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=85',
    is_featured: false,
    display_order: 6,
  },
  {
    id: 'gal-07',
    title: 'Restorative Spa & Aromatherapy',
    caption: 'Holistic wellness treatments and therapeutic massages surrounded by nature.',
    category: 'Leisure',
    image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=85',
    is_featured: false,
    display_order: 7,
  },
  {
    id: 'gal-08',
    title: 'Private Boardwalk Pier at Sunset',
    caption: 'Golden hour reflections across Lake Hawassa as evening settles in.',
    category: 'Lakeside',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85',
    is_featured: true,
    display_order: 8,
  },
];

export async function getGalleryItems(): Promise<GalleryItem[]> {
  try {
    const { data, error } = await supabase
      .from('gallery')
      .select('id,title,caption,category,image_url,is_featured,display_order')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as GalleryItem[];
    }
    return FALLBACK_GALLERY_ITEMS;
  } catch {
    return FALLBACK_GALLERY_ITEMS;
  }
}

