import { NextResponse } from 'next/server';
import supabaseServer from '../../../../../lib/supabaseServer';
import { requireAdmin } from '../../../../../lib/adminAuth';

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status ?? 401 });

    const body = await req.json();
    const { email, password, full_name, role_id, primary_department_id } = body;
    if (!email || !password) return NextResponse.json({ error: 'email and password required' }, { status: 400 });

    // 1) Create auth user via Admin API
    const { data: createData, error: createErr } = await supabaseServer.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: full_name ?? null },
    });
    if (createErr || !createData?.user) return NextResponse.json({ error: String(createErr?.message ?? 'failed to create auth user') }, { status: 500 });

    const userId = createData.user.id;

    // 2) Insert into public.users using the exact UUID returned
    const { data: userRow, error: userErr } = await supabaseServer
      .from('users')
      .insert({ id: userId, email, full_name: full_name ?? null, role_id: role_id ?? null, primary_department_id: primary_department_id ?? null })
      .select()
      .single();

    if (userErr) {
      // Cleanup: delete created auth user to avoid orphan
      try {
        await supabaseServer.auth.admin.deleteUser(userId);
      } catch (e) {
        // ignore cleanup failure, but surface original error
      }
      return NextResponse.json({ error: String(userErr.message ?? userErr) }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: userRow });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
