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
    .filter((item) => item && typeof item.quantity === 'number' && item.quantity > 0)
    .map((item) => ({
      id: item.id ?? item.menu_item_id ?? `item-${Math.random().toString(36).slice(2, 9)}`,
      menu_item_id: item.menu_item_id ?? item.id ?? null,
      name: item.name ?? 'Menu item',
      quantity: Number(item.quantity) || 1,
      price: Number(item.price ?? 0),
    }));
}

export async function createOrder(orderData: CreateOrderInput) {
  const safeItems = normalizeItems(orderData.items ?? []);
  const totalAmount = Number(orderData.total_amount ?? safeItems.reduce((sum, item) => sum + Number(item.price ?? 0) * Number(item.quantity ?? 1), 0));
  const guestName = orderData.guest_name?.trim() || 'Guest';
  const roomNumber = orderData.room_number?.trim() || null;
  const specialInstructions = orderData.special_instructions ?? orderData.notes ?? null;

  // Guest creation is handled by the server-side order API. Keep this helper
  // limited to the legacy client callers that still use it.
  const { data: pendingStatus } = await supabase
    .from('order_statuses')
    .select('id')
    .eq('name', 'Pending')
    .maybeSingle();

  const payload = {
    user_id: null,
    department_id: null,
    status_id: pendingStatus?.id ?? null,
    total: totalAmount,
    notes: specialInstructions,
    room_number: roomNumber,
  };

  const { data, error } = await supabase.from('orders').insert(payload).select().single();
  if (error) return { success: false, error: error.message || 'Unable to submit the order.' };

  for (const item of safeItems) {
    const { error: itemError } = await supabase.from('order_items').insert({
      order_id: data.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      price: Number(item.price ?? 0),
    });
    if (itemError) return { success: false, error: itemError.message || 'Unable to save an order item.' };
  }

  return { success: true, data };
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
      .eq('name', statusName === 'Pending' ? 'Pending' : statusName)
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
