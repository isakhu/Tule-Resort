export type DashboardModule =
  | 'dashboard'
  | 'queue'
  | 'orders'
  | 'tables'
  | 'kitchen'
  | 'menu'
  | 'reservations'
  | 'rooms'
  | 'receipts'
  | 'spa'
  | 'housekeeping'
  | 'maintenance'
  | 'staff_management'
  | 'settings';

export const ALL_MODULES: DashboardModule[] = [
  'dashboard',
  'queue',
  'orders',
  'tables',
  'kitchen',
  'menu',
  'reservations',
  'rooms',
  'receipts',
  'spa',
  'housekeeping',
  'maintenance',
  'staff_management',
  'settings',
];

/**
 * Department-to-modules permission map.
 * When role === 'staff', their permissions are computed as the union of all
 * modules granted by their primary department and any extra departments.
 */
export const DEPARTMENT_MODULE_MAP: Record<string, DashboardModule[]> = {
  kitchen: ['dashboard', 'queue', 'kitchen', 'orders', 'tables'],
  restaurant: ['dashboard', 'queue', 'kitchen', 'orders', 'tables', 'menu'],
  cafeteria: ['dashboard', 'queue', 'kitchen', 'orders', 'tables', 'menu'],
  'front desk': ['dashboard', 'queue', 'reservations', 'rooms', 'receipts', 'orders'],
  reception: ['dashboard', 'queue', 'reservations', 'rooms', 'receipts', 'orders'],
  housekeeping: ['dashboard', 'queue', 'housekeeping', 'rooms'],
  spa: ['dashboard', 'queue', 'spa', 'orders'],
  wellness: ['dashboard', 'queue', 'spa', 'orders'],
  gym: ['dashboard', 'queue', 'spa'],
  pool: ['dashboard', 'queue', 'spa', 'orders'],
  maintenance: ['dashboard', 'queue', 'maintenance', 'rooms'],
};

export const ROUTE_TO_MODULE_MAP: Record<string, DashboardModule> = {
  '/staff/dashboard': 'dashboard',
  '/staff/dashboard/queue': 'queue',
  '/staff/dashboard/orders': 'orders',
  '/staff/dashboard/tables': 'tables',
  '/staff/dashboard/kitchen': 'kitchen',
  '/staff/dashboard/menu': 'menu',
  '/staff/dashboard/reservations': 'reservations',
  '/staff/dashboard/rooms': 'rooms',
  '/staff/dashboard/receipts': 'receipts',
  '/staff/dashboard/services': 'spa',
  '/staff/dashboard/housekeeping': 'housekeeping',
  '/staff/dashboard/maintenance': 'maintenance',
  '/staff/dashboard/settings': 'settings',
  '/admin/staff': 'staff_management',
};

/**
 * Calculates the allowed dashboard modules for a given role and list of departments.
 * Manager and Admin always receive ALL_MODULES.
 */
export function getAllowedModules(
  role: string | null | undefined,
  departmentNames: string[] = []
): DashboardModule[] {
  const normRole = (role || '').toLowerCase().trim();
  if (normRole === 'admin' || normRole === 'manager') {
    return ALL_MODULES;
  }

  const moduleSet = new Set<DashboardModule>(['dashboard']);

  for (const dept of departmentNames) {
    const raw = (dept || '').toLowerCase().trim();
    // Direct or fuzzy lookup
    for (const [key, mods] of Object.entries(DEPARTMENT_MODULE_MAP)) {
      if (raw.includes(key) || key.includes(raw)) {
        mods.forEach((m) => moduleSet.add(m));
      }
    }
  }

  return Array.from(moduleSet);
}

/**
 * Checks if a given URL pathname is permitted under the allowedModules set.
 */
export function isRouteAllowed(
  pathname: string,
  allowedModules: DashboardModule[]
): boolean {
  if (!allowedModules || allowedModules.length === 0) return false;
  if (allowedModules.includes('dashboard') && (pathname === '/staff/dashboard' || pathname === '/staff/dashboard/')) {
    return true;
  }

  for (const [route, mod] of Object.entries(ROUTE_TO_MODULE_MAP)) {
    if (route === '/staff/dashboard') continue;
    if (pathname === route || pathname.startsWith(route + '/')) {
      return allowedModules.includes(mod);
    }
  }

  // Not a guarded dashboard route
  return true;
}

/**
 * Resolves the required dashboard module for a given path.
 */
export function getModuleForRoute(pathname: string): DashboardModule | null {
  if (pathname === '/staff/dashboard' || pathname === '/staff/dashboard/') {
    return 'dashboard';
  }
  for (const [route, mod] of Object.entries(ROUTE_TO_MODULE_MAP)) {
    if (route === '/staff/dashboard') continue;
    if (pathname === route || pathname.startsWith(route + '/')) {
      return mod;
    }
  }
  return null;
}
