import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agro-IA-Tolima - PWA Campo & SIG',
  description:
    'AgroIA Tolima Capture — Captura de Campo, Georreferenciación GPS y Diagnóstico Agrícola',
  applicationName: 'Agro-IA-Tolima',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Agro-IA-Tolima',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/agro_ia_tolima_icon_192-v2.png', sizes: '192x192', type: 'image/png' },
      { url: '/agro_ia_tolima_icon_512-v2.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/agro_ia_tolima_icon_192-v2.png', sizes: '192x192' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#022c22',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-950 text-white">{children}</body>
    </html>
  );
}
