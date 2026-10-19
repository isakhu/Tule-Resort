import { supabase } from '@/lib/supabaseClient';

export interface OrderItemInput {
  id?: string;
  menu_item_id?: string;
  name?: string;
  quantity: number;
  notes?: string;
}

export interface CreateOrderInput {
  guest_name?: string;
  room_number?: string;
  table_token?: string;
  items: OrderItemInput[];
  service_type?: string;
  special_instructions?: string;
  status?: string;
  notes?: string;
  idempotency_key: string;
}

function normalizeItems(items: OrderItemInput[]) {
  return items
    .filter((item) => item && Number.isInteger(item.quantity) && item.quantity > 0)
    .map((item) => ({
      menu_item_id: item.menu_item_id ?? item.id ?? '',
      quantity: Number(item.quantity),
      notes: item.notes,
    }));
}

export async function createOrder(orderData: CreateOrderInput) {
  const items = normalizeItems(orderData.items ?? []);
  if (!items.length) return { success: false, error: 'At least one order item is required.' };

  if (!orderData.idempotency_key || !orderData.idempotency_key.trim()) {
    return { success: false, error: 'An idempotency key is required to submit an order.' };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id ?? null;

  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest_name: orderData.guest_name,
      room_number: orderData.room_number,
      table_token: orderData.table_token,
      notes: orderData.special_instructions ?? orderData.notes ?? null,
      user_id: userId,
      items,
      idempotency_key: orderData.idempotency_key.trim(),
    }),
  });

  let payload: { success?: boolean; data?: unknown; orderId?: string; totalAmount?: number; isDuplicate?: boolean; error?: string } = {};
  try {
    payload = await response.json();
  } catch {
    payload = { success: false, error: 'The order server returned an invalid response.' };
  }

  if (!response.ok || !payload.success) {
    return { success: false, error: payload.error ?? 'Unable to submit the order.' };
  }

  return {
    success: true,
    data: payload.data ?? payload.orderId,
    orderId: payload.orderId,
    totalAmount: payload.totalAmount,
    isDuplicate: payload.isDuplicate,
  };
}

export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'accepted' | 'preparing' | 'in progress' | 'ready' | 'delivered' | 'completed' | 'cancelled' | string,
  notes?: string,
  expectedStatusId?: number
) {
  const cleanStatus = status.toLowerCase().trim();

  // Map to status_id:
  // 1: Pending, 2: Confirmed, 3: Preparing, 4: Ready, 5: Delivered, 6: Completed, 7: Accepted, 8: In Progress, 9: Cancelled
  const STATUS_ID_MAP: Record<string, number> = {
    pending: 1,
    confirmed: 2,
    preparing: 3,
    ready: 4,
    delivered: 5,
    completed: 6,
    accepted: 7,
    'in progress': 8,
    'in_progress': 8,
    cancelled: 9,
  };

  let targetStatusId = STATUS_ID_MAP[cleanStatus];

  if (!targetStatusId) {
    // Resolve dynamically from database
    const { data: statusRow } = await supabase
      .from('order_statuses')
      .select('id')
      .ilike('name', cleanStatus)
      .maybeSingle();

    if (statusRow) {
      targetStatusId = statusRow.id;
    } else {
      return { success: false, error: `Order status "${status}" is not configured.` };
    }
  }

  try {
    const { data, error } = await supabase.rpc('update_entity_status', {
      p_entity_type: 'order',
      p_entity_id: orderId,
      p_to_status_id: targetStatusId,
      p_notes: notes ?? `Status updated to ${status}`,
      p_expected_status_id: expectedStatusId ?? null,
    });

    if (error) {
      // Do not bypass the state machine or RLS by updating the table directly.
      // Throw or return the exact RPC error (e.g., STATE_CONFLICT or invalid transition).
      const isConflict = Boolean(error.message && error.message.includes('STATE_CONFLICT'));
      return {
        success: false,
        error: error.message || `Failed to update status to ${status}.`,
        isConflict,
      };
    }

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update order status.';
    return { success: false, error: message };
  }
}
