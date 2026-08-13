import { supabase } from '@/lib/supabaseClient';

export interface ServiceOffering {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  features: string[];
  imageUrl: string;
}

type ServiceOfferingRow = {
  id?: string | number | null;
  slug?: string | null;
  service_slug?: string | null;
  service_id?: string | number | null;
  name?: string | null;
  description?: string | null;
  short_description?: string | null;
  price?: number | string | null;
  duration?: string | null;
  features?: unknown;
  image_url?: string | null;
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80';

const FALLBACK_SERVICE_OFFERINGS: Record<string, ServiceOffering[]> = {
  spa: [
    { id: 'spa-ritual', name: 'Signature Spa Ritual', description: 'A restorative treatment combining massage, body care and calming aromatherapy.', price: 1800, duration: '60 min', features: ['Massage', 'Aromatherapy', 'Body care'], imageUrl: FALLBACK_IMAGE },
    { id: 'spa-facial', name: 'Glow Facial', description: 'A skin-reviving facial designed to refresh and hydrate tired skin.', price: 1500, duration: '45 min', features: ['Hydration', 'Skin renewal', 'Relaxation'], imageUrl: FALLBACK_IMAGE },
  ],
  'pool-passes': [
    { id: 'pool-day-pass', name: 'Day Pool Pass', description: 'Access to the pool and poolside relaxation spaces for the day.', price: 900, duration: 'Full day', features: ['Pool access', 'Shower', 'Sun loungers'], imageUrl: FALLBACK_IMAGE },
    { id: 'pool-family', name: 'Family Pool Access', description: 'Shared access for family bonding and leisure by the pool.', price: 1500, duration: 'Full day', features: ['Family access', 'Poolside seating', 'Leisure'], imageUrl: FALLBACK_IMAGE },
  ],
  'gym-membership': [
    { id: 'gym-single', name: 'Gym Single Entry', description: 'A single visit to the fitness center and available training areas.', price: 450, duration: '1 session', features: ['Gym access', 'Showers', 'Fitness equipment'], imageUrl: FALLBACK_IMAGE },
    { id: 'gym-monthly', name: 'Gym Monthly Membership', description: 'Flexible monthly access for guests focused on health and wellbeing.', price: 3200, duration: '30 days', features: ['Unlimited access', 'Fitness centre', 'Wellness'], imageUrl: FALLBACK_IMAGE },
  ],
};

function normalizeFeatures(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((feature): feature is string => typeof feature === 'string');
}

export async function getServiceOfferingsByServiceSlug(serviceSlug: string): Promise<ServiceOffering[]> {
  try {
    const { data, error } = await supabase
      .from('service_offerings')
      .select('*')
      .eq('is_active', true)
      .or(`service_slug.eq.${serviceSlug},service_id.eq.${serviceSlug}`);

    if (error || !data || data.length === 0) {
      return FALLBACK_SERVICE_OFFERINGS[serviceSlug] ?? [];
    }

    const mapped = (data as ServiceOfferingRow[]).map((row) => ({
      id: String(row.id ?? row.slug ?? row.name ?? `${serviceSlug}-offering`),
      name: row.name ?? 'Service offering',
      description: row.description ?? row.short_description ?? 'Explore this offering.',
      price: Number(row.price ?? 0),
      duration: row.duration ?? 'Flexible',
      features: normalizeFeatures(row.features),
      imageUrl: row.image_url ?? FALLBACK_IMAGE,
    }));

    return mapped.length > 0 ? mapped : FALLBACK_SERVICE_OFFERINGS[serviceSlug] ?? [];
  } catch (error) {
    console.warn(`Falling back to static service offerings for ${serviceSlug}.`, error);
    return FALLBACK_SERVICE_OFFERINGS[serviceSlug] ?? [];
  }
}
