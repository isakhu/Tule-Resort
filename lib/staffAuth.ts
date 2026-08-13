import supabaseServer from './supabaseServer';

export async function requireStaffOrAdmin(req: Request) {
  // Only support Authorization: Bearer <access_token> for staff/admin endpoints.

  const authHeader = req.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/i);
  if (!match) return { ok: false, status: 401, error: 'Missing auth token' };
  const token = match[1];

  const { data: userRes, error: userErr } = await supabaseServer.auth.getUser(token);
  if (userErr || !userRes?.user) return { ok: false, status: 401, error: 'Invalid token' };
  const uid = userRes.user.id;

  const { data, error } = await supabaseServer.from('users').select('role_id,primary_department_id').eq('id', uid).limit(1).single();
  if (error) return { ok: false, status: 403, error: 'User record not found' };

  const { data: roles } = await supabaseServer.from('roles').select('id,name');
  const adminRole = (roles || []).find((r: any) => r.name === 'admin' || r.name === 'manager');
  if (adminRole && data.role_id === adminRole.id) return { ok: true, isAdmin: true, userId: uid };

  // Staff allowed
  return { ok: true, isAdmin: false, userId: uid, primary_department_id: data.primary_department_id };
}
