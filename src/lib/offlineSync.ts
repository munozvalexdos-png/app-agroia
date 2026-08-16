import localForage from 'localforage';

const ADMIN_ENDPOINT = process.env.NEXT_PUBLIC_ADMIN_VISOR_URL || 'http://127.0.0.1:3000/api/capturas';

export interface CapturaOffline {
  id: string;
  predioId: string;
  datosCampo: Record<string, any>;
  fotosComprimidas: string[];
  timestamp: number;
}

const dbCola = localForage.createInstance({ name: 'AgroIA_ColaOffline' });

// Guardar localmente de inmediato (funciona 100% sin conexión)
export async function registrarCapturaSinInternet(datos: Omit<CapturaOffline, 'id' | 'timestamp'>) {
  const item: CapturaOffline = {
    ...datos,
    id: `OFFLINE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
  };

  await dbCola.setItem(item.id, item);
  sincronizarPendientesConAdmin();
  return item.id;
}

// Sincronización automática por lotes hacia el Visor de Administración
export async function sincronizarPendientesConAdmin() {
  if (!navigator.onLine) return;

  const keys = await dbCola.keys();
  if (keys.length === 0) return;

  const loteKeys = keys.slice(0, 5);
  const loteDatos: CapturaOffline[] = [];

  for (const key of loteKeys) {
    const registro = await dbCola.getItem<CapturaOffline>(key);
    if (registro) loteDatos.push(registro);
  }

  try {
    const respuesta = await fetch(ADMIN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lote: loteDatos }),
    });

    if (respuesta.ok) {
      for (const item of loteDatos) {
        await dbCola.removeItem(item.id);
      }
      if (keys.length > 5) {
        setTimeout(sincronizarPendientesConAdmin, 1000);
      }
    }
  } catch (error) {
    console.warn('Servidor administrativo inaccesible. Se reintentará al recuperar conexión.');
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', sincronizarPendientesConAdmin);
}