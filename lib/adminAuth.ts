import supabaseServer from './supabaseServer';

export async function requireAdmin(req: Request) {
  // Only support Authorization: Bearer <access_token> now.

  // 2) Authorization Bearer <access_token>
  const authHeader = req.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/i);
  if (!match) return { ok: false, status: 401, error: 'Missing admin auth' };
  const token = match[1];

  try {
    const { data: userRes, error: userErr } = await supabaseServer.auth.getUser(token);
    if (userErr || !userRes?.user) return { ok: false, status: 401, error: 'Invalid token' };
    const uid = userRes.user.id;

    // Check users.role_id against admin/manager
    const { data, error } = await supabaseServer
      .from('users')
      .select('role_id')
      .eq('id', uid)
      .limit(1)
      .single();
    if (error) return { ok: false, status: 403, error: 'User record not found' };

    // Resolve role names for admin/manager
    const { data: roles } = await supabaseServer.from('roles').select('id,name').in('name', ['admin','manager']);
    const roleIds = (roles || []).map((r: any) => r.id);
    if (roleIds.includes(data.role_id)) return { ok: true, method: 'session', userId: uid };

    return { ok: false, status: 403, error: 'Insufficient permissions' };
  } catch (err: any) {
    return { ok: false, status: 500, error: String(err?.message ?? err) };
  }
}
