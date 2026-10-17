import { NextResponse } from 'next/server';
import supabaseServer from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, departmentId, roomNumber, guestName, notes, tableToken, sessionToken, guestStayId } = body ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required.' }, { status: 400 });
    }

    const normalizedItems = items.map((item: any) => ({
      menu_item_id: typeof item?.menuItemId === 'string' ? item.menuItemId.trim() : String(item?.menu_item_id ?? '').trim(),
      quantity: Number(item?.quantity),
    }));

    if (normalizedItems.some((item) => !item.menu_item_id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50)) {
      return NextResponse.json({ error: 'One or more order items are invalid.' }, { status: 400 });
    }

    let department = Number(departmentId);
    if (!Number.isInteger(department) || department <= 0) {
      const itemIds = Array.from(new Set(normalizedItems.map((i) => i.menu_item_id)));
      const { data: menuRows } = await supabaseServer
        .from('menu_items')
        .select('id, department_id')
        .in('id', itemIds);

      const foundDept = menuRows?.find((m) => m.department_id != null)?.department_id;
      if (foundDept) {
        department = foundDept;
      } else {
        const { data: fallbackDept } = await supabaseServer
          .from('departments')
          .select('id')
          .or('name.ilike.%kitchen%,name.ilike.%restaurant%,name.ilike.%cafeteria%')
          .eq('is_active', true)
          .order('id', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (fallbackDept) department = fallbackDept.id;
      }
    }

    if (!Number.isInteger(department) || department <= 0) {
      return NextResponse.json({ error: 'A valid department is required.' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization') || '';
    let userId: string | null = null;
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      const { data: authData } = await supabaseServer.auth.getUser(match[1]);
      userId = authData?.user?.id ?? null;
    }

    // Check for guest stay cookie if not explicitly passed
    let effectiveStayId = guestStayId ?? null;
    if (!effectiveStayId) {
      const cookieHeader = req.headers.get('cookie') || '';
      const stayMatch = cookieHeader.match(/tule_guest_stay=([^;]+)/);
      if (stayMatch) {
        try {
          const parsedStay = JSON.parse(decodeURIComponent(stayMatch[1]));
          effectiveStayId = parsedStay?.id ?? null;
        } catch {
          // ignore
        }
      }
    }

    const { data: orderId, error: rpcError } = await supabaseServer.rpc('create_guest_order', {
      p_user_id: userId,
      p_department_id: department,
      p_room_number: typeof roomNumber === 'string' ? roomNumber : null,
      p_guest_name: typeof guestName === 'string' ? guestName : null,
      p_notes: typeof notes === 'string' ? notes : null,
      p_items: normalizedItems,
      p_table_token: tableToken && typeof tableToken === 'string' ? tableToken.trim() : null,
      p_session_token: sessionToken && typeof sessionToken === 'string' ? sessionToken.trim() : null,
      p_guest_stay_id: effectiveStayId,
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message || 'Unable to submit the order.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit the order.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
