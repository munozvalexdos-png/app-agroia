/**
 * Cliente de streaming SSE para POST /api/agroia/chat.
 * Reduce TTFB percibido: el texto se pinta token a token.
 */

import { fetchWithBackoff } from '@/lib/network/fetchWithBackoff';
import {
  AgroIAChatError,
  type AgroIAChatRequest,
  type AgroIAStreamChunk,
} from '@/lib/types/chat';

const CHAT_ENDPOINT = '/api/agroia/chat';

export interface StreamChatHandlers {
  onToken: (chunk: string) => void;
  onError?: (error: AgroIAChatError) => void;
}

function parseSsePayload(raw: string): AgroIAStreamChunk | 'DONE' | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed === '[DONE]') return 'DONE';

  try {
    const parsed = JSON.parse(trimmed) as AgroIAStreamChunk;
    if (typeof parsed.text === 'string' || typeof parsed.error === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Consume un ReadableStream SSE (`data: ...\\n\\n`) y entrega tokens.
 * Reintenta la apertura de la conexión (429/503/timeout); no reintenta
 * a mitad de stream para no duplicar texto ya mostrado.
 */
export async function streamAgroIAChat(
  payload: AgroIAChatRequest,
  handlers: StreamChatHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetchWithBackoff(
    CHAT_ENDPOINT,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(payload),
      ...(signal ? { signal } : {}),
    },
    {
      maxAttempts: 4,
      baseDelayMs: 600,
      timeoutMs: 28_000,
    },
  );

  if (!response.body) {
    throw new AgroIAChatError(
      'El servidor no devolvió un flujo de respuesta.',
      'UNAVAILABLE',
      503,
      true,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const dataLines = frame
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart());

      if (dataLines.length === 0) continue;
      const payloadText = dataLines.join('\n');
      const parsed = parseSsePayload(payloadText);

      if (parsed === 'DONE') {
        return;
      }
      if (parsed === null) continue;

      if (typeof parsed.error === 'string' && parsed.error.length > 0) {
        const err = new AgroIAChatError(parsed.error, 'UNKNOWN', 500, false);
        handlers.onError?.(err);
        throw err;
      }
      if (typeof parsed.text === 'string' && parsed.text.length > 0) {
        handlers.onToken(parsed.text);
      }
    }
  }
}
