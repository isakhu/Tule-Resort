import { NextResponse } from 'next/server';
import supabaseServer from '@/lib/supabaseServer';
import { requireAdmin } from '@/lib/adminAuth';

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status ?? 401 });

    const body = await req.json();
    const { email, password, full_name, role_id, primary_department_id } = body;

    const cleanEmail = String(email ?? '').trim().toLowerCase();
    const cleanPassword = String(password ?? '');
    const cleanName = String(full_name ?? '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // Server-side allowlist validation for role_id
    const parsedRoleId = role_id != null && role_id !== '' ? Number(role_id) : null;
    if (parsedRoleId == null || !Number.isInteger(parsedRoleId)) {
      return NextResponse.json({ error: 'A valid role must be selected.' }, { status: 400 });
    }

    const { data: validRoles } = await supabaseServer
      .from('roles')
      .select('id, name');

    const roleAllowlist = (validRoles ?? []).map((r: any) => r.id);
    if (!roleAllowlist.includes(parsedRoleId)) {
      return NextResponse.json({ error: 'The selected role is invalid or not allowed.' }, { status: 400 });
    }

    // Server-side allowlist validation for primary_department_id
    let parsedDeptId: number | null = null;
    if (primary_department_id != null && primary_department_id !== '') {
      parsedDeptId = Number(primary_department_id);
      if (!Number.isInteger(parsedDeptId)) {
        return NextResponse.json({ error: 'Invalid department ID.' }, { status: 400 });
      }

      const { data: validDepts } = await supabaseServer
        .from('departments')
        .select('id, is_active')
        .eq('is_active', true);

      const deptAllowlist = (validDepts ?? []).map((d: any) => d.id);
      if (!deptAllowlist.includes(parsedDeptId)) {
        return NextResponse.json({ error: 'The selected department is inactive or does not exist.' }, { status: 400 });
      }
    }

    // 1) Create auth user via Admin API
    const { data: createData, error: createErr } = await supabaseServer.auth.admin.createUser({
      email: cleanEmail,
      password: cleanPassword,
      email_confirm: true,
      user_metadata: { full_name: cleanName || null },
    });

    if (createErr || !createData?.user) {
      return NextResponse.json({ error: createErr?.message ?? 'Failed to create authentication user.' }, { status: 400 });
    }

    const userId = createData.user.id;

    // 2) Insert into public.users
    const { data: userRow, error: userErr } = await supabaseServer
      .from('users')
      .insert({
        id: userId,
        email: cleanEmail,
        full_name: cleanName || null,
        role_id: parsedRoleId,
        primary_department_id: parsedDeptId,
      })
      .select()
      .single();

    if (userErr) {
      // Rollback auth user creation if public.users insert fails
      try {
        await supabaseServer.auth.admin.deleteUser(userId);
      } catch {
        // ignore cleanup error
      }
      return NextResponse.json({ error: userErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: userRow });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
