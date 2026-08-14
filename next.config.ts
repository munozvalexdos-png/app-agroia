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
      source: '/updater.js',
      headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
    },
    {
      source: '/version.json',
      headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
    },
    {
      source: '/manifest.json',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
    },
  ],
};

export default nextConfig;
