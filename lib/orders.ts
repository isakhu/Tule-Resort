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
  const serviceType = orderData.service_type ?? 'room_service';
  const status = orderData.status ?? 'pending';

  const preferredPayload = {
    guest_name: guestName,
    room_number: roomNumber,
    items: safeItems,
    total_amount: totalAmount,
    service_type: serviceType,
    special_instructions: specialInstructions,
    status,
    notes: specialInstructions,
    created_at: new Date().toISOString(),
  };

  const legacyPayload = {
    guest_name: guestName,
    room_number: roomNumber,
    items: safeItems,
    total: totalAmount,
    department_id: null,
    status_id: null,
    notes: specialInstructions,
    status,
    service_type: serviceType,
    special_instructions: specialInstructions,
  };

  const payloadAttempts: Record<string, unknown>[] = [preferredPayload as Record<string, unknown>, legacyPayload as Record<string, unknown>];

  for (const payload of payloadAttempts) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert(payload as any)
        .select()
        .single();

      if (!error) {
        return { success: true, data };
      }

      const isMissingColumn = typeof error?.message === 'string' && /column .* does not exist|does not exist/i.test(error.message);
      if (!isMissingColumn) {
        return { success: false, error: error.message || 'Unable to submit the order.' };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit the order.';
      const isMissingColumn = /column .* does not exist|does not exist/i.test(message);
      if (!isMissingColumn) {
        return { success: false, error: message };
      }
    }
  }

  return {
    success: false,
    error: 'Unable to submit the order. The orders table is not available in the current Supabase schema.',
  };
}
