'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
      // Keep ordinary browsing fully usable if service worker registration is blocked.
      console.warn('Tule Resort offline support is unavailable in this browser.', error);
    });
  }, []);

  return null;
}
