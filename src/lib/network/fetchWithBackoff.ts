/**
 * Reintentos con exponential backoff + jitter.
 * Pensado para 429 / 503 / 504 y cortes de red en campo (señal inestable).
 */

import { AgroIAChatError, type AgroIAChatErrorCode } from '@/lib/types/chat';

export interface BackoffOptions {
  /** Intentos totales incluyendo el primero. */
  maxAttempts?: number;
  /** Delay inicial en ms. */
  baseDelayMs?: number;
  /** Tope de espera entre intentos. */
  maxDelayMs?: number;
  /** Abortar si TTFB supera este umbral. */
  timeoutMs?: number;
  /** Códigos HTTP que disparan reintento. */
  retryStatuses?: ReadonlySet<number>;
}

const DEFAULT_RETRY_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function jitteredDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  const jitter = Math.random() * 0.35 * exp;
  return Math.round(exp + jitter);
}

function mapStatusToCode(status: number): AgroIAChatErrorCode {
  if (status === 401 || status === 403) return 'UNAUTHORIZED';
  if (status === 408) return 'TIMEOUT';
  if (status === 429) return 'RATE_LIMIT';
  if (status === 400 || status === 413 || status === 422) return 'BAD_REQUEST';
  if (status === 503 || status === 502 || status === 504) return 'UNAVAILABLE';
  return 'UNKNOWN';
}

export function errorFromResponse(status: number, bodyText: string): AgroIAChatError {
  const retryable = DEFAULT_RETRY_STATUSES.has(status);
  const code = mapStatusToCode(status);
  const trimmed = bodyText.trim().slice(0, 280);
  const message =
    trimmed.length > 0
      ? `AgroIA (${status}): ${trimmed}`
      : `AgroIA no disponible (HTTP ${status}).`;
  return new AgroIAChatError(message, code, status, retryable);
}

/**
 * `fetch` con timeout, reintentos y backoff. No reintenta 4xx de cliente
 * (salvo 408/429) para no duplicar mensajes inválidos.
 */
export async function fetchWithBackoff(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: BackoffOptions = {},
): Promise<Response> {
  const maxAttempts = options.maxAttempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 8_000;
  const timeoutMs = options.timeoutMs ?? 25_000;
  const retryStatuses = options.retryStatuses ?? DEFAULT_RETRY_STATUSES;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const userSignal = init.signal;
    if (userSignal?.aborted) {
      throw new AgroIAChatError('Consulta cancelada.', 'TIMEOUT', 499, false);
    }
    const onUserAbort = () => controller.abort();
    userSignal?.addEventListener('abort', onUserAbort, { once: true });
    const timeoutId = setTimeout(() => controller.abort('timeout'), timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });

      if (response.ok) {
        clearTimeout(timeoutId);
        return response;
      }

      const retryable = retryStatuses.has(response.status);
      const bodyText = await response.text().catch(() => '');

      if (!retryable || attempt === maxAttempts - 1) {
        clearTimeout(timeoutId);
        throw errorFromResponse(response.status, bodyText);
      }

      lastError = errorFromResponse(response.status, bodyText);
    } catch (error) {
      clearTimeout(timeoutId);
      userSignal?.removeEventListener('abort', onUserAbort);

      if (userSignal?.aborted) {
        throw new AgroIAChatError('Consulta cancelada.', 'TIMEOUT', 499, false);
      }

      if (error instanceof AgroIAChatError && !error.retryable) {
        throw error;
      }

      const isAbort =
        (error instanceof DOMException && error.name === 'AbortError') ||
        (error instanceof Error && error.name === 'AbortError');
      const isNetwork =
        error instanceof TypeError ||
        (error instanceof Error && error.message.toLowerCase().includes('network'));

      if (!isAbort && !isNetwork && !(error instanceof AgroIAChatError)) {
        throw error;
      }

      lastError =
        isAbort
          ? new AgroIAChatError(
              'Tiempo de espera agotado al consultar AgroIA.',
              'TIMEOUT',
              408,
              true,
            )
          : error;

      if (attempt === maxAttempts - 1) {
        if (lastError instanceof AgroIAChatError) throw lastError;
        throw new AgroIAChatError(
          'Sin conexión con el servidor AgroIA. Revise la señal e intente de nuevo.',
          'NETWORK',
          0,
          true,
        );
      }
    } finally {
      clearTimeout(timeoutId);
      userSignal?.removeEventListener('abort', onUserAbort);
    }

    await sleep(jitteredDelay(attempt, baseDelayMs, maxDelayMs));
  }

  if (lastError instanceof AgroIAChatError) throw lastError;
  throw new AgroIAChatError(
    'No fue posible completar la consulta.',
    'UNKNOWN',
    0,
    true,
  );
}
