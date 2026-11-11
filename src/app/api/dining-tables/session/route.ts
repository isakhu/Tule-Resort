import { NextResponse } from 'next/server';
import supabaseServer from '@/lib/supabaseServer';
import { getVerifiedGuestStay } from '@/lib/guestStayCookie';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tableToken, guestName, sessionToken } = body ?? {};

    if (!tableToken || typeof tableToken !== 'string' || !tableToken.trim()) {
      return NextResponse.json({ success: false, error: 'tableToken is required.' }, { status: 400 });
    }

    const verifiedStay = await getVerifiedGuestStay();
    const stayId = verifiedStay?.id ?? null;
    const stayGuestName = verifiedStay?.guest_name ?? null;

    const { data, error } = await supabaseServer.rpc('get_or_create_table_session', {
      p_table_token: tableToken.trim(),
      p_guest_name: guestName?.trim() || stayGuestName || null,
      p_existing_session_token: sessionToken?.trim() || null,
      p_guest_stay_id: stayId,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data?.success) {
      return NextResponse.json({
        success: false,
        error: data?.error || 'Unable to access table session.',
        tableStatus: data?.table_status,
      }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error managing table session.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tableToken = url.searchParams.get('tableToken');
    const sessionToken = url.searchParams.get('sessionToken');

    if (!tableToken) {
      return NextResponse.json({ success: false, error: 'tableToken is required.' }, { status: 400 });
    }

    // 1. Fetch table (avoid PostgREST filter interpolation & invalid UUID errors)
    const cleanTableToken = tableToken.trim().replace(/[(),*]/g, '');
    let tableQuery = supabaseServer
      .from('dining_tables')
      .select('id, table_number, section, capacity, status, is_active, qr_token')
      .eq('is_active', true);

    tableQuery = UUID_REGEX.test(cleanTableToken)
      ? tableQuery.or(`qr_token.eq.${cleanTableToken},id.eq.${cleanTableToken}`)
      : tableQuery.eq('qr_token', cleanTableToken);

    const { data: table, error: tableErr } = await tableQuery.maybeSingle();

    if (tableErr || !table) {
      return NextResponse.json({ success: false, error: 'Dining table not found.' }, { status: 404 });
    }

    // 1b. Close expired active table sessions (> 6h) cleanly and free stale occupied tables
    const ttlCutoffIso = new Date(Date.now() - SESSION_TTL_MS).toISOString();
    let sessionExpired = false;

    await supabaseServer
      .from('table_sessions')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('table_id', table.id)
      .eq('status', 'active')
      .lt('opened_at', ttlCutoffIso);

    if (table.status === 'occupied') {
      const { data: unexpiredSessions } = await supabaseServer
        .from('table_sessions')
        .select('id')
        .eq('table_id', table.id)
        .eq('status', 'active')
        .gte('opened_at', ttlCutoffIso)
        .limit(1);

      if (!unexpiredSessions || unexpiredSessions.length === 0) {
        await supabaseServer
          .from('dining_tables')
          .update({ status: 'available', updated_at: new Date().toISOString() })
          .eq('id', table.id)
          .eq('status', 'occupied');

        table.status = 'available';
        sessionExpired = Boolean(sessionToken);
      }
    }

    // 2. Fetch active unexpired session if token provided
    let activeSession: Record<string, unknown> | null = null;
    let activeOrders: Array<Record<string, unknown>> = [];

    if (sessionToken && sessionToken.trim()) {
      const { data: session } = await supabaseServer
        .from('table_sessions')
        .select('*')
        .eq('table_id', table.id)
        .eq('session_token', sessionToken.trim())
        .eq('status', 'active')
        .gte('opened_at', ttlCutoffIso)
        .maybeSingle();

      if (session) {
        activeSession = session;

        // Fetch orders for this session
        const { data: orders } = await supabaseServer
          .from('orders')
          .select(`
            id,
            created_at,
            status_id,
            total,
            notes,
            status:order_statuses(id, name),
            order_items(
              id,
              quantity,
              price,
              menu_item:menu_items(id, name, amharic_name, image_url)
            )
          `)
          .eq('table_session_id', session.id)
          .order('created_at', { ascending: false });

        activeOrders = orders ?? [];
      } else {
        sessionExpired = true;
      }
    }

    return NextResponse.json({
      success: true,
      table,
      session: activeSession,
      orders: activeOrders,
      sessionExpired,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error querying dining table.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
