import { NextResponse } from 'next/server';
import supabaseServer from '../../../../lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabaseServer
    .from('menu_items')
    .select('id,name,amharic_name,category,price,image_url,description,is_active,is_available')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Unable to load active menu items:', error.message);
    return NextResponse.json(
      { success: false, error: 'The current menu is temporarily unavailable.' },
      { status: 503 },
    );
  }

  const items = (data ?? [])
    .filter((item) => item.is_available !== false)
    .map((item) => ({
      id: String(item.id),
      name: item.name ?? 'Untitled item',
      amharicName: item.amharic_name ?? '',
      category: item.category ?? 'General',
      price: Number(item.price ?? 0),
      imageUrl: item.image_url ?? '',
      description: item.description ?? '',
      isAvailable: item.is_available ?? item.is_active ?? true,
      dietaryTags: [],
    }));

  return NextResponse.json({ success: true, items }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
