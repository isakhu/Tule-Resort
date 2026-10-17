import { NextResponse } from 'next/server';
import supabaseServer from '@/lib/supabaseServer';
import { requireModuleAccess } from '@/lib/staffAuth';

export async function GET(req: Request) {
  try {
    const auth = await requireModuleAccess(req, 'orders');
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status ?? 401 });

    // If admin or manager, return all orders across resort
    if (auth.isAdmin) {
      const { data, error } = await supabaseServer
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ orders: data ?? [] });
    }

    // Staff user: filter by their assigned department IDs
    const deptIds = auth.departmentIds ?? [];
    if (deptIds.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    const { data, error } = await supabaseServer
      .from('orders')
      .select('*')
      .in('department_id', deptIds)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ orders: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
