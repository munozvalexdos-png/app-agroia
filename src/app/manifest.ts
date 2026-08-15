import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Agro-IA Tolima',
    short_name: 'AgroIA',
    description: 'Sistema de captura y monitoreo de datos en campo',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#15803d',
    icons: [
      {
        src: '/agro_ia_tolima_icon_192-v2.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/agro_ia_tolima_icon_512-v2.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}