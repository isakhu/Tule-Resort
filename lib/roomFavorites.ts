'use client';

import { useCallback, useSyncExternalStore } from 'react';

const FAVORITE_ROOMS_KEY = 'tule-favorite-rooms';
const FAVORITES_EVENT = 'tule-favorites-change';

function getFavoriteIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FAVORITE_ROOMS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(FAVORITES_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(FAVORITES_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function toggleFavoriteRoom(roomId: string): boolean {
  if (typeof window === 'undefined' || !roomId) return false;
  const current = getFavoriteIds();
  const exists = current.includes(roomId);
  const next = exists ? current.filter((id) => id !== roomId) : [...current, roomId];
  try {
    window.localStorage.setItem(FAVORITE_ROOMS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota or restricted storage contexts
  }
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT));
  return !exists;
}

export function useRoomFavorite(roomId: string): { isFavorite: boolean; toggle: () => void } {
  const isFavorite = useSyncExternalStore(
    subscribe,
    () => getFavoriteIds().includes(roomId),
    () => false,
  );
  const toggle = useCallback(() => {
    toggleFavoriteRoom(roomId);
  }, [roomId]);

  return { isFavorite, toggle };
}

