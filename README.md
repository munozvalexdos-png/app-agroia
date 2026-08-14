# AgroIA Tolima

PWA de consultas agronómicas para el departamento del Tolima (Gemini Flash, streaming SSE, runtime Edge).

## Arranque

```bash
cp .env.example .env.local
# pegue GEMINI_API_KEY
npm install
npm run dev
```

Abra `http://localhost:3000`. En producción (`npm run build && npm start`) el Service Worker cachea la shell para uso en campo.

## Piezas clave

| Ruta | Rol |
|------|-----|
| `src/components/agroia/AgroIAChatModal.tsx` | Chat (markdown, textarea, memo, auto-scroll, limpiar) |
| `src/app/api/agroia/chat/route.ts` | Edge + Gemini Flash streaming |
| `src/lib/network/fetchWithBackoff.ts` | Reintentos 429/503 |
| `public/sw.js` | Caché de estáticos + fallback `/offline` |

`GEMINI_MODEL` por defecto: `gemini-2.5-flash`.
