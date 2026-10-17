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



export interface TableSession {
  id: string;
  table_id: string;
  session_token: string;
  status: 'active' | 'closed';
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_stay_id?: string | null;
  party_size?: number;
  opened_at: string;
  closed_at?: string | null;
}

export async function getDiningTables(): Promise<DiningTable[]> {
  const { data, error } = await supabase
    .from('dining_tables')
    .select('*')
    .eq('is_active', true)
    .order('table_number', { ascending: true });

  if (error) {
    console.error('Error fetching dining tables:', error.message);
    throw new Error(`Unable to load dining tables: ${error.message}`);
  }

  return (data ?? []) as DiningTable[];
}

export async function getDiningTableByToken(token: string): Promise<DiningTable | null> {
  const clean = token.trim();
  const { data, error } = await supabase
    .from('dining_tables')
    .select('*')
    .or(`qr_token.eq.${clean},id.eq.${clean}`)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching table by token:', error.message);
    throw new Error(`Unable to query dining table: ${error.message}`);
  }

  return (data as DiningTable) ?? null;
}

export async function updateTableStatus(
  tableId: string,
  status: DiningTable['status']
): Promise<boolean> {
  const { error } = await supabase
    .from('dining_tables')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', tableId);

  if (error) {
    console.error('Failed to update table status:', error.message);
    return false;
  }
  return true;
}

