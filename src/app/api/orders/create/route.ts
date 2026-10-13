import { NextResponse } from 'next/server';
import supabaseServer from '../../../../../lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, departmentId, roomNumber, guestName, notes, tableToken } = body ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required.' }, { status: 400 });
    }

    const department = Number(departmentId);
    if (!Number.isInteger(department) || department <= 0) {
      return NextResponse.json({ error: 'A valid department is required.' }, { status: 400 });
    }

    const normalizedItems = items.map((item: any) => ({
      menu_item_id: typeof item?.menuItemId === 'string' ? item.menuItemId : String(item?.menu_item_id ?? ''),
      quantity: Number(item?.quantity),
    }));

    if (normalizedItems.some((item) => !item.menu_item_id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50)) {
      return NextResponse.json({ error: 'One or more order items are invalid.' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization') || '';
    let userId: string | null = null;
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      const { data: authData } = await supabaseServer.auth.getUser(match[1]);
      userId = authData?.user?.id ?? null;
    }

    let orderId: string | null = null;
    let rpcError: any = null;

    if (tableToken && typeof tableToken === 'string') {
      const res = await supabaseServer.rpc('create_guest_order', {
        p_user_id: userId,
        p_department_id: department,
        p_room_number: typeof roomNumber === 'string' ? roomNumber : null,
        p_guest_name: typeof guestName === 'string' ? guestName : null,
        p_notes: typeof notes === 'string' ? notes : null,
        p_items: normalizedItems,
        p_table_token: tableToken.trim(),
      });
      orderId = res.data;
      rpcError = res.error;
    }

    if (!orderId && (!tableToken || rpcError)) {
      const fallbackRes = await supabaseServer.rpc('create_guest_order', {
        p_user_id: userId,
        p_department_id: department,
        p_room_number: typeof roomNumber === 'string' ? roomNumber : null,
        p_guest_name: typeof guestName === 'string' ? guestName : null,
        p_notes: typeof notes === 'string' ? notes : null,
        p_items: normalizedItems,
      });
      orderId = fallbackRes.data;
      rpcError = fallbackRes.error;
    }

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message || 'Unable to submit the order.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit the order.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
