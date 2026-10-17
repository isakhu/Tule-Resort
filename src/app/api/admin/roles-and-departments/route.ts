import { NextResponse } from 'next/server';
import supabaseServer from '@/lib/supabaseServer';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status ?? 401 });

  const [rolesRes, deptsRes] = await Promise.all([
    supabaseServer.from('roles').select('id, name').order('id', { ascending: true }),
    supabaseServer.from('departments').select('id, name, is_active').order('name', { ascending: true }),
  ]);

  if (rolesRes.error) {
    return NextResponse.json({ error: rolesRes.error.message }, { status: 500 });
  }
  if (deptsRes.error) {
    return NextResponse.json({ error: deptsRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    roles: rolesRes.data ?? [],
    departments: (deptsRes.data ?? []).filter((d: any) => d.is_active !== false),
  });
}
