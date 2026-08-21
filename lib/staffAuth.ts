import supabaseServer from './supabaseServer';

export async function requireStaffOrAdmin(req: Request) {
  const authHeader = req.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/i);
  if (!match) return { ok: false, status: 401, error: 'Missing auth token' };

  const token = match[1];
  const { data: userRes, error: userErr } = await supabaseServer.auth.getUser(token);
  if (userErr || !userRes?.user) return { ok: false, status: 401, error: 'Invalid token' };

  const uid = userRes.user.id;
  const { data: user, error: userError } = await supabaseServer
    .from('users')
    .select('role_id,primary_department_id')
    .eq('id', uid)
    .limit(1)
    .single();

  if (userError || !user) {
    return { ok: false, status: 403, error: 'User record not found' };
  }

  const { data: role, error: roleError } = await supabaseServer
    .from('roles')
    .select('name')
    .eq('id', user.role_id)
    .limit(1)
    .single();

  if (roleError || !role?.name) {
    return { ok: false, status: 403, error: 'User role not configured' };
  }

  if (role.name === 'admin' || role.name === 'manager') {
    return {
      ok: true,
      isAdmin: true,
      isStaff: false,
      role: role.name,
      userId: uid,
      primary_department_id: user.primary_department_id,
    };
  }

  if (role.name === 'staff') {
    return {
      ok: true,
      isAdmin: false,
      isStaff: true,
      role: role.name,
      userId: uid,
      primary_department_id: user.primary_department_id,
    };
  }

  return { ok: false, status: 403, error: 'Insufficient staff permissions' };
}
