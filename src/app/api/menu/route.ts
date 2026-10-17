import { NextResponse } from 'next/server';
import { getMenuItems } from '@/lib/menu';

export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await getMenuItems();

  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
