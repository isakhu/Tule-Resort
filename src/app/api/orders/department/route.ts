import { NextResponse } from 'next/server';
import supabaseServer from '../../../../../lib/supabaseServer';
import { requireStaffOrAdmin } from '../../../../../lib/staffAuth';

export async function GET(req: Request) {
  try {
    const auth = await requireStaffOrAdmin(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status ?? 401 });

    // If admin, return all orders; if staff, return orders for their primary dept and extra access
    if (auth.isAdmin) {
      const { data, error } = await supabaseServer.from('orders').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ orders: data });
    }

    const uid = auth.userId;
    // find departments: primary + extra
    const { data: userRow } = await supabaseServer.from('users').select('primary_department_id').eq('id', uid).limit(1).single();
    const primaryDept = userRow?.primary_department_id;
    const { data: extras } = await supabaseServer.from('staff_department_access').select('department_id').eq('user_id', uid);
    const deptIds = [] as number[];
    if (primaryDept) deptIds.push(primaryDept);
    if (extras && extras.length) deptIds.push(...extras.map((e: any) => e.department_id));

    if (deptIds.length === 0) return NextResponse.json({ orders: [] });

    const { data, error } = await supabaseServer.from('orders').select('*').in('department_id', deptIds).order('created_at', { ascending: false }).limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ orders: data });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
