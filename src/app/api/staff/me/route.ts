import { NextResponse } from 'next/server';
import { requireStaffOrAdmin } from '../../../../../lib/staffAuth';
import supabaseServer from '../../../../../lib/supabaseServer';

export async function GET(req: Request) {
  const auth = await requireStaffOrAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ authorized: false, error: auth.error }, { status: auth.status ?? 401 });
  }

  // Fetch the current staff profile after role-aware authorization.
  const { data: user, error: userError } = await supabaseServer
    .from('users')
    .select('id, email, full_name, role_id, primary_department_id')
    .eq('id', auth.userId)
    .single();

  if (userError || !user) {
    return NextResponse.json({ authorized: false, error: 'Staff profile was not found.' }, { status: 403 });
  }

  let roleName = auth.role;
  let departmentName: string | null = null;

  if (user?.role_id) {
    const { data: role } = await supabaseServer.from('roles').select('name').eq('id', user.role_id).single();
    if (role?.name) roleName = role.name;
  }

  if (user?.primary_department_id) {
    const { data: dept } = await supabaseServer.from('departments').select('name').eq('id', user.primary_department_id).single();
    if (dept?.name) departmentName = dept.name;
  }

  return NextResponse.json({
    authorized: true,
    userId: auth.userId,
    profile: {
      id: user?.id ?? auth.userId,
      email: user?.email ?? null,
      fullName: user?.full_name ?? null,
      role: roleName,
      departmentId: user?.primary_department_id ?? null,
      departmentName: departmentName,
    },
  });
}
