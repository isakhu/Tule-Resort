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
  user_id?: string | null;
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

    // 1. Fetch ordered menu items to resolve department_id and verify availability
    const itemIds = Array.from(new Set(normalizedItems.map((item) => item.menu_item_id)));
    const { data: menuItems, error: menuItemsError } = await supabase
      .from('menu_items')
      .select('id, name, department_id, is_active, price')
      .in('id', itemIds);

    if (menuItemsError) {
      return NextResponse.json({ success: false, error: menuItemsError.message }, { status: 500 });
    }

    if (!menuItems || menuItems.length === 0) {
      return NextResponse.json({ success: false, error: 'None of the ordered items were found in the menu.' }, { status: 400 });
    }

    const itemMap = new Map(menuItems.map((m) => [m.id, m]));
    for (const item of normalizedItems) {
      const found = itemMap.get(item.menu_item_id);
      if (!found) {
        return NextResponse.json({ success: false, error: `Menu item "${item.menu_item_id}" does not exist.` }, { status: 400 });
      }
      if (found.is_active === false) {
        return NextResponse.json({ success: false, error: `"${found.name}" is currently unavailable.` }, { status: 400 });
      }
    }

    // 2. Route by department_id: derived from the menu items
    let resolvedDepartmentId: number | null = null;
    const itemWithDept = menuItems.find((m) => m.department_id != null && Number.isInteger(m.department_id));
    if (itemWithDept) {
      resolvedDepartmentId = itemWithDept.department_id;
    }

    // If menu items did not specify a department_id, find active Kitchen or Restaurant department
    if (!resolvedDepartmentId) {
      const { data: fallbackDept } = await supabase
        .from('departments')
        .select('id, name')
        .or('name.ilike.%kitchen%,name.ilike.%restaurant%,name.ilike.%cafeteria%')
        .eq('is_active', true)
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fallbackDept) {
        resolvedDepartmentId = fallbackDept.id;
      }
    }

    if (!resolvedDepartmentId) {
      return NextResponse.json({ success: false, error: 'No active dining department configured for this order.' }, { status: 500 });
    }

    const tableToken = body.table_token || body.tableToken;

    // 3. Create the order via verified RPC
    const { data, error: rpcError } = await supabase.rpc('create_guest_order', {
      p_user_id: body.user_id ?? null,
      p_department_id: resolvedDepartmentId,
      p_room_number: body.room_number?.trim() || null,
      p_guest_name: body.guest_name?.trim() || 'Guest',
      p_notes: body.notes?.trim() || null,
      p_items: normalizedItems,
      p_table_token: tableToken ? tableToken.trim() : null,
    });

    if (rpcError) {
      return NextResponse.json({ success: false, error: rpcError.message || 'Unable to submit the order.' }, { status: 400 });
    }
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit the order.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
