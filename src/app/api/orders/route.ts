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

    // Bind an order to a user only after Supabase validates the bearer token.
    // Never accept a client-supplied user_id with a service-role database client.
    let userId: string | null = null;
    const authMatch = (request.headers.get('authorization') || '').match(/^Bearer\\s+(.+)$/i);
    if (authMatch) {
      const { data: authData } = await supabase.auth.getUser(authMatch[1]);
      userId = authData?.user?.id ?? null;
    }
    const { data: department, error: departmentError } = await supabase
      .from('departments')
      .select('id,name')
      .ilike('name', '%kitchen%')
      .limit(1)
      .maybeSingle();

    if (departmentError) return NextResponse.json({ success: false, error: departmentError.message }, { status: 500 });
    if (!department) return NextResponse.json({ success: false, error: 'Kitchen department is not configured.' }, { status: 500 });

    const tableToken = body.table_token || body.tableToken;
    let data: any = null;
    let rpcError: any = null;

    if (tableToken) {
      const res = await supabase.rpc('create_guest_order', {
        p_user_id: userId,
        p_department_id: department.id,
        p_room_number: body.room_number?.trim() || null,
        p_guest_name: body.guest_name?.trim() || 'Guest',
        p_notes: body.notes?.trim() || null,
        p_items: normalizedItems,
        p_table_token: tableToken.trim(),
      });
      data = res.data;
      rpcError = res.error;
    }

    // Never retry a table-bound order without its token: that would bypass table validation.
    if (!data && !tableToken) {
      const fallbackRes = await supabase.rpc('create_guest_order', {
        p_user_id: userId,
        p_department_id: department.id,
        p_room_number: body.room_number?.trim() || null,
        p_guest_name: body.guest_name?.trim() || 'Guest',
        p_notes: body.notes?.trim() || null,
        p_items: normalizedItems,
      });
      data = fallbackRes.data;
      rpcError = fallbackRes.error;
    }

    if (rpcError) return NextResponse.json({ success: false, error: rpcError.message || 'Unable to submit the order.' }, { status: 400 });
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit the order.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
