/**
 * Queue Manager PWA → Visor de Administración.
 * IndexedDB + lotes + reintentos. No envía datos al visor público.
 */
(function () {
  const DB_NAME = 'AgroIA_CampoQueue';
  const STORE = 'pending';
  const BATCH_SIZE = 12;
  const MAX_ATTEMPTS = 12;
  const MAX_PHOTO_CHARS = 180000;

  const cfg = window.__AGROIA_VISOR__ || {};
  const isLocal =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const adminOrigin = String(
    cfg.adminOrigin ||
      (isLocal ? 'http://localhost:3000' : 'https://visor-agrotolima.vercel.app')
  ).replace(/\/$/, '');
  const ingestUrl = cfg.ingestUrl || adminOrigin + '/api/capturas';
  const proxyUrl = cfg.proxyUrl || '/api/campo/sync';

  let dbPromise = null;
  let flushing = false;
  let configReady = Promise.resolve();

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
    return dbPromise;
  }

  function txStore(mode) {
    return openDb().then(function (db) {
      return db.transaction(STORE, mode).objectStore(STORE);
    });
  }

  function putItem(item) {
    return txStore('readwrite').then(function (store) {
      return new Promise(function (resolve, reject) {
        const req = store.put(item);
        req.onsuccess = function () {
          resolve(item.id);
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  function deleteItem(id) {
    return txStore('readwrite').then(function (store) {
      return new Promise(function (resolve, reject) {
        const req = store.delete(id);
        req.onsuccess = function () {
          resolve();
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  function getAll() {
    return txStore('readonly').then(function (store) {
      return new Promise(function (resolve, reject) {
        const req = store.getAll();
        req.onsuccess = function () {
          resolve(req.result || []);
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  function looksLikeCampo(value) {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) return value.some(looksLikeCampo);
    return Boolean(
      value.datosCampo ||
        value.predioId ||
        value.predios ||
        value.lote ||
        value.records ||
        value.record ||
        value.farmName ||
        value.producerName ||
        value.hectareas ||
        value.formulario ||
        value.metrics ||
        value.metricas ||
        value.finca ||
        value.municipio
    );
  }

  function slim(payload) {
    const copy = JSON.parse(JSON.stringify(payload));
    if (Array.isArray(copy.fotosComprimidas)) {
      copy.fotosComprimidas = copy.fotosComprimidas.filter(function (item) {
        return typeof item === 'string' && item.length <= MAX_PHOTO_CHARS;
      });
    }
    return copy;
  }

  function inferKind(payload) {
    if (payload.kind) return payload.kind;
    if (payload.formulario || payload.form) return 'form';
    if (payload.metrics || payload.metricas) return 'metric';
    if (payload.lote) return 'lote';
    return 'record';
  }

  function enqueue(payload, kind) {
    if (!payload || typeof payload !== 'object') return Promise.resolve(null);
    const body = slim(payload);
    const id = String(
      body.clientId ||
        body.id ||
        body.recordId ||
        body.predioId ||
        'OFFLINE-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
    );
    body.clientId = id;
    body.kind = kind || inferKind(body);
    body.destination = 'visor-admin';
    const item = {
      id: id,
      kind: body.kind,
      payload: body,
      createdAt: Date.now(),
      attempts: 0,
    };
    return putItem(item).then(function () {
      scheduleFlush(250);
      return id;
    });
  }

  function backoffMs(attempts) {
    return Math.min(30000, 1200 * Math.pow(2, Math.max(0, attempts)));
  }

  function postLote(url, lote) {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-visor-audience': 'admin',
      },
      body: JSON.stringify({
        lote: lote.map(function (item) {
          return item.payload;
        }),
        source: 'Agro-IA Captura de Campo',
        destination: 'visor-admin',
        timestamp: new Date().toISOString(),
      }),
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  function flush() {
    if (flushing) return Promise.resolve();
    if (typeof navigator !== 'undefined' && !navigator.onLine) return Promise.resolve();
    flushing = true;
    const now = Date.now();
    return getAll()
      .then(function (all) {
        const ready = all
          .filter(function (item) {
            const attempts = item.attempts || 0;
            if (attempts >= MAX_ATTEMPTS) return false;
            if (item.lastAttemptAt && now - item.lastAttemptAt < backoffMs(attempts)) return false;
            return true;
          })
          .sort(function (a, b) {
            return a.createdAt - b.createdAt;
          })
          .slice(0, BATCH_SIZE);

        if (ready.length === 0) return null;

        const endpoints = [proxyUrl, ingestUrl];
        let lastError = '';
        function tryAt(i) {
          if (i >= endpoints.length) {
            return Promise.reject(new Error(lastError || 'sin ACK'));
          }
          return postLote(endpoints[i], ready).catch(function (err) {
            lastError = err && err.message ? err.message : 'error de red';
            return tryAt(i + 1);
          });
        }

        return tryAt(0).then(
          function (ack) {
            const hasIdLists = Array.isArray(ack.accepted) || Array.isArray(ack.duplicates);
            const done = {};
            (ack.accepted || []).forEach(function (id) {
              done[id] = true;
            });
            (ack.duplicates || []).forEach(function (id) {
              done[id] = true;
            });
            const ackAll = ack.ack !== false && !hasIdLists;
            const ops = ready.map(function (item) {
              if (ackAll || done[item.id] || done[item.payload.clientId]) {
                return deleteItem(item.id);
              }
              item.attempts = (item.attempts || 0) + 1;
              item.lastAttemptAt = now;
              item.lastError = 'sin ACK para este id';
              return putItem(item);
            });
            return Promise.all(ops).then(function () {
              if (all.length > BATCH_SIZE) scheduleFlush(500);
            });
          },
          function (err) {
            return Promise.all(
              ready.map(function (item) {
                item.attempts = (item.attempts || 0) + 1;
                item.lastAttemptAt = now;
                item.lastError = err && err.message ? err.message : 'error de red';
                return putItem(item);
              })
            );
          }
        );
      })
      .catch(function (err) {
        console.warn('[AgroIA queue] flush falló:', err);
      })
      .then(function () {
        flushing = false;
      });
  }

  let flushTimer = null;
  function scheduleFlush(ms) {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(function () {
      flush();
    }, ms || 300);
  }

  function isSelfUrl(url) {
    const href = String(url || '');
    return (
      href.indexOf('/api/campo/sync') !== -1 ||
      href.indexOf('/api/capturas') !== -1 ||
      href.indexOf('/api/visor-config') !== -1 ||
      href.indexOf('/api/admin/capturas') !== -1
    );
  }

  if (typeof window.fetch === 'function') {
    const origFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      try {
        const url =
          typeof input === 'string'
            ? input
            : input && input.url
              ? input.url
              : String(input);
        const method = String(
          (init && init.method) ||
            (input && input.method) ||
            'GET'
        ).toUpperCase();
        if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && !isSelfUrl(url)) {
          let rawBody = init && typeof init.body === 'string' ? init.body : null;
          if (!rawBody && init && init.body && typeof init.body === 'object' && !(init.body instanceof FormData)) {
            try {
              rawBody = JSON.stringify(init.body);
            } catch (err) {
              rawBody = null;
            }
          }
          if (rawBody) {
            try {
              const parsed = JSON.parse(rawBody);
              if (looksLikeCampo(parsed)) enqueue(parsed);
            } catch (err) {
              /* ignore */
            }
          }
        }
      } catch (err) {
        /* ignore intercept errors */
      }
      return origFetch(input, init);
    };
  }

  let storageTimer = null;
  const origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    origSetItem(key, value);
    try {
      if (!/predio|record|captura|agro|form|campo|lote/i.test(String(key))) return;
      const parsed = JSON.parse(value);
      if (!looksLikeCampo(parsed)) return;
      if (storageTimer) clearTimeout(storageTimer);
      storageTimer = setTimeout(function () {
        enqueue({ snapshotKey: key, data: parsed, kind: 'lote' }, 'lote');
      }, 1800);
    } catch (err) {
      /* ignore */
    }
  };

  window.addEventListener('agroia:campo-record', function (evt) {
    const detail = evt && evt.detail;
    if (detail) enqueue(detail);
  });

  window.addEventListener('online', function () {
    scheduleFlush(200);
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') scheduleFlush(200);
  });
  window.addEventListener('message', function (evt) {
    if (evt.data && evt.data.type === 'AGROIA_FLUSH_CAMPO') scheduleFlush(50);
  });
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', function (evt) {
      if (evt.data && evt.data.type === 'AGROIA_FLUSH_CAMPO') scheduleFlush(50);
    });
  }

  configReady = fetch('/api/visor-config', { cache: 'no-store' })
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(function (json) {
      if (!json) return;
      if (json.ingestUrl) cfg.ingestUrl = json.ingestUrl;
      if (json.proxyUrl) cfg.proxyUrl = json.proxyUrl;
      if (json.adminOrigin) cfg.adminOrigin = json.adminOrigin;
    })
    .catch(function () {
      /* keep defaults */
    })
    .then(function () {
      scheduleFlush(800);
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(function (reg) {
          if (reg.sync && typeof reg.sync.register === 'function') {
            return reg.sync.register('agroia-campo-flush').catch(function () {});
          }
        });
      }
    });

  window.__AGROIA_CAMPO_QUEUE__ = {
    enqueue: enqueue,
    flush: flush,
    pending: getAll,
  };
})();
