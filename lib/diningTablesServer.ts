import supabaseServer from '@/lib/supabaseServer';

export interface PublicDiningTable {
  id: string;
  table_number: string;
  qr_token: string;
  section: string;
  capacity: number;
  status: string;
}

export async function getActiveDiningTablesServer(): Promise<PublicDiningTable[]> {
  try {
    const { data, error } = await supabaseServer
      .from('dining_tables')
      .select('id, table_number, qr_token, section, capacity, status')
      .eq('is_active', true)
      .order('table_number', { ascending: true });

    if (error || !data) {
      return [];
    }

    return (data as PublicDiningTable[]).filter(
      (table) => typeof table.qr_token === 'string' && table.qr_token.trim().length > 0
    );
  } catch {
    return [];
  }
}

export async function getDefaultTableQrToken(): Promise<string | null> {
  const tables = await getActiveDiningTablesServer();
  if (tables.length === 0) return null;

  const preferred =
    tables.find((table) => table.status === 'available' && /table\s*0*1\b/i.test(table.table_number)) ||
    tables.find((table) => table.status === 'available') ||
    tables[0];

  return preferred?.qr_token?.trim() || null;
}

