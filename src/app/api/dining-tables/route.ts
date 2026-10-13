import { NextResponse } from 'next/server';
import supabaseServer from '../../../../lib/supabaseServer';
import { requireStaffOrAdmin } from '../../../../lib/staffAuth';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES = new Set(['available', 'occupied', 'cleaning', 'out_of_service']);

export async function GET(request: Request) {
  const auth = await requireStaffOrAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status ?? 401 });
  }

  const { data, error } = await supabaseServer
    .from('dining_tables')
    .select('id,table_number,qr_token,section,capacity,status,is_active,pos_x,pos_y,created_at,updated_at')
    .eq('is_active', true)
    .order('section', { ascending: true })
    .order('table_number', { ascending: true });

  if (error) {
    console.error('Unable to load dining tables:', error.message);
    return NextResponse.json({ error: 'Unable to load dining tables right now.' }, { status: 503 });
  }

  return NextResponse.json({ tables: data ?? [] }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireStaffOrAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status ?? 401 });
  }

  try {
    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const status = typeof body?.status === 'string' ? body.status : '';

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ success: false, error: 'A valid dining table is required.' }, { status: 400 });
    }
    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ success: false, error: 'Invalid dining table status.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('dining_tables')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('is_active', true)
      .select('id,table_number,qr_token,section,capacity,status,is_active,pos_x,pos_y,updated_at')
      .maybeSingle();

    if (error) {
      console.error('Unable to update dining table status:', error.message);
      return NextResponse.json({ success: false, error: 'Unable to update this table right now.' }, { status: 503 });
    }
    if (!data) {
      return NextResponse.json({ success: false, error: 'Table was not found or is inactive.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, table: data });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }
}
