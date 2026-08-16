import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  const origin = (
    process.env.NEXT_PUBLIC_ADMIN_VISOR_URL ||
    process.env.ADMIN_VISOR_URL ||
    'https://visor-agrotolima.vercel.app'
  ).replace(/\/$/, '');

  return NextResponse.json({
    adminOrigin: origin,
    ingestUrl: `${origin}/api/capturas`,
    proxyUrl: '/api/campo/sync',
    audience: 'admin',
  });
}
