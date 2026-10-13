import { supabase } from '@/lib/supabaseClient';

export interface DiningTable {
  id: string;
  table_number: string;
  qr_token: string;
  section: 'Floor 1' | 'Lake Terrace' | 'Poolside' | 'VIP Lounge';
  capacity: number;
  status: 'available' | 'occupied' | 'cleaning' | 'out_of_service';
  is_active: boolean;
  pos_x: number;
  pos_y: number;
  active_order_id?: string | null;
  active_waiter?: string | null;
  guest_count?: number;
  occupied_since?: string | null;
}

export const DEFAULT_DINING_TABLES: DiningTable[] = [
  // Floor 1 (Main Hall)
  { id: 'dt-01', table_number: 'Table 01', qr_token: 'tule-tbl-01-lakeview', section: 'Floor 1', capacity: 2, status: 'available', is_active: true, pos_x: 18, pos_y: 20 },
  { id: 'dt-02', table_number: 'Table 02', qr_token: 'tule-tbl-02-lakeview', section: 'Floor 1', capacity: 4, status: 'occupied', is_active: true, pos_x: 36, pos_y: 20, active_waiter: 'Omar Ahmed', guest_count: 4, occupied_since: '12:15 PM' },
  { id: 'dt-03', table_number: 'Table 03', qr_token: 'tule-tbl-03-lakeview', section: 'Floor 1', capacity: 4, status: 'occupied', is_active: true, pos_x: 54, pos_y: 20, active_waiter: 'Sara Kidane', guest_count: 3, occupied_since: '12:30 PM' },
  { id: 'dt-04', table_number: 'Table 04', qr_token: 'tule-tbl-04-lakeview', section: 'Floor 1', capacity: 4, status: 'available', is_active: true, pos_x: 72, pos_y: 20 },
  { id: 'dt-05', table_number: 'Table 05', qr_token: 'tule-tbl-05-lakeview', section: 'Floor 1', capacity: 6, status: 'available', is_active: true, pos_x: 88, pos_y: 35 },
  { id: 'dt-06', table_number: 'Table 06', qr_token: 'tule-tbl-06-lakeview', section: 'Floor 1', capacity: 2, status: 'occupied', is_active: true, pos_x: 18, pos_y: 45, active_waiter: 'Abebe Bekele', guest_count: 2, occupied_since: '12:45 PM' },
  { id: 'dt-07', table_number: 'Table 07', qr_token: 'tule-tbl-07-lakeview', section: 'Floor 1', capacity: 4, status: 'occupied', is_active: true, pos_x: 36, pos_y: 45, active_waiter: 'Omar Ahmed', guest_count: 4, occupied_since: '12:15 PM' },
  { id: 'dt-08', table_number: 'Table 08', qr_token: 'tule-tbl-08-lakeview', section: 'Floor 1', capacity: 4, status: 'available', is_active: true, pos_x: 54, pos_y: 45 },
  { id: 'dt-09', table_number: 'Table 09', qr_token: 'tule-tbl-09-lakeview', section: 'Floor 1', capacity: 4, status: 'available', is_active: true, pos_x: 72, pos_y: 45 },
  { id: 'dt-10', table_number: 'Table 10', qr_token: 'tule-tbl-10-lakeview', section: 'Floor 1', capacity: 6, status: 'occupied', is_active: true, pos_x: 88, pos_y: 60, active_waiter: 'Sara Kidane', guest_count: 5, occupied_since: '11:55 AM' },
  { id: 'dt-11', table_number: 'Table 11', qr_token: 'tule-tbl-11-lakeview', section: 'Floor 1', capacity: 2, status: 'available', is_active: true, pos_x: 18, pos_y: 72 },
  { id: 'dt-12', table_number: 'Table 12', qr_token: 'tule-tbl-12-lakeview', section: 'Floor 1', capacity: 4, status: 'occupied', is_active: true, pos_x: 36, pos_y: 72, active_waiter: 'Abebe Bekele', guest_count: 2, occupied_since: '12:33 PM' },
  { id: 'dt-13', table_number: 'Table 13', qr_token: 'tule-tbl-13-lakeview', section: 'Floor 1', capacity: 4, status: 'available', is_active: true, pos_x: 54, pos_y: 72 },
  { id: 'dt-14', table_number: 'Table 14', qr_token: 'tule-tbl-14-lakeview', section: 'Floor 1', capacity: 4, status: 'cleaning', is_active: true, pos_x: 72, pos_y: 72 },
  { id: 'dt-15', table_number: 'Table 15', qr_token: 'tule-tbl-15-lakeview', section: 'Floor 1', capacity: 8, status: 'occupied', is_active: true, pos_x: 50, pos_y: 90, active_waiter: 'Omar Ahmed', guest_count: 6, occupied_since: '11:47 AM' },

  // Lake Terrace
  { id: 'dt-t01', table_number: 'Terrace 01', qr_token: 'tule-tbl-t01-sunset', section: 'Lake Terrace', capacity: 4, status: 'available', is_active: true, pos_x: 20, pos_y: 25 },
  { id: 'dt-t02', table_number: 'Terrace 02', qr_token: 'tule-tbl-t02-sunset', section: 'Lake Terrace', capacity: 4, status: 'occupied', is_active: true, pos_x: 40, pos_y: 25, active_waiter: 'Sara Kidane', guest_count: 4, occupied_since: '12:20 PM' },
  { id: 'dt-t03', table_number: 'Terrace 03', qr_token: 'tule-tbl-t03-sunset', section: 'Lake Terrace', capacity: 2, status: 'occupied', is_active: true, pos_x: 60, pos_y: 25, active_waiter: 'Abebe Bekele', guest_count: 2, occupied_since: '12:07 PM' },
  { id: 'dt-t04', table_number: 'Terrace 04', qr_token: 'tule-tbl-t04-sunset', section: 'Lake Terrace', capacity: 6, status: 'available', is_active: true, pos_x: 80, pos_y: 25 },
  { id: 'dt-t05', table_number: 'Terrace 05', qr_token: 'tule-tbl-t05-sunset', section: 'Lake Terrace', capacity: 4, status: 'available', is_active: true, pos_x: 30, pos_y: 65 },
  { id: 'dt-t06', table_number: 'Terrace 06', qr_token: 'tule-tbl-t06-sunset', section: 'Lake Terrace', capacity: 4, status: 'cleaning', is_active: true, pos_x: 70, pos_y: 65 },

  // Poolside
  { id: 'dt-p01', table_number: 'Pool 01', qr_token: 'tule-tbl-p01-breeze', section: 'Poolside', capacity: 2, status: 'available', is_active: true, pos_x: 25, pos_y: 40 },
  { id: 'dt-p02', table_number: 'Pool 02', qr_token: 'tule-tbl-p02-breeze', section: 'Poolside', capacity: 4, status: 'occupied', is_active: true, pos_x: 50, pos_y: 40, active_waiter: 'Omar Ahmed', guest_count: 3, occupied_since: '12:13 PM' },
  { id: 'dt-p03', table_number: 'Pool 03', qr_token: 'tule-tbl-p03-breeze', section: 'Poolside', capacity: 4, status: 'available', is_active: true, pos_x: 75, pos_y: 40 },
];

async function getStaffAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function getDiningTables(): Promise<DiningTable[]> {
  try {
    const token = await getStaffAccessToken();
    if (!token) return [];

    const response = await fetch('/api/dining-tables', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) return [];

    const payload = await response.json();
    return Array.isArray(payload.tables) ? payload.tables as DiningTable[] : [];
  } catch {
    // Never display demo tables as if they were the resort's live data.
    return [];
  }
}

export async function getDiningTableByToken(token: string): Promise<DiningTable | null> {
  const clean = token.trim();
  if (clean.length < 32 || clean.length > 128) return null;

  try {
    const response = await fetch(`/api/dining-tables/${encodeURIComponent(clean)}`, {
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload.table ? payload.table as DiningTable : null;
  } catch {
    return null;
  }
}

export async function updateTableStatus(
  tableId: string,
  status: DiningTable['status']
): Promise<boolean> {
  try {
    const token = await getStaffAccessToken();
    if (!token) return false;

    const response = await fetch('/api/dining-tables', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: tableId, status }),
    });
    const payload = await response.json().catch(() => ({}));
    return response.ok && payload.success === true;
  } catch {
    return false;
  }
}
