import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function adminOrigin(): string {
  return (
    process.env.ADMIN_VISOR_URL ||
    process.env.NEXT_PUBLIC_ADMIN_VISOR_URL ||
    'https://visor-agrotolima.vercel.app'
  ).replace(/\/$/, '');
}

/**
 * Proxy same-origin para la PWA: reenvía lotes al Visor de Administración.
 */
export async function POST(request: Request) {
  const ingestUrl = `${adminOrigin()}/api/capturas`;
  const bodyText = await request.text();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-visor-audience': 'admin',
  };
  const ingestKey = process.env.CAPTURE_INGEST_KEY?.trim();
  if (ingestKey) headers['x-capture-key'] = ingestKey;
  const incomingKey = request.headers.get('x-capture-key');
  if (incomingKey) headers['x-capture-key'] = incomingKey;

  try {
    const upstream = await fetch(ingestUrl, {
      method: 'POST',
      headers,
      body: bodyText,
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        ack: false,
        message:
          error instanceof Error
            ? error.message
            : 'No fue posible alcanzar el Visor de Administración.',
      },
      { status: 502 }
    );
  }
}
