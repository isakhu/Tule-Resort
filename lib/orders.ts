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

async function getStatusId(status: string) {
  const { data } = await supabase
    .from('order_statuses')
    .select('id, name')
    .ilike('name', status)
    .maybeSingle();

  return data?.id ?? null;
}

export async function createOrder(orderData: CreateOrderInput) {
  const safeItems = normalizeItems(orderData.items ?? []);
  if (!safeItems.length) return { success: false, error: 'Please add at least one menu item.' };

  const total = Number(orderData.total_amount ?? safeItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const notes = orderData.special_instructions ?? orderData.notes ?? null;
  const roomNumber = orderData.room_number?.trim() || null;
  const statusName = orderData.status ?? 'pending';

  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id ?? null;
    const statusId = await getStatusId(statusName);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        department_id: null,
        status_id: statusId,
        total,
        notes,
        room_number: roomNumber,
      })
      .select()
      .single();

    if (orderError || !order) {
      return { success: false, error: orderError?.message ?? 'Unable to create the order.' };
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      safeItems.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price: item.price,
      })),
    );

    if (itemsError) {
      await supabase.from('orders').delete().eq('id', order.id);
      return { success: false, error: itemsError.message };
    }

    return { success: true, data: order };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unable to submit the order.' };
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'preparing' | 'completed' | 'cancelled',
) {
  try {
    const statusId = await getStatusId(status);
    const { data, error } = await supabase
      .from('orders')
      .update({ status_id: statusId })
      .eq('id', orderId)
      .select()
      .single();

    if (error) return { success: false, error: error.message || 'Unable to update order status.' };
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unable to update order status.' };
  }
}
