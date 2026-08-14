'use client';

import { useEffect } from 'react';

/** Registra el Service Worker de la PWA (caché de assets + fallback offline). */
export function usePwaRegistration(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV === 'development') return;

    void navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }, []);
}
