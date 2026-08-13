import { supabase } from '@/lib/supabaseClient';

export interface EventVenue {
  id: string;
  slug: string;
  name: string;
  capacity: number;
  dimensions: string;
  pricing: string;
  features: string[];
  imageUrl: string;
}

type EventVenueRow = {
  id?: string | number | null;
  slug?: string | null;
  name?: string | null;
  capacity?: number | string | null;
  dimensions?: string | null;
  pricing?: string | number | null;
  features?: unknown;
  image_url?: string | null;
  is_active?: boolean | null;
  display_order?: number | null;
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=85';

const FALLBACK_EVENT_VENUES: EventVenue[] = [
  {
    id: 'conference-room',
    slug: 'conference-room',
    name: 'Conference Room',
    capacity: 30,
    dimensions: '12m × 9m',
    pricing: 'From ETB 8,500 / day',
    features: ['AV equipment', 'Presentation screen', 'Meeting tables'],
    imageUrl: FALLBACK_IMAGE,
  },
  {
    id: 'multi-purpose-halls',
    slug: 'multi-purpose-halls',
    name: 'Multi-Purpose Hall',
    capacity: 200,
    dimensions: '22m × 16m',
    pricing: 'From ETB 18,000 / day',
    features: ['Large event setup', 'Stage lighting', 'Flexible layout'],
    imageUrl: FALLBACK_IMAGE,
  },
];

function normalizeNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeFeatures(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((feature): feature is string => typeof feature === 'string');
}

export async function getEventVenues(): Promise<EventVenue[]> {
  try {
    const { data, error } = await supabase
      .from('event_venues')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('Falling back to static event venues because the Supabase query failed or returned no rows.', error?.message ?? 'No event venues found.');
      return FALLBACK_EVENT_VENUES;
    }

    const mapped = (data as EventVenueRow[]).map((row) => ({
      id: String(row.id ?? row.slug ?? 'venue'),
      slug: row.slug ?? String(row.id ?? 'venue'),
      name: row.name ?? 'Event venue',
      capacity: normalizeNumber(row.capacity),
      dimensions: row.dimensions ?? 'Flexible layout',
      pricing: typeof row.pricing === 'number' || typeof row.pricing === 'string' ? String(row.pricing) : 'Flexible pricing',
      features: normalizeFeatures(row.features),
      imageUrl: row.image_url ?? FALLBACK_IMAGE,
    }));

    return mapped.length > 0 ? mapped : FALLBACK_EVENT_VENUES;
  } catch (error) {
    console.warn('Falling back to static event venues because the Supabase event venues lookup threw an exception.', error);
    return FALLBACK_EVENT_VENUES;
  }
}

export async function getEventVenueBySlug(slug: string): Promise<EventVenue | undefined> {
  const venues = await getEventVenues();
  return venues.find((venue) => venue.slug === slug || venue.id === slug);
}
