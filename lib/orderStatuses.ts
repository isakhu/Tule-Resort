export const ORDER_STATUS_ID = {
  PENDING: 1,
  CONFIRMED: 2,
  PREPARING: 3,
  READY: 4,
  DELIVERED: 5,
  COMPLETED: 6,
  ACCEPTED: 7,
  IN_PROGRESS: 8,
  CANCELLED: 9,
} as const;

export type OrderStatusId = (typeof ORDER_STATUS_ID)[keyof typeof ORDER_STATUS_ID];

export type KitchenStation =
  | 'Grill & Fish'
  | 'Ethiopian & Wot'
  | 'Pasta & Pizza'
  | 'Cold, Sides & Drinks';

export const KITCHEN_STATIONS: readonly KitchenStation[] = [
  'Grill & Fish',
  'Ethiopian & Wot',
  'Pasta & Pizza',
  'Cold, Sides & Drinks',
] as const;

export type OrderDisplayBucket =
  | 'Pending'
  | 'Accepted'
  | 'In Progress'
  | 'Ready'
  | 'Delayed'
  | 'Delivered'
  | 'Completed'
  | 'Cancelled';

function normalizeStatusName(statusName?: string | null): string {
  return (statusName || '').trim().toLowerCase();
}

export function isCancelledStatus(statusId?: number | null, statusName?: string | null): boolean {
  if (statusId === ORDER_STATUS_ID.CANCELLED) return true;
  return normalizeStatusName(statusName).includes('cancel');
}

export function isCompletedStatus(statusId?: number | null, statusName?: string | null): boolean {
  if (statusId === ORDER_STATUS_ID.COMPLETED) return true;
  return normalizeStatusName(statusName).includes('complete');
}

export function isDeliveredStatus(statusId?: number | null, statusName?: string | null): boolean {
  if (statusId === ORDER_STATUS_ID.DELIVERED) return true;
  return normalizeStatusName(statusName).includes('deliver');
}

export function isReadyStatus(statusId?: number | null, statusName?: string | null): boolean {
  if (statusId === ORDER_STATUS_ID.READY) return true;
  return normalizeStatusName(statusName).includes('ready');
}

export function isPreparingOrInProgressStatus(
  statusId?: number | null,
  statusName?: string | null
): boolean {
  if (statusId === ORDER_STATUS_ID.PREPARING || statusId === ORDER_STATUS_ID.IN_PROGRESS) {
    return true;
  }
  const name = normalizeStatusName(statusName);
  return name.includes('prep') || name.includes('progress');
}

export function isAcceptedOrConfirmedStatus(
  statusId?: number | null,
  statusName?: string | null
): boolean {
  if (statusId === ORDER_STATUS_ID.CONFIRMED || statusId === ORDER_STATUS_ID.ACCEPTED) {
    return true;
  }
  const name = normalizeStatusName(statusName);
  return name.includes('confirm') || name.includes('accept');
}

export function isPendingStatus(statusId?: number | null, statusName?: string | null): boolean {
  if (statusId === ORDER_STATUS_ID.PENDING) return true;
  return normalizeStatusName(statusName) === 'pending';
}

export function isTerminalOrderStatus(statusId?: number | null, statusName?: string | null): boolean {
  return (
    isCompletedStatus(statusId, statusName) ||
    isCancelledStatus(statusId, statusName)
  );
}

/**
 * Active open orders exclude terminal states (Completed=6, Cancelled=9).
 */
export function isActiveOrderStatus(statusId?: number | null, statusName?: string | null): boolean {
  return !isTerminalOrderStatus(statusId, statusName);
}

/**
 * Orders waiting for preparation or in preparation can become delayed.
 * Ready (4), Delivered (5), Completed (6), Cancelled (9), and Pending (1) are excluded
 * so unstarted/completed/cancelled orders are not mislabeled in prep-delay SLA metrics
 * unless explicitly checked for active preparation SLA.
 */
export function isDelayedInPreparation(
  createdAt: string | null | undefined,
  statusId?: number | null,
  statusName?: string | null,
  thresholdMinutes = 35
): boolean {
  if (!createdAt) return false;
  if (!isPreparingOrInProgressStatus(statusId, statusName)) {
    return false;
  }
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) return false;
  const elapsedMinutes = (Date.now() - createdMs) / 60000;
  return elapsedMinutes > thresholdMinutes;
}

export function classifyOrderBucket(
  statusId?: number | null,
  statusName?: string | null,
  createdAt?: string | null,
  delayedThresholdMinutes = 35
): OrderDisplayBucket {
  if (isCancelledStatus(statusId, statusName)) return 'Cancelled';
  if (isCompletedStatus(statusId, statusName)) return 'Completed';
  if (isDeliveredStatus(statusId, statusName)) return 'Delivered';
  if (isReadyStatus(statusId, statusName)) return 'Ready';
  if (isDelayedInPreparation(createdAt, statusId, statusName, delayedThresholdMinutes)) {
    return 'Delayed';
  }
  if (isPreparingOrInProgressStatus(statusId, statusName)) return 'In Progress';
  if (isAcceptedOrConfirmedStatus(statusId, statusName)) return 'Accepted';
  return 'Pending';
}

export function getCanonicalOrderStatusLabel(
  statusId?: number | null,
  statusName?: string | null
): string {
  if (statusName && statusName.trim()) return statusName.trim();
  switch (statusId) {
    case ORDER_STATUS_ID.PENDING:
      return 'Pending';
    case ORDER_STATUS_ID.CONFIRMED:
      return 'Confirmed';
    case ORDER_STATUS_ID.PREPARING:
      return 'Preparing';
    case ORDER_STATUS_ID.READY:
      return 'Ready';
    case ORDER_STATUS_ID.DELIVERED:
      return 'Delivered';
    case ORDER_STATUS_ID.COMPLETED:
      return 'Completed';
    case ORDER_STATUS_ID.ACCEPTED:
      return 'Accepted';
    case ORDER_STATUS_ID.IN_PROGRESS:
      return 'In Progress';
    case ORDER_STATUS_ID.CANCELLED:
      return 'Cancelled';
    default:
      return 'Pending';
  }
}

export function formatOrderLocationLabel(params: {
  tableNumber?: string | null;
  roomNumber?: string | null;
  guestName?: string | null;
  fallback?: string;
}): string {
  if (params.tableNumber && params.tableNumber.trim()) {
    return params.tableNumber.trim();
  }
  if (params.roomNumber && params.roomNumber.trim()) {
    return `Room ${params.roomNumber.trim()}`;
  }
  if (params.guestName && params.guestName.trim()) {
    return `Guest: ${params.guestName.trim()}`;
  }
  return params.fallback ?? 'Dining Floor';
}

export function mapMenuCategoryToKitchenStation(
  category?: string | null,
  itemName?: string | null
): KitchenStation {
  const cat = (category || '').trim().toLowerCase();
  const name = (itemName || '').trim().toLowerCase();

  if (
    cat.includes('pizza') ||
    cat.includes('pasta') ||
    cat.includes('international') ||
    cat.includes('breakfast') ||
    name.includes('pizza') ||
    name.includes('pasta') ||
    name.includes('spaghetti') ||
    name.includes('lasagna') ||
    name.includes('omelette')
  ) {
    return 'Pasta & Pizza';
  }

  if (
    cat.includes('ethiopian') ||
    cat.includes('wot') ||
    cat.includes('beef') ||
    cat.includes('vegetarian') ||
    cat.includes('vegan') ||
    name.includes('tibs') ||
    name.includes('kitfo') ||
    name.includes('wot') ||
    name.includes('shiro') ||
    name.includes('firfir') ||
    name.includes('bayenetu')
  ) {
    return 'Ethiopian & Wot';
  }

  if (
    cat.includes('fish') ||
    cat.includes('seafood') ||
    cat.includes('poultry') ||
    cat.includes('main') ||
    cat.includes('burger') ||
    cat.includes('sandwich') ||
    cat.includes('grill') ||
    name.includes('grill') ||
    name.includes('steak') ||
    name.includes('tilapia') ||
    name.includes('burger')
  ) {
    return 'Grill & Fish';
  }

  return 'Cold, Sides & Drinks';
}

export function deriveTicketStations(
  items: Array<{ category?: string | null; name?: string | null }>
): KitchenStation[] {
  const stations = new Set<KitchenStation>();
  for (const item of items) {
    stations.add(mapMenuCategoryToKitchenStation(item.category, item.name));
  }
  if (stations.size === 0) {
    return ['Grill & Fish'];
  }
  return Array.from(stations);
}

