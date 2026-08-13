import { supabase } from '@/lib/supabaseClient';
import { FALLBACK_ROOMS, type Room } from '@/data/rooms';

type SupabaseRoomRow = {
  id?: string | number | null;
  slug?: string | null;
  name?: string | null;
  type?: string | null;
  category?: string | null;
  description?: string | null;
  short_description?: string | null;
  price_per_night?: number | string | null;
  base_price?: number | string | null;
  capacity?: number | string | null;
  max_occupancy?: number | string | null;
  image_url?: string | null;
  images?: string[] | null;
  amenities?: string[] | null;
  is_active?: boolean | null;
  is_available?: boolean | null;
  display_order?: number | null;
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85';

function normalizeNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeImage(value: string | null | undefined, images: string[] | null | undefined): string {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (Array.isArray(images) && images.length > 0 && typeof images[0] === 'string' && images[0].trim()) {
    return images[0];
  }

  return FALLBACK_IMAGE;
}

export async function getRooms(): Promise<Room[]> {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('Falling back to offline room data because Supabase rooms query failed or returned no rows.', error?.message ?? 'No room rows found.');
      return FALLBACK_ROOMS;
    }

    const mapped = (data as SupabaseRoomRow[]).map((row) => ({
      id: String(row.id ?? row.slug ?? ''),
      slug: row.slug ?? String(row.id ?? ''),
      name: row.name ?? 'Room',
      type: row.type ?? 'Accommodation',
      category: row.category ?? 'Accommodation',
      description: row.short_description ?? row.description ?? 'Comfortable rooms and suites designed for restful stays.',
      price: normalizeNumber(row.price_per_night ?? row.base_price ?? 0),
      capacity: normalizeNumber(row.capacity ?? row.max_occupancy ?? 0),
      maxOccupancy: normalizeNumber(row.max_occupancy ?? row.capacity ?? 0),
      imageUrl: normalizeImage(row.image_url ?? null, row.images ?? null),
      images: Array.isArray(row.images) && row.images.length > 0 ? row.images.filter((image): image is string => typeof image === 'string') : [normalizeImage(row.image_url ?? null, row.images ?? null)],
      amenities: Array.isArray(row.amenities) ? row.amenities.filter((amenity): amenity is string => typeof amenity === 'string') : [],
    }));

    return mapped.length > 0 ? mapped : FALLBACK_ROOMS;
  } catch (error) {
    console.warn('Falling back to offline room data because the Supabase rooms lookup threw an exception.', error);
    return FALLBACK_ROOMS;
  }
}

export async function getRoomBySlug(slug: string): Promise<Room | undefined> {
  const rooms = await getRooms();
  return rooms.find((room) => room.slug === slug || room.id === slug);
}
