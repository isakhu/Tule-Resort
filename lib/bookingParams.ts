export type RoomCategoryId = 'all' | 'lake' | 'garden' | 'suites' | 'apartments' | 'family';
export type RoomSortOption = 'featured' | 'price-asc' | 'price-desc' | 'size';

export interface RoomExploreFilters {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  category: RoomCategoryId;
  q: string;
  sort: RoomSortOption;
  maxPrice?: number;
  availableOnly: boolean;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const CATEGORY_ALIASES: Record<string, RoomCategoryId> = {
  all: 'all',
  lake: 'lake',
  lakeview: 'lake',
  'lake-view': 'lake',
  garden: 'garden',
  pool: 'garden',
  suite: 'suites',
  suites: 'suites',
  apartment: 'apartments',
  apartments: 'apartments',
  family: 'family',
};

export function pickSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) return value[0]?.trim() || undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  return undefined;
}

export function isValidIsoDate(value?: string | null): value is string {
  if (!value || !ISO_DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

export function normalizeCategoryParam(value?: string | null): RoomCategoryId {
  if (!value) return 'all';
  return CATEGORY_ALIASES[value.trim().toLowerCase()] ?? 'all';
}

export function normalizeSortParam(value?: string | null): RoomSortOption {
  if (value === 'price-asc' || value === 'price-desc' || value === 'size') {
    return value;
  }
  return 'featured';
}

export function parsePositiveInt(value?: string | null): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[^0-9]/g, '');
  if (!cleaned) return undefined;
  const parsed = Number(cleaned);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function normalizeStayDates(
  checkIn?: string,
  checkOut?: string
): { checkIn?: string; checkOut?: string } {
  const validIn = isValidIsoDate(checkIn) ? checkIn : undefined;
  const validOut = isValidIsoDate(checkOut) ? checkOut : undefined;
  if (validIn && validOut && validOut > validIn) {
    return { checkIn: validIn, checkOut: validOut };
  }
  if (validIn && !validOut) {
    return { checkIn: validIn };
  }
  return {};
}

export function parseRoomExploreFilters(
  raw: Record<string, string | string[] | undefined>
): RoomExploreFilters {
  const rawCheckIn = pickSearchParam(raw.checkIn);
  const rawCheckOut = pickSearchParam(raw.checkOut);
  const { checkIn, checkOut } = normalizeStayDates(rawCheckIn, rawCheckOut);
  const guests = parsePositiveInt(pickSearchParam(raw.guests));
  const category = normalizeCategoryParam(
    pickSearchParam(raw.type) ?? pickSearchParam(raw.category)
  );
  const q = pickSearchParam(raw.q) ?? pickSearchParam(raw.search) ?? '';
  const sort = normalizeSortParam(pickSearchParam(raw.sort));
  const maxPriceRaw = Number(pickSearchParam(raw.maxPrice) ?? '');
  const maxPrice = Number.isFinite(maxPriceRaw) && maxPriceRaw > 0 ? maxPriceRaw : undefined;

  const availabilityParam = (
    pickSearchParam(raw.availability) ??
    pickSearchParam(raw.available) ??
    ''
  ).toLowerCase();

  let availableOnly = false;
  if (availabilityParam === 'available' || availabilityParam === 'true' || availabilityParam === '1') {
    availableOnly = true;
  } else if (availabilityParam === 'all' || availabilityParam === 'false' || availabilityParam === '0') {
    availableOnly = false;
  } else if (checkIn && checkOut) {
    // When arriving with a selected date range, prioritize bookable accommodations
    availableOnly = true;
  }

  return {
    checkIn,
    checkOut,
    guests,
    category,
    q,
    sort,
    maxPrice,
    availableOnly,
  };
}

export function buildStaySearchQuery(params: {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}): string {
  const sp = new URLSearchParams();
  const { checkIn, checkOut } = normalizeStayDates(params.checkIn, params.checkOut);
  if (checkIn) sp.set('checkIn', checkIn);
  if (checkOut) sp.set('checkOut', checkOut);
  if (params.guests && Number.isInteger(params.guests) && params.guests > 0) {
    sp.set('guests', String(params.guests));
  }
  return sp.toString();
}

export function buildRoomExploreSearchQuery(filters: RoomExploreFilters): string {
  const sp = new URLSearchParams();
  const { checkIn, checkOut } = normalizeStayDates(filters.checkIn, filters.checkOut);
  if (checkIn) sp.set('checkIn', checkIn);
  if (checkOut) sp.set('checkOut', checkOut);
  if (filters.guests && filters.guests > 0) sp.set('guests', String(filters.guests));
  if (filters.category !== 'all') sp.set('type', filters.category);
  if (filters.q.trim()) sp.set('q', filters.q.trim());
  if (filters.sort !== 'featured') sp.set('sort', filters.sort);
  if (filters.maxPrice && filters.maxPrice > 0) sp.set('maxPrice', String(filters.maxPrice));
  if (filters.availableOnly) {
    sp.set('availability', 'available');
  } else if (checkIn && checkOut) {
    sp.set('availability', 'all');
  }
  return sp.toString();
}

