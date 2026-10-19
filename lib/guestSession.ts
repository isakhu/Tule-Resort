export interface GuestStay {
  id: string;
  booking_number: string;
  guest_name: string;
  guest_phone?: string;
  guest_email?: string;
  room_id: string;
  room_name: string;
  check_in: string;
  check_out: string;
  status: string;
}

export interface ActivityOrder {
  id: string;
  created_at: string;
  updated_at: string;
  status_id: number;
  total: number;
  notes?: string;
  room_number?: string;
  guest_name?: string;
  dining_table_id?: string;
  table_session_id?: string;
  guest_stay_id?: string;
  status?: { id: number; name: string };
  department?: { id: number; name: string };
  order_items?: Array<{
    id: string;
    quantity: number;
    price: number;
    menu_item?: {
      id: string;
      name: string;
      amharic_name?: string;
      image_url?: string;
    };
  }>;
}

export interface ActivityServiceRequest {
  id: string;
  created_at: string;
  updated_at: string;
  service_id: string;
  offering_id?: string;
  department_id: number;
  requested_date: string;
  requested_time?: string;
  party_size: number;
  guest_name: string;
  guest_phone?: string;
  room_number?: string;
  notes?: string;
  price?: number;
  status_id: number;
  status?: { id: number; name: string };
  department?: { id: number; name: string };
}

export async function fetchCurrentGuestStay(): Promise<{ authenticated: boolean; stay?: GuestStay; error?: string }> {
  try {
    const res = await fetch('/api/guest/session', { method: 'GET' });
    const json = await res.json();
    if (res.ok && json.authenticated && json.stay) {
      return { authenticated: true, stay: json.stay };
    }
    return { authenticated: false };
  } catch (err) {
    return { authenticated: false, error: 'Network error checking guest session.' };
  }
}

export async function loginGuestStay(roomNumber: string, identifier: string): Promise<{ success: boolean; stay?: GuestStay; error?: string }> {
  try {
    const res = await fetch('/api/guest/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomNumber, identifier }),
    });
    const json = await res.json();
    if (res.ok && json.success && json.stay) {
      return { success: true, stay: json.stay };
    }
    return { success: false, error: json.error || 'Failed to verify stay credentials.' };
  } catch {
    return { success: false, error: 'Network error connecting to guest portal.' };
  }
}

export async function logoutGuestStay(): Promise<boolean> {
  try {
    const res = await fetch('/api/guest/session', { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchGuestActivity(stayId?: string): Promise<{
  success: boolean;
  orders: ActivityOrder[];
  requests: ActivityServiceRequest[];
  reservation?: any;
  error?: string;
}> {
  try {
    const url = stayId ? `/api/guest/activity?stayId=${encodeURIComponent(stayId)}` : '/api/guest/activity';
    const res = await fetch(url);
    const json = await res.json();
    if (res.ok && json.success) {
      return {
        success: true,
        orders: json.orders || [],
        requests: json.requests || [],
        reservation: json.reservation || null,
      };
    }
    return { success: false, orders: [], requests: [], error: json.error };
  } catch {
    return { success: false, orders: [], requests: [], error: 'Failed to load guest activity.' };
  }
}

export async function cancelGuestItem(
  entityType: 'order' | 'service_request',
  entityId: string,
  sessionToken?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/guest/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId, sessionToken }),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      return { success: true, message: json.message };
    }
    return { success: false, error: json.error || 'Cancellation request was rejected.' };
  } catch {
    return { success: false, error: 'Network error submitting cancellation.' };
  }
}
