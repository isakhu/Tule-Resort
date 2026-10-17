import supabaseServer from './supabaseServer';
import { DashboardModule, getAllowedModules } from './permissions';

export interface StaffAuthResult {
  ok: boolean;
  status?: number;
  error?: string;
  isAdmin?: boolean;
  isStaff?: boolean;
  role?: string;
  userId?: string;
  primary_department_id?: number | null;
  departmentIds?: number[];
  departmentNames?: string[];
  allowedModules?: DashboardModule[];
}

export async function requireStaffOrAdmin(req: Request): Promise<StaffAuthResult> {
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

  // Gather all department IDs (primary + extra from staff_department_access)
  const deptIds: number[] = [];
  if (user.primary_department_id && Number.isInteger(user.primary_department_id)) {
    deptIds.push(user.primary_department_id);
  }

  const { data: extraAccess } = await supabaseServer
    .from('staff_department_access')
    .select('department_id')
    .eq('user_id', uid);

  if (extraAccess && extraAccess.length > 0) {
    for (const item of extraAccess) {
      if (item.department_id && !deptIds.includes(item.department_id)) {
        deptIds.push(item.department_id);
      }
    }
  }

  // Resolve department names
  let departmentNames: string[] = [];
  if (deptIds.length > 0) {
    const { data: deptRows } = await supabaseServer
      .from('departments')
      .select('name')
      .in('id', deptIds);
    if (deptRows) {
      departmentNames = deptRows.map((d: any) => d.name);
    }
  }

  const allowedModules = getAllowedModules(role.name, departmentNames);
  const isAdmin = role.name === 'admin' || role.name === 'manager';
  const isStaff = role.name === 'staff';

  if (!isAdmin && !isStaff) {
    return { ok: false, status: 403, error: 'Insufficient staff permissions' };
  }

  return {
    ok: true,
    isAdmin,
    isStaff,
    role: role.name,
    userId: uid,
    primary_department_id: user.primary_department_id,
    departmentIds: deptIds,
    departmentNames,
    allowedModules,
  };
}

/**
 * Server-side check that requires a specific dashboard module permission.
 */
export async function requireModuleAccess(
  req: Request,
  requiredModule: DashboardModule
): Promise<StaffAuthResult> {
  const auth = await requireStaffOrAdmin(req);
  if (!auth.ok) return auth;

  if (auth.isAdmin) return auth;

  if (!auth.allowedModules || !auth.allowedModules.includes(requiredModule)) {
    return {
      ok: false,
      status: 403,
      error: `Access denied: this action requires '${requiredModule}' permissions.`,
    };
  }

  return auth;
}
