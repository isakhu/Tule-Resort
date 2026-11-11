'use client';

import { useCallback, useSyncExternalStore } from 'react';

export const GUEST_CART_STORAGE_KEY = 'tule-resort-cart';
export const LEGACY_GUEST_CART_STORAGE_KEY = 'haile-resort-cart';
export const GUEST_CART_STAY_KEY = 'tule-resort-cart-stay';
const CART_CHANGE_EVENT = 'tule-cart-change';

export type GuestCartMap = Record<string, number>;

const EMPTY_CART: GuestCartMap = Object.freeze({});
const MAX_ITEM_QUANTITY = 50;

let cachedRawSignature: string | null = null;
let cachedCartSnapshot: GuestCartMap = EMPTY_CART;

function normalizeCartPayload(parsed: unknown): GuestCartMap {
  const next: Record<string, number> = {};

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue;
      const obj = entry as { id?: unknown; menu_item_id?: unknown; quantity?: unknown };
      const id = String(obj.id ?? obj.menu_item_id ?? '').trim();
      const qty = Math.floor(Number(obj.quantity ?? 0));
      if (id && Number.isFinite(qty) && qty > 0) {
        next[id] = Math.min(MAX_ITEM_QUANTITY, (next[id] ?? 0) + qty);
      }
    }
    return Object.keys(next).length > 0 ? next : EMPTY_CART;
  }

  if (parsed && typeof parsed === 'object') {
    for (const [rawId, rawQty] of Object.entries(parsed as Record<string, unknown>)) {
      const id = String(rawId ?? '').trim();
      const qty = Math.floor(Number(rawQty ?? 0));
      if (id && Number.isFinite(qty) && qty > 0) {
        next[id] = Math.min(MAX_ITEM_QUANTITY, qty);
      }
    }
    return Object.keys(next).length > 0 ? next : EMPTY_CART;
  }

  return EMPTY_CART;
}

function readRawCartString(): string {
  if (typeof window === 'undefined') return '';
  try {
    const primary = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (primary !== null) return primary;
    const legacy = window.localStorage.getItem(LEGACY_GUEST_CART_STORAGE_KEY);
    return legacy ?? '';
  } catch {
    return '';
  }
}

export function getCartSnapshot(): GuestCartMap {
  if (typeof window === 'undefined') {
    return EMPTY_CART;
  }

  const raw = readRawCartString();
  if (raw === cachedRawSignature) {
    return cachedCartSnapshot;
  }

  cachedRawSignature = raw;
  if (!raw) {
    cachedCartSnapshot = EMPTY_CART;
    return EMPTY_CART;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeCartPayload(parsed);
    cachedCartSnapshot = Object.keys(normalized).length > 0 ? Object.freeze(normalized) : EMPTY_CART;
  } catch {
    cachedCartSnapshot = EMPTY_CART;
  }

  return cachedCartSnapshot;
}

export function getServerCartSnapshot(): GuestCartMap {
  return EMPTY_CART;
}

function notifyCartListeners(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CART_CHANGE_EVENT));
}

export function writeCartToStorage(nextCart: Record<string, number>): void {
  if (typeof window === 'undefined') return;

  const cleaned: Record<string, number> = {};
  for (const [id, rawQty] of Object.entries(nextCart)) {
    const cleanId = String(id ?? '').trim();
    const qty = Math.floor(Number(rawQty ?? 0));
    if (cleanId && Number.isFinite(qty) && qty > 0) {
      cleaned[cleanId] = Math.min(MAX_ITEM_QUANTITY, qty);
    }
  }

  const serialized = JSON.stringify(cleaned);
  try {
    window.localStorage.setItem(GUEST_CART_STORAGE_KEY, serialized);
    window.localStorage.removeItem(LEGACY_GUEST_CART_STORAGE_KEY);
    cachedRawSignature = serialized;
    cachedCartSnapshot = Object.keys(cleaned).length > 0 ? Object.freeze(cleaned) : EMPTY_CART;
    notifyCartListeners();
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function deltaGuestCartItem(itemId: string, delta: number): void {
  const cleanId = itemId.trim();
  if (!cleanId) return;

  const current = { ...getCartSnapshot() };
  const nextQty = Math.max(0, Math.min(MAX_ITEM_QUANTITY, (current[cleanId] ?? 0) + delta));
  if (nextQty === 0) {
    delete current[cleanId];
  } else {
    current[cleanId] = nextQty;
  }
  writeCartToStorage(current);
}

export function setGuestCartItemQuantity(itemId: string, quantity: number): void {
  const cleanId = itemId.trim();
  if (!cleanId) return;

  const current = { ...getCartSnapshot() };
  const normalizedQty = Math.max(0, Math.min(MAX_ITEM_QUANTITY, Math.floor(quantity)));
  if (normalizedQty === 0) {
    delete current[cleanId];
  } else {
    current[cleanId] = normalizedQty;
  }
  writeCartToStorage(current);
}

export function clearGuestCart(clearStayBinding = false): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_GUEST_CART_STORAGE_KEY);
    if (clearStayBinding) {
      window.localStorage.removeItem(GUEST_CART_STAY_KEY);
    }
    cachedRawSignature = '';
    cachedCartSnapshot = EMPTY_CART;
    notifyCartListeners();
  } catch {
    // Ignore storage errors
  }
}

/**
 * Keeps cart data associated with the active verified guest stay when signed in.
 * If switching from one verified stay to a different guest stay, clears the previous
 * stay's basket so carts never bleed between different room bookings.
 */
export function syncCartWithGuestStay(stayId: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanStayId = typeof stayId === 'string' && stayId.trim() ? stayId.trim() : null;
    const prevStayId = window.localStorage.getItem(GUEST_CART_STAY_KEY);

    if (cleanStayId) {
      if (prevStayId && prevStayId !== cleanStayId) {
        clearGuestCart(false);
      }
      window.localStorage.setItem(GUEST_CART_STAY_KEY, cleanStayId);
    }
  } catch {
    // Ignore storage access errors
  }
}

function subscribeToCart(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === GUEST_CART_STORAGE_KEY ||
      event.key === LEGACY_GUEST_CART_STORAGE_KEY
    ) {
      cachedRawSignature = null;
      listener();
    }
  };

  const handleCustomOrPageShow = () => {
    cachedRawSignature = null;
    listener();
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(CART_CHANGE_EVENT, handleCustomOrPageShow);
  window.addEventListener('pageshow', handleCustomOrPageShow);
  window.addEventListener('focus', handleCustomOrPageShow);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(CART_CHANGE_EVENT, handleCustomOrPageShow);
    window.removeEventListener('pageshow', handleCustomOrPageShow);
    window.removeEventListener('focus', handleCustomOrPageShow);
  };
}

const noopSubscribe = () => () => {};

export function useIsClientHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function useGuestCart() {
  const cart = useSyncExternalStore(subscribeToCart, getCartSnapshot, getServerCartSnapshot);
  const hydrated = useIsClientHydrated();

  const changeQuantity = useCallback((itemId: string, delta: number) => {
    deltaGuestCartItem(itemId, delta);
  }, []);

  const setQuantity = useCallback((itemId: string, quantity: number) => {
    setGuestCartItemQuantity(itemId, quantity);
  }, []);

  const clearCart = useCallback(() => {
    clearGuestCart(false);
  }, []);

  const removeItems = useCallback((itemIds: string[]) => {
    if (!itemIds.length) return;
    const removeSet = new Set(itemIds);
    const next: Record<string, number> = {};
    for (const [id, qty] of Object.entries(getCartSnapshot())) {
      if (!removeSet.has(id)) next[id] = qty;
    }
    writeCartToStorage(next);
  }, []);

  return {
    cart,
    hydrated,
    changeQuantity,
    setQuantity,
    clearCart,
    removeItems,
  };
}
