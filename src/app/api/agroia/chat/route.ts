/**
 * POST /api/agroia/chat
 * Runtime Edge: baja latencia, alta concurrencia, menor memoria.
 * Streaming SSE compatible con el cliente (`data: {"text":"..."}`).
 */

import { AgroIAChatError } from '@/lib/types/chat';
import { openGeminiTextStream } from '@/lib/network/geminiEdgeStream';
import { parseChatRequest } from '@/lib/network/parseChatRequest';
import { buildDatabaseContext, composeSystemInstruction } from '@/lib/prompts/agroTolimaChatPrompt';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const DEFAULT_MODEL = 'gemini-2.5-flash';

function sseResponse(
  body: BodyInit,
  status = 200,
): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return jsonError(
      'GEMINI_API_KEY no está configurada en el entorno.',
      503,
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError('JSON inválido.', 400);
  }

  const parsed = parseChatRequest(rawBody);
  if (!parsed.ok) {
    return jsonError(parsed.error, 400);
  }

  const { prompt, history, dbRecords } = parsed.value;
  const dbContext = buildDatabaseContext(dbRecords ?? []);
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  try {
    const stream = await openGeminiTextStream({
      apiKey,
      model,
      systemInstruction: composeSystemInstruction(dbContext),
      history,
      prompt,
    });

    return sseResponse(stream);
  } catch (error) {
    if (error instanceof AgroIAChatError) {
      const status = error.status >= 400 ? error.status : 503;
      return jsonError(error.message, status);
    }

    const message =
      error instanceof Error ? error.message : 'Error interno al consultar Gemini.';
    return jsonError(message, 503);
  }
}
