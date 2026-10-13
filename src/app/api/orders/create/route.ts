import { NextResponse } from 'next/server';
import supabaseServer from '../../../../../lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, roomNumber, guestName, notes, tableToken } = body ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required.' }, { status: 400 });
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
    let userId: string | null = null;
    if (authHeader) {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (!match) return NextResponse.json({ success: false, error: 'Invalid authorization header.' }, { status: 401 });
      const { data: authData, error: authError } = await supabaseServer.auth.getUser(match[1]);
      if (authError || !authData.user) {
        return NextResponse.json({ success: false, error: 'Your session has expired. Please sign in again.' }, { status: 401 });
      }
      userId = authData.user.id;
    }

    const { data: kitchen, error: kitchenError } = await supabaseServer
      .from('departments').select('id,name').ilike('name', '%kitchen%').limit(1).maybeSingle();
    if (kitchenError) {
      console.error('Unable to resolve kitchen department:', kitchenError.message);
      return NextResponse.json({ success: false, error: 'Ordering is temporarily unavailable.' }, { status: 503 });
    }
    let department = kitchen;
    if (!department) {
      const restaurant = await supabaseServer
        .from('departments').select('id,name').ilike('name', '%restaurant%').limit(1).maybeSingle();
      if (restaurant.error) {
        console.error('Unable to resolve restaurant department:', restaurant.error.message);
        return NextResponse.json({ success: false, error: 'Ordering is temporarily unavailable.' }, { status: 503 });
      }
      department = restaurant.data;
    }
    if (!department) return NextResponse.json({ success: false, error: 'Restaurant ordering is not configured.' }, { status: 503 });

    const cleanTableToken = typeof tableToken === 'string' ? tableToken.trim() : '';
    const { data: orderId, error: rpcError } = await supabaseServer.rpc('create_guest_order', {
      p_user_id: userId,
      p_department_id: department.id,
      p_room_number: cleanTableToken ? null : (typeof roomNumber === 'string' ? roomNumber.trim() || null : null),
      p_guest_name: typeof guestName === 'string' ? guestName.trim() || 'Guest' : 'Guest',
      p_notes: typeof notes === 'string' ? notes.trim() || null : null,
      p_items: normalizedItems,
      p_table_token: cleanTableToken || null,
    });

    if (rpcError) {
      console.error('Guest order creation failed:', rpcError.message);
      return NextResponse.json({
        success: false,
        error: cleanTableToken
          ? 'We could not place this table order. Please reload the menu and try again.'
          : 'We could not place your order right now. Please try again.',
      }, { status: 400 });
    }
    if (typeof orderId !== 'string' || !orderId) {
      return NextResponse.json({ success: false, error: 'No order confirmation was returned.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, orderId }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit the order.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
