import type { NextConfig } from 'next';

const CAPTURE_ORIGIN = 'https://agroia-tolima-capture-128539726303.us-west2.run.app';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  allowedDevOrigins: ['http://localhost:4000', 'http://127.0.0.1:4000'],
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/campo.html' },
        { source: '/index.html', destination: '/campo.html' },
      ],
      afterFiles: [],
      fallback: [
        {
          source: '/api/:path*',
          destination: `${CAPTURE_ORIGIN}/api/:path*`,
        },
      ],
    };
  },
  headers: async () => [
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
    {
      source: '/captura-metricas.js',
      headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
    },
    {
      source: '/assets/captura-app.js',
      headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
    },
    {
      source: '/assets/index-RVP0x7mL.js',
      headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
    },
    {
      source: '/version.json',
      headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
    },
    {
      source: '/manifest.json',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
      ],
    },
    {
      source: '/manifest.webmanifest',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
      ],
    },
  ],
};

export default nextConfig;
