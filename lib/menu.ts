import { supabase } from './supabaseClient';
import { menuItems as fallbackMenuItems, type MenuItem } from '@/data/menu-items';

type SupabaseMenuRow = {
  id?: string | number | null;
  name?: string | null;
  amharic_name?: string | null;
  amharicName?: string | null;
  category?: string | null;
  price?: number | string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  description?: string | null;
};

export async function getMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase.from('menu_items').select('*').order('id', { ascending: true });

  if (error) {
    console.error('Failed to load menu items from Supabase:', error.message);
    return fallbackMenuItems;
  }

  if (!data || data.length === 0) {
    return fallbackMenuItems;
  }

  return data.map((row: SupabaseMenuRow) => ({
    id: String(row.id ?? ''),
    name: row.name ?? 'Untitled item',
    amharicName: row.amharic_name ?? row.amharicName ?? '',
    category: row.category ?? 'General',
    price: Number(row.price ?? 0),
    imageUrl: row.image_url ?? row.imageUrl ?? fallbackMenuItems[0]?.imageUrl ?? '',
    description: row.description ?? '',
  }));
}
