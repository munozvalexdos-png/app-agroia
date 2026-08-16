// Agro-IA-Tolima - Automatic Version Detection and Remote Cache Invalidator
const APP_VERSION = '1.0.10'; // Versión local actual
const CHECK_INTERVAL_MS = 30000; // Verificar cada 30 segundos en segundo plano

async function checkAppVersion() {
  try {
    // Petición con timestamp dinámico para evitar el caché del navegador en el JSON
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) return;
    const data = await response.json();

    if (data.version && data.version !== APP_VERSION) {
      console.log(`[Updater] Nueva versión detectada: ${data.version} (Local: ${APP_VERSION})`);
      if (data.forceReload) {
        triggerInstantAutoUpdate();
      } else {
        showUpdateBanner(data.version);
      }
    }
  } catch (error) {
    console.warn('[Updater] Error al verificar versión:', error);
  }
}

function triggerInstantAutoUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (let registration of registrations) {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        registration.update();
      }
    });
  }
  if ('caches' in window) {
    caches.keys().then((names) => {
      Promise.all(names.map((name) => caches.delete(name))).then(() => {
        window.location.reload(true);
      });
    });
  } else {
    window.location.reload(true);
  }
}

function showUpdateBanner(newVersion) {
  if (document.getElementById('update-banner')) return; // Ya se muestra

  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #022c22;
    color: #ffffff;
    padding: 14px 20px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    gap: 14px;
    z-index: 999999;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    border: 1px solid #10b981;
  `;

  banner.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 18px;">🚀</span>
      <span><strong>Nueva versión ${newVersion || ''} disponible</strong>. Toca para actualizar.</span>
    </div>
    <button id="btn-update-app" style="background-color: #10b981; color: #ffffff; border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 13px; white-space: nowrap;">
      Actualizar
    </button>
  `;

  document.body.appendChild(banner);

  document.getElementById('btn-update-app')?.addEventListener('click', () => {
    // Forzar desinstalación de Service Workers registrados
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
    // Limpiar cachés y recargar la página limpia desde el servidor
    if ('caches' in window) {
      caches.keys().then((names) => {
        Promise.all(names.map((name) => caches.delete(name))).then(() => {
          window.location.reload(true);
        });
      });
    } else {
      window.location.reload(true);
    }
  });
}

// 1. Verificación al iniciar
document.addEventListener('DOMContentLoaded', checkAppVersion);

// 2. Verificación cuando el móvil vuelve a primer plano (de segundo plano)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    checkAppVersion();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.update());
      });
    }
  }
});

// 3. Verificación periódica
setInterval(checkAppVersion, CHECK_INTERVAL_MS);

// 4. Registro y control de Service Worker con auto-activación
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
    // Forzar comprobación de actualización remota inmediatamente al iniciar
    reg.update();

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            showUpdateBanner();
          }
        });
      }
    });
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload(true);
    }
  });
}
