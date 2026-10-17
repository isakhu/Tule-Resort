import { NextResponse } from 'next/server';
import supabaseServer from '@/lib/supabaseServer';
import { requireAdmin } from '@/lib/adminAuth';

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status ?? 401 });

    const body = await req.json();
    const { userId, departmentId } = body;

    const parsedDeptId = Number(departmentId);
    if (!userId || !parsedDeptId || !Number.isInteger(parsedDeptId)) {
      return NextResponse.json({ error: 'Valid userId and departmentId are required.' }, { status: 400 });
    }

    // Verify department exists in allowlist
    const { data: dept } = await supabaseServer
      .from('departments')
      .select('id, name, is_active')
      .eq('id', parsedDeptId)
      .eq('is_active', true)
      .maybeSingle();

    if (!dept) {
      return NextResponse.json({ error: 'The selected department is inactive or does not exist.' }, { status: 400 });
    }

    // Verify user exists
    const { data: user } = await supabaseServer
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'Target staff user not found.' }, { status: 404 });
    }

    // Insert into staff_department_access (idempotent by UNIQUE constraint)
    const { data, error } = await supabaseServer
      .from('staff_department_access')
      .upsert(
        { user_id: userId, department_id: parsedDeptId },
        { onConflict: 'user_id,department_id' }
      )
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, inserted: data });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
