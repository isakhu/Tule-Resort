import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type OrderItem = {
  menu_item_id?: string;
  quantity: number;
};

type OrderRequest = {
  guest_name?: string;
  room_number?: string;
  notes?: string;
  items?: OrderItem[];
  table_token?: string;
  tableToken?: string;
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error('Server Supabase configuration is missing.');
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OrderRequest;
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return NextResponse.json({ success: false, error: 'At least one order item is required.' }, { status: 400 });

    const normalizedItems = items.map((item) => ({
      menu_item_id: String(item.menu_item_id ?? '').trim(),
      quantity: Number(item.quantity),
    }));

    if (normalizedItems.some((item) => !item.menu_item_id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50)) {
      return NextResponse.json({ success: false, error: 'Invalid order item or quantity.' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // The client may submit an access token, but it may never choose the user_id
    // that is attached to an order. Anonymous guest ordering remains supported.
    let verifiedUserId: string | null = null;
    const authorization = request.headers.get('authorization');
    if (authorization) {
      const match = authorization.match(/^Bearer\s+(.+)$/i);
      if (!match) {
        return NextResponse.json({ success: false, error: 'Invalid authorization header.' }, { status: 401 });
      }
      const { data: authData, error: authError } = await supabase.auth.getUser(match[1]);
      if (authError || !authData.user) {
        return NextResponse.json({ success: false, error: 'Your session has expired. Please sign in again.' }, { status: 401 });
      }
      verifiedUserId = authData.user.id;
    }

    const { data: kitchen, error: kitchenError } = await supabase
      .from('departments').select('id,name').ilike('name', '%kitchen%').limit(1).maybeSingle();

    if (kitchenError) return NextResponse.json({ success: false, error: 'Unable to prepare the order right now.' }, { status: 500 });

    let department = kitchen;
    if (!department) {
      const restaurantResult = await supabase
        .from('departments').select('id,name').ilike('name', '%restaurant%').limit(1).maybeSingle();
      if (restaurantResult.error) return NextResponse.json({ success: false, error: 'Unable to prepare the order right now.' }, { status: 500 });
      department = restaurantResult.data;
    }
    if (!department) return NextResponse.json({ success: false, error: 'The restaurant ordering department is not configured.' }, { status: 503 });

    const tableToken = (body.table_token || body.tableToken || '').trim();
    let data: unknown;
    let rpcError: { message?: string } | null;

    if (tableToken) {
      // A table order must never silently fall back to an unassigned order.
      const result = await supabase.rpc('create_guest_order', {
        p_user_id: verifiedUserId,
        p_department_id: department.id,
        p_room_number: body.room_number?.trim() || null,
        p_guest_name: body.guest_name?.trim() || 'Guest',
        p_notes: body.notes?.trim() || null,
        p_items: normalizedItems,
        p_table_token: tableToken,
      });
      data = result.data;
      rpcError = result.error;
    } else {
      const result = await supabase.rpc('create_guest_order', {
        p_user_id: verifiedUserId,
        p_department_id: department.id,
        p_room_number: body.room_number?.trim() || null,
        p_guest_name: body.guest_name?.trim() || 'Guest',
        p_notes: body.notes?.trim() || null,
        p_items: normalizedItems,
      });
      data = result.data;
      rpcError = result.error;
    }

    if (rpcError) {
      console.error('Guest order creation failed:', rpcError.message);
      return NextResponse.json(
        { success: false, error: tableToken
          ? 'We could not place this table order. Please reload the menu and try again.'
          : 'We could not place your order right now. Please try again.' },
        { status: 400 },
      );
    }
    if (!data) return NextResponse.json({ success: false, error: 'No order confirmation was returned.' }, { status: 500 });
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit the order.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
