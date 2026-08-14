import { supabase } from '@/lib/supabaseClient';
import {
  FALLBACK_RESORT_SERVICES,
  type ResortService,
  type ResortServiceType,
} from '@/data/resort-services';

type SupabaseResortServiceRow = {
  slug?: string | null;
  name?: string | null;
  category?: string | null;
  description?: string | null;
  short_description?: string | null;
  image_url?: string | null;
  accent_color?: string | null;
  service_type?: string | null;
  is_active?: boolean | null;
  display_order?: number | null;
  features?: unknown;
  metadata?: unknown;
};

type ServiceMetadata = {
  source_url?: string | null;
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80';

function normalizeServiceType(value: string | null | undefined): ResortServiceType {
  if (value === 'orderable' || value === 'bookable' || value === 'request' || value === 'informational') return value;
  return 'informational';
}

function normalizeFeatures(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((feature): feature is string => typeof feature === 'string') : [];
}

function normalizeSourceUrl(value: unknown): string {
  if (value && typeof value === 'object') {
    const metadata = value as ServiceMetadata;
    if (typeof metadata.source_url === 'string' && metadata.source_url.trim()) return metadata.source_url;
  }
  return '';
}

export async function getResortServices(): Promise<ResortService[]> {
  const { data, error } = await supabase
    .from('resort_services')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error || !data || data.length === 0) return FALLBACK_RESORT_SERVICES;

  const mapped = (data as SupabaseResortServiceRow[]).map((row) => {
    const metadata = row.metadata && typeof row.metadata === 'object' ? (row.metadata as ServiceMetadata) : {};
    return {
      id: String(row.slug ?? ''),
      name: row.name ?? 'Service',
      eyebrow: String(row.category ?? 'GENERAL').toUpperCase(),
      description: row.short_description ?? row.description ?? 'Explore this service.',
      type: normalizeServiceType(row.service_type),
      imageUrl: row.image_url ?? FALLBACK_IMAGE,
      sourceUrl: normalizeSourceUrl(metadata),
      accent: row.accent_color ?? '#C9A227',
      features: normalizeFeatures(row.features),
    } satisfies ResortService;
  });

  return mapped.length > 0 ? mapped : FALLBACK_RESORT_SERVICES;
}

export async function getResortService(serviceId: string): Promise<ResortService | undefined> {
  const services = await getResortServices();
  return services.find((service) => service.id === serviceId);
}
