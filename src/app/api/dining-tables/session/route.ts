import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import supabaseServer from '@/lib/supabaseServer';

const STAY_COOKIE_NAME = 'tule_guest_stay';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tableToken, guestName, sessionToken } = body ?? {};

    if (!tableToken || typeof tableToken !== 'string' || !tableToken.trim()) {
      return NextResponse.json({ success: false, error: 'tableToken is required.' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const rawStay = cookieStore.get(STAY_COOKIE_NAME)?.value;
    let stayId: string | null = null;
    let stayGuestName: string | null = null;

    if (rawStay) {
      try {
        const parsed = JSON.parse(rawStay);
        stayId = parsed.id;
        stayGuestName = parsed.guest_name;
      } catch {
        // ignore
      }
    }

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

    // 1. Fetch table
    const { data: table, error: tableErr } = await supabaseServer
      .from('dining_tables')
      .select('id, table_number, section, capacity, status, is_active, qr_token')
      .or(`qr_token.eq.${tableToken.trim()},id.eq.${tableToken.trim()}`)
      .eq('is_active', true)
      .maybeSingle();

    if (tableErr || !table) {
      return NextResponse.json({ success: false, error: 'Dining table not found.' }, { status: 404 });
    }

    // 2. Fetch session if token provided
    let activeSession: any = null;
    let activeOrders: any[] = [];

    if (sessionToken) {
      const { data: session } = await supabaseServer
        .from('table_sessions')
        .select('*')
        .eq('table_id', table.id)
        .eq('session_token', sessionToken.trim())
        .eq('status', 'active')
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
      }
    }

    return NextResponse.json({
      success: true,
      table,
      session: activeSession,
      orders: activeOrders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error querying dining table.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
