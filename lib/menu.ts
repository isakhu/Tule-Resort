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
  departmentId?: number | null;
  departmentName?: string | null;
}

export interface LiveMenuLookupResult {
  items: MenuItem[];
  error: string | null;
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
  department_id?: number | null;
  department?: { id?: number | null; name?: string | null } | Array<{ id?: number | null; name?: string | null }> | null;
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
    departmentId: null,
    departmentName: null,
  }));
}

function mapSupabaseMenuRow(row: SupabaseMenuRow): MenuItem {
  const joinedDepartment = Array.isArray(row.department) ? row.department[0] : row.department;
  return {
    id: String(row.id ?? ''),
    name: row.name ?? 'Untitled item',
    amharicName: row.amharic_name ?? '',
    category: row.category ?? 'General',
    price: Number(row.price ?? 0),
    imageUrl: row.image_url ?? '',
    description: row.description ?? '',
    isAvailable: row.is_available ?? row.is_active ?? true,
    dietaryTags: normalizeDietaryTags(row.dietary_tags ?? row.dietary ?? []),
    departmentId: row.department_id ?? joinedDepartment?.id ?? null,
    departmentName: joinedDepartment?.name ?? null,
  };
}

/**
 * Fetches live active menu items strictly from Supabase without falling back to
 * static mock IDs when the database query fails.
 */
export async function getLiveMenuItems(): Promise<LiveMenuLookupResult> {
  try {
    let result = await supabase
      .from('menu_items')
      .select('*, department:departments(id, name)')
      .eq('is_active', true)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (result.error) {
      // Retry without optional display_order or department join for schema compatibility
      result = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });
    }

    if (result.error) {
      return {
        items: [],
        error: result.error.message || 'Unable to load menu items from database.',
      };
    }

    const mapped = ((result.data ?? []) as SupabaseMenuRow[])
      .map(mapSupabaseMenuRow)
      .filter((item) => item.id.length > 0 && item.isAvailable !== false);

    return { items: mapped, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reach menu database.';
    return { items: [], error: message };
  }
}

const CAFETERIA_CATEGORIES = new Set([
  'breakfast',
  'beverages',
  'coffee',
  'drinks',
  'desserts',
  'desserts & sweets',
  'dessert',
  'sides',
  'sides & appetizers',
  'starters',
  'appetizers',
  'fast food & bowls',
  'burgers',
  'burgers & sandwiches',
  'pizza',
  'pasta',
  'pizza & pasta',
]);

export function filterMenuItemsForService(items: MenuItem[], serviceName?: string): MenuItem[] {
  const activeItems = items.filter((item) => item.isAvailable !== false);
  const normalizedService = (serviceName ?? '').trim().toLowerCase();
  if (!normalizedService) return activeItems;

  if (normalizedService.includes('cafeteria')) {
    const dedicated = activeItems.filter((item) =>
      (item.departmentName ?? '').trim().toLowerCase().includes('cafeteria'),
    );
    if (dedicated.length > 0) {
      return dedicated;
    }

    const cafeteriaSuitable = activeItems.filter((item) =>
      CAFETERIA_CATEGORIES.has((item.category ?? '').trim().toLowerCase()),
    );
    if (cafeteriaSuitable.length > 0) {
      return cafeteriaSuitable;
    }
  }

  return activeItems;
}

export async function getMenuItems(): Promise<MenuItem[]> {
  try {
    const { items, error } = await getLiveMenuItems();
    if (error || items.length === 0) {
      return mapFallbackMenuItems();
    }
    return items;
  } catch (error) {
    console.warn('Falling back to offline menu data because the Supabase menu lookup failed.', error);
    return mapFallbackMenuItems();
  }
}
