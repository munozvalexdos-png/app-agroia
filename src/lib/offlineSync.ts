import localForage from 'localforage';
import type { DatosCampoCaptura } from '@/lib/types/captura';

export const ADMIN_VISOR_ORIGIN =
  process.env.NEXT_PUBLIC_ADMIN_VISOR_URL || 'https://visor-agrotolima.vercel.app';

export const ADMIN_INGEST_PATH = '/api/capturas';

const BATCH_SIZE = 12;
const MAX_ATTEMPTS = 12;
const MAX_PHOTO_CHARS = 180_000;

export interface CapturaOffline {
  id: string;
  predioId: string;
  datosCampo: DatosCampoCaptura;
  fotosComprimidas: string[];
  timestamp: number;
  kind?: 'record' | 'form' | 'metric' | 'lote';
  attempts?: number;
  lastError?: string;
}

export interface CampoQueueItem {
  id: string;
  kind: 'record' | 'form' | 'metric' | 'lote';
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  lastError?: string;
  lastAttemptAt?: number;
}

const dbCola = localForage.createInstance({
  name: 'AgroIA_CampoQueue',
  storeName: 'pending',
});

function ingestEndpoints(): string[] {
  const origin = ADMIN_VISOR_ORIGIN.replace(/\/$/, '');
  return ['/api/campo/sync', `${origin}${ADMIN_INGEST_PATH}`];
}

function backoffMs(attempts: number): number {
  return Math.min(30_000, 1_200 * 2 ** Math.max(0, attempts));
}

function slimPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...payload };
  const fotos = copy.fotosComprimidas;
  if (Array.isArray(fotos)) {
    copy.fotosComprimidas = fotos.filter(
      (item) => typeof item === 'string' && item.length <= MAX_PHOTO_CHARS
    );
  }
  return copy;
}

export async function enqueueCampoItem(
  payload: Record<string, unknown>,
  kind: CampoQueueItem['kind'] = 'record'
): Promise<string> {
  const id = String(
    payload.clientId ||
      payload.id ||
      `OFFLINE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  const item: CampoQueueItem = {
    id,
    kind,
    payload: slimPayload({ ...payload, clientId: id, kind }),
    createdAt: Date.now(),
    attempts: 0,
  };
  await dbCola.setItem(id, item);
  void flushCampoQueue();
  return id;
}

export async function registrarCapturaSinInternet(
  datos: Omit<CapturaOffline, 'id' | 'timestamp'>
): Promise<string> {
  return enqueueCampoItem(
    {
      predioId: datos.predioId,
      datosCampo: datos.datosCampo,
      fotosComprimidas: datos.fotosComprimidas,
      kind: datos.kind || 'record',
    },
    datos.kind || 'record'
  );
}

async function postLote(endpoint: string, lote: CampoQueueItem[]): Promise<{
  ok: boolean;
  accepted: string[];
  duplicates: string[];
}> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-visor-audience': 'admin',
    },
    body: JSON.stringify({
      lote: lote.map((item) => item.payload),
      source: 'Agro-IA Captura de Campo',
      destination: 'visor-admin',
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const ack = (await response.json()) as {
    ack?: boolean;
    accepted?: string[];
    duplicates?: string[];
  };

  return {
    ok: ack.ack !== false,
    accepted: ack.accepted || lote.map((item) => item.id),
    duplicates: ack.duplicates || [],
  };
}

let flushing = false;

export async function flushCampoQueue(): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  flushing = true;

  try {
    const keys = await dbCola.keys();
    if (keys.length === 0) return;

    const now = Date.now();
    const ready: CampoQueueItem[] = [];
    for (const key of keys) {
      const item = await dbCola.getItem<CampoQueueItem>(key);
      if (!item) continue;
      const attempts = item.attempts || 0;
      if (attempts >= MAX_ATTEMPTS) continue;
      if (item.lastAttemptAt && now - item.lastAttemptAt < backoffMs(attempts)) continue;
      ready.push(item);
    }

    ready.sort((a, b) => a.createdAt - b.createdAt);
    const lote = ready.slice(0, BATCH_SIZE);
    if (lote.length === 0) return;

    let ack: { ok: boolean; accepted: string[]; duplicates: string[] } | null = null;
    let lastError = '';
    for (const endpoint of ingestEndpoints()) {
      try {
        ack = await postLote(endpoint, lote);
        if (ack.ok) break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'error de red';
      }
    }

    if (!ack?.ok) {
      for (const item of lote) {
        await dbCola.setItem(item.id, {
          ...item,
          attempts: (item.attempts || 0) + 1,
          lastAttemptAt: now,
          lastError,
        });
      }
      return;
    }

    const done = new Set([...ack.accepted, ...ack.duplicates]);
    for (const item of lote) {
      if (done.has(item.id) || done.has(String(item.payload.clientId))) {
        await dbCola.removeItem(item.id);
      } else {
        await dbCola.setItem(item.id, {
          ...item,
          attempts: (item.attempts || 0) + 1,
          lastAttemptAt: now,
          lastError: 'sin ACK para este id',
        });
      }
    }

    if (keys.length > BATCH_SIZE) {
      setTimeout(() => {
        void flushCampoQueue();
      }, 400);
    }
  } finally {
    flushing = false;
  }
}

/** Alias histórico */
export const sincronizarPendientesConAdmin = flushCampoQueue;

export async function pendingCampoCount(): Promise<number> {
  const keys = await dbCola.keys();
  return keys.length;
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flushCampoQueue();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flushCampoQueue();
  });
}
