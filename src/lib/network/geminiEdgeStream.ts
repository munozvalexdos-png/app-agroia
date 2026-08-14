/**
 * Cliente Gemini Flash vía REST SSE — compatible con runtime Edge
 * (solo fetch, sin SDK Node). Reintenta 429/503 con backoff.
 */

import { fetchWithBackoff } from '@/lib/network/fetchWithBackoff';
import type { ChatMessage } from '@/lib/types/chat';

interface GeminiPart {
  text?: string;
}

interface GeminiContent {
  role?: string;
  parts?: GeminiPart[];
}

interface GeminiCandidate {
  content?: GeminiContent;
}

interface GeminiSsePayload {
  candidates?: GeminiCandidate[];
  error?: { message?: string; code?: number };
}

export interface GeminiStreamOptions {
  apiKey: string;
  model: string;
  systemInstruction: string;
  history: readonly ChatMessage[];
  prompt: string;
}

function toGeminiContents(
  history: readonly ChatMessage[],
  prompt: string,
): GeminiContent[] {
  const contents: GeminiContent[] = [];
  const trimmedPrompt = prompt.trim();

  for (const message of history) {
    const text = message.content.trim();
    if (text.length === 0) continue;
    contents.push({
      role: message.role === 'user' ? 'user' : 'model',
      parts: [{ text }],
    });
  }

  const last = contents[contents.length - 1];
  if (!(last?.role === 'user' && last.parts?.[0]?.text === trimmedPrompt)) {
    contents.push({
      role: 'user',
      parts: [{ text: trimmedPrompt }],
    });
  }

  return contents;
}

function extractText(payload: GeminiSsePayload): string {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text)
    .filter((text): text is string => typeof text === 'string' && text.length > 0)
    .join('');
}

/**
 * Abre el stream SSE de Gemini y entrega deltas de texto.
 */
export async function openGeminiTextStream(
  options: GeminiStreamOptions,
): Promise<ReadableStream<Uint8Array>> {
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:streamGenerateContent`,
  );
  url.searchParams.set('alt', 'sse');
  url.searchParams.set('key', options.apiKey);

  const geminiResponse = await fetchWithBackoff(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: options.systemInstruction }],
        },
        contents: toGeminiContents(options.history, options.prompt),
        generationConfig: {
          temperature: 0.45,
          maxOutputTokens: 2048,
          topP: 0.9,
        },
      }),
    },
    {
      maxAttempts: 4,
      baseDelayMs: 400,
      timeoutMs: 20_000,
    },
  );

  if (!geminiResponse.body) {
    throw new Error('Gemini no devolvió cuerpo de streaming.');
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const upstream = geminiResponse.body.getReader();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = '';
      const emitJson = (obj: Record<string, string>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      const emitDone = () => {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      };

      try {
        while (true) {
          const { value, done } = await upstream.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';

          for (const frame of frames) {
            const data = frame
              .split('\n')
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trim())
              .join('');

            if (data.length === 0 || data === '[DONE]') continue;

            let payload: GeminiSsePayload;
            try {
              payload = JSON.parse(data) as GeminiSsePayload;
            } catch {
              continue;
            }

            if (payload.error?.message) {
              emitJson({ error: payload.error.message });
              continue;
            }

            const text = extractText(payload);
            if (text.length > 0) {
              emitJson({ text });
            }
          }
        }

        emitDone();
        controller.close();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Fallo al leer el flujo de Gemini.';
        emitJson({ error: message });
        emitDone();
        controller.close();
      } finally {
        upstream.releaseLock();
      }
    },
    cancel() {
      void upstream.cancel();
    },
  });
}
