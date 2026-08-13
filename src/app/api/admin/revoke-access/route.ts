import { NextResponse } from 'next/server';
import supabaseServer from '../../../../../lib/supabaseServer';
import { requireAdmin } from '../../../../../lib/adminAuth';

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status ?? 401 });

    const body = await req.json();
    const { userId, departmentId } = body;
    if (!userId || !departmentId) return NextResponse.json({ error: 'userId and departmentId required' }, { status: 400 });

    const { data, error } = await supabaseServer
      .from('staff_department_access')
      .delete()
      .eq('user_id', userId)
      .eq('department_id', departmentId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, deleted: data });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
