import { NextResponse } from 'next/server';
import supabaseServer from '../../../../../lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, departmentId, roomNumber, guestName, notes } = body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items required' }, { status: 400 });
    }
    if (!departmentId) return NextResponse.json({ error: 'departmentId required' }, { status: 400 });

    // Get Pending status id
    const { data: statusData } = await supabaseServer.from('order_statuses').select('id').eq('name', 'Pending').limit(1).single();
    const statusId = statusData?.id ?? null;

    // Compute total and prepare order items
    let total = 0;
    const preparedItems = [] as any[];
    for (const it of items) {
      const { menuItemId, quantity } = it;
      // fetch price
      const { data: mi } = await supabaseServer.from('menu_items').select('price').eq('id', menuItemId).limit(1).single();
      const price = mi?.price ?? 0;
      const qty = quantity || 1;
      total += Number(price) * qty;
      preparedItems.push({ menu_item_id: menuItemId, quantity: qty, price });
    }

    // Insert order
    const { data: orderData, error: orderErr } = await supabaseServer
      .from('orders')
      .insert({ user_id: null, department_id: departmentId, status_id: statusId, total, notes: notes ?? null, room_number: roomNumber })
      .select()
      .single();
    if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

    const orderId = orderData.id;
    // Insert order items
    for (const pi of preparedItems) {
      await supabaseServer.from('order_items').insert({ order_id: orderId, menu_item_id: pi.menu_item_id, quantity: pi.quantity, price: pi.price });
    }

    return NextResponse.json({ success: true, orderId });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
