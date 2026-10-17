import { NextResponse } from 'next/server';
import { requireStaffOrAdmin } from '@/lib/staffAuth';
import supabaseServer from '@/lib/supabaseServer';

export async function GET(req: Request) {
  const auth = await requireStaffOrAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ authorized: false, error: auth.error }, { status: auth.status ?? 401 });
  }

  // Fetch full user profile
  const { data: user } = await supabaseServer
    .from('users')
    .select('id, email, full_name, role_id, primary_department_id')
    .eq('id', auth.userId)
    .single();

  const primaryDeptName = auth.departmentNames && auth.departmentNames.length > 0 ? auth.departmentNames[0] : null;

  return NextResponse.json({
    authorized: true,
    userId: auth.userId,
    profile: {
      id: user?.id ?? auth.userId,
      email: user?.email ?? null,
      fullName: user?.full_name ?? null,
      role: auth.role,
      departmentId: auth.primary_department_id ?? null,
      departmentIds: auth.departmentIds ?? [],
      departmentName: primaryDeptName,
      departmentNames: auth.departmentNames ?? [],
      allowedModules: auth.allowedModules ?? [],
    },
  });
}
