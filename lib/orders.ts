import { supabase } from '@/lib/supabaseClient';

export interface OrderItemInput {
  id?: string;
  menu_item_id?: string;
  name?: string;
  quantity: number;
  price?: number;
}

export interface CreateOrderInput {
  guest_name?: string;
  room_number?: string;
  items: OrderItemInput[];
  total_amount?: number;
  service_type?: string;
  special_instructions?: string;
  status?: string;
  notes?: string;
}

function normalizeItems(items: OrderItemInput[]) {
  return items
    .filter((item) => item && Number.isInteger(item.quantity) && item.quantity > 0)
    .map((item) => ({
      menu_item_id: item.menu_item_id ?? item.id ?? '',
      quantity: Number(item.quantity),
    }));
}

export async function createOrder(orderData: CreateOrderInput) {
  const items = normalizeItems(orderData.items ?? []);
  if (!items.length) return { success: false, error: 'At least one order item is required.' };

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id ?? null;

  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest_name: orderData.guest_name,
      room_number: orderData.room_number,
      notes: orderData.special_instructions ?? orderData.notes ?? null,
      user_id: userId,
      items,
    }),
  });

  let payload: { success?: boolean; data?: unknown; error?: string } = {};
  try {
    payload = await response.json();
  } catch {
    payload = { success: false, error: 'The order server returned an invalid response.' };
  }

  if (!response.ok || !payload.success) {
    return { success: false, error: payload.error ?? 'Unable to submit the order.' };
  }

  return { success: true, data: payload.data };
}

export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'preparing' | 'completed' | 'cancelled',
) {
  const statusName = status.charAt(0).toUpperCase() + status.slice(1);

  try {
    const { data: statusRow, error: statusError } = await supabase
      .from('order_statuses')
      .select('id,name')
      .eq('name', statusName)
      .maybeSingle();

    if (statusError) return { success: false, error: statusError.message || 'Unable to resolve order status.' };
    if (!statusRow) return { success: false, error: `Order status "${statusName}" is not configured.` };

    const { data, error } = await supabase
      .from('orders')
      .update({ status_id: statusRow.id })
      .eq('id', orderId)
      .select('*, status:order_statuses(id,name)')
      .single();

    if (error) return { success: false, error: error.message || 'Unable to update order status.' };

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update order status.';
    return { success: false, error: message };
  }
}
