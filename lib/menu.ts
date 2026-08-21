import { supabase } from '@/lib/supabaseClient';
import { menuItems as fallbackMenuItems } from '@/data/menu-items';

export interface MenuItem {
  id: string;
  name: string;
  amharicName: string;
  category: string;
  price: number;
  imageUrl: string;
  description: string;
  isAvailable: boolean;
  dietaryTags: string[];
}

type SupabaseMenuRow = {
  id?: string | number | null;
  name?: string | null;
  amharic_name?: string | null;
  category?: string | null;
  price?: number | string | null;
  image_url?: string | null;
  description?: string | null;
  is_active?: boolean | null;
  is_available?: boolean | null;
  dietary_tags?: string[] | string | null;
  dietary?: string[] | string | null;
  display_order?: number | null;
};

function normalizeDietaryTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function mapFallbackMenuItems(): MenuItem[] {
  return fallbackMenuItems.map((item) => ({
    id: String(item.id),
    name: item.name,
    amharicName: item.amharicName,
    category: item.category,
    price: Number(item.price ?? 0),
    imageUrl: item.imageUrl,
    description: item.description,
    isAvailable: true,
    dietaryTags: [],
  }));
}

export async function getMenuItems(): Promise<MenuItem[]> {
  try {
    let result = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (result.error) {
      result = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });
    }

    if (result.error || !result.data || result.data.length === 0) {
      return mapFallbackMenuItems();
    }

    const mapped = (result.data as SupabaseMenuRow[]).map((row) => ({
      id: String(row.id ?? ''),
      name: row.name ?? 'Untitled item',
      amharicName: row.amharic_name ?? '',
      category: row.category ?? 'General',
      price: Number(row.price ?? 0),
      imageUrl: row.image_url ?? '',
      description: row.description ?? '',
      isAvailable: row.is_available ?? row.is_active ?? true,
      dietaryTags: normalizeDietaryTags(row.dietary_tags ?? row.dietary ?? []),
    }));

    return mapped.length > 0 ? mapped : mapFallbackMenuItems();
  } catch (error) {
    console.warn('Falling back to offline menu data because the Supabase menu lookup failed.', error);
    return mapFallbackMenuItems();
  }
}
