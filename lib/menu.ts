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
};

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
    const result = await supabase
      .from('menu_items')
      .select('id,name,amharic_name,description,category,price,image_url')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

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
      isAvailable: true,
      dietaryTags: [],
    }));

    return mapped.length > 0 ? mapped : mapFallbackMenuItems();
  } catch (error) {
    console.warn('Falling back to offline menu data because the Supabase menu lookup failed.', error);
    return mapFallbackMenuItems();
  }
}
