import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main className="min-h-dvh bg-slate-900 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-emerald-800 bg-emerald-950/80 p-6 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Sin señal de campo
        </p>
        <h1 className="text-2xl font-bold">AgroIA Tolima está en modo offline</h1>
        <p className="text-sm text-emerald-100 leading-relaxed">
          Los recursos de la aplicación quedaron en caché, pero las consultas a Gemini
          requieren conexión. Cuando recupere señal (o datos móviles), reabra el
          asistente para continuar.
        </p>
        <Link
          href="/"
          className="inline-flex mt-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950"
        >
          Reintentar
        </Link>
      </div>
    </main>
  );
}
