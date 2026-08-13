import { supabase } from './supabaseClient';

export interface MenuItem {
  id: string;
  name: string;
  amharicName: string;
  category: string;
  price: number;
  imageUrl: string;
  description: string;
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
};

export async function getMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: SupabaseMenuRow) => ({
    id: String(row.id ?? ''),
    name: row.name ?? 'Untitled item',
    amharicName: row.amharic_name ?? '',
    category: row.category ?? 'General',
    price: Number(row.price ?? 0),
    imageUrl: row.image_url ?? '',
    description: row.description ?? '',
  }));
}
