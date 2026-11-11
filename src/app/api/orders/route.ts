import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVerifiedGuestStay } from '@/lib/guestStayCookie';
import { requireStaffOrAdmin } from '@/lib/staffAuth';

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
  guest_stay_id?: string | null;
  guestStayId?: string | null;
  idempotency_key?: string;
  idempotencyKey?: string;
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
    const effectiveIdempotencyKey = (body.idempotency_key || body.idempotencyKey || '').trim() || null;

    const authHeader = request.headers.get('authorization') || '';
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    let verifiedUserId: string | null = null;
    if (bearerMatch) {
      const { data: userData, error: userErr } = await supabase.auth.getUser(bearerMatch[1].trim());
      if (userErr || !userData?.user) {
        return NextResponse.json({ success: false, error: 'Invalid authorization token.' }, { status: 401 });
      }
      verifiedUserId = userData.user.id;
    }

    const verifiedStay = await getVerifiedGuestStay();
    const requestedStayId =
      typeof body.guest_stay_id === 'string' && body.guest_stay_id.trim()
        ? body.guest_stay_id.trim()
        : typeof body.guestStayId === 'string' && body.guestStayId.trim()
          ? body.guestStayId.trim()
          : null;

    let effectiveStayId: string | null = verifiedStay?.id ?? null;

    if (effectiveStayId) {
      const { data: liveStay } = await supabase
        .from('room_reservations')
        .select('id')
        .eq('id', effectiveStayId)
        .eq('status', 'checked_in')
        .maybeSingle();

      if (!liveStay) {
        effectiveStayId = null;
      }
    }

    if (requestedStayId && requestedStayId !== effectiveStayId) {
      const staffCheck = bearerMatch ? await requireStaffOrAdmin(request) : null;
      if (staffCheck?.ok) {
        effectiveStayId = requestedStayId;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Your checked-in stay session could not be verified or has expired. Please verify your room stay again.',
          },
          { status: effectiveStayId ? 403 : 401 },
        );
      }
    }

    // 3. Create the order via verified RPC (never trust client-supplied body.user_id)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_guest_order', {
      p_user_id: verifiedUserId,
      p_department_id: resolvedDepartmentId,
      p_room_number: body.room_number?.trim() || null,
      p_guest_name: body.guest_name?.trim() || 'Guest',
      p_notes: body.notes?.trim() || null,
      p_items: normalizedItems,
      p_table_token: tableToken ? tableToken.trim() : null,
      p_session_token: null,
      p_guest_stay_id: effectiveStayId,
      p_idempotency_key: effectiveIdempotencyKey,
    });

    if (rpcError) {
      return NextResponse.json({ success: false, error: rpcError.message || 'Unable to submit the order.' }, { status: 400 });
    }

    const firstRow = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    const orderId = firstRow?.order_id || (typeof rpcResult === 'string' ? rpcResult : null);
    let totalAmount = firstRow?.total_amount != null ? Number(firstRow.total_amount) : undefined;
    const isDuplicate = Boolean(firstRow?.is_duplicate);

    if (orderId && (totalAmount == null || !Number.isFinite(totalAmount))) {
      const { data: orderRow } = await supabase
        .from('orders')
        .select('total')
        .eq('id', orderId)
        .maybeSingle();

      if (orderRow?.total != null) {
        totalAmount = Number(orderRow.total);
      }
    }

    return NextResponse.json({
      success: true,
      data: orderId,
      orderId,
      totalAmount,
      guestStayId: effectiveStayId,
      isDuplicate,
    }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit the order.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
