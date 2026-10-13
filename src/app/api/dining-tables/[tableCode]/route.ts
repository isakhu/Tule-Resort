import { NextResponse } from 'next/server';
import supabaseServer from '../../../../../lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ tableCode: string }> },
) {
  const { tableCode } = await context.params;
  const token = typeof tableCode === 'string' ? tableCode.trim() : '';

  // Tokens are high-entropy public table links, not an authentication mechanism.
  if (token.length < 32 || token.length > 128) {
    return NextResponse.json({ table: null }, { status: 404 });
  }

  const { data, error } = await supabaseServer
    .from('dining_tables')
    .select('id,table_number,qr_token,section,capacity,status,is_active,pos_x,pos_y')
    .eq('qr_token', token)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Dining table token lookup failed:', error.message);
    return NextResponse.json({ error: 'Table details are temporarily unavailable.' }, { status: 503 });
  }
  if (!data) return NextResponse.json({ table: null }, { status: 404 });

  return NextResponse.json({ table: data }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
