/**
 * Validación del body POST /api/agroia/chat (Edge, sin `any`).
 */

import {
  isChatMessage,
  type AgroIAChatRequest,
  type AgroRecordSummary,
  type ChatMessage,
} from '@/lib/types/chat';

const MAX_PROMPT_CHARS = 8_000;
const MAX_HISTORY = 16;
const MAX_RECORDS = 80;

function isRecordSummary(value: unknown): value is AgroRecordSummary {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== 'string' || candidate.id.length === 0) return false;

  const optionalString = (key: string): boolean =>
    candidate[key] === undefined || typeof candidate[key] === 'string';
  const optionalNumber = (key: string): boolean =>
    candidate[key] === undefined || typeof candidate[key] === 'number';

  if (!optionalString('producerName')) return false;
  if (!optionalString('farmName')) return false;
  if (!optionalString('municipality')) return false;
  if (!optionalString('vereda')) return false;
  if (!optionalString('sector')) return false;
  if (!optionalNumber('quantity')) return false;
  if (!optionalString('quantityUnit')) return false;
  if (!optionalString('icaRegister')) return false;

  if (candidate.coordinates !== undefined) {
    if (typeof candidate.coordinates !== 'object' || candidate.coordinates === null) {
      return false;
    }
    const coords = candidate.coordinates as Record<string, unknown>;
    if (typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
      return false;
    }
  }

  return true;
}

export type ParseChatRequestResult =
  | { ok: true; value: AgroIAChatRequest }
  | { ok: false; error: string };

export function parseChatRequest(body: unknown): ParseChatRequestResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'El cuerpo debe ser un objeto JSON.' };
  }

  const candidate = body as Record<string, unknown>;
  if (typeof candidate.prompt !== 'string' || candidate.prompt.trim().length === 0) {
    return { ok: false, error: 'El campo "prompt" es obligatorio.' };
  }
  if (candidate.prompt.length > MAX_PROMPT_CHARS) {
    return { ok: false, error: 'El prompt supera el límite permitido.' };
  }

  let history: ChatMessage[] = [];
  if (candidate.history !== undefined) {
    if (!Array.isArray(candidate.history)) {
      return { ok: false, error: 'El campo "history" debe ser un arreglo.' };
    }
    const valid = candidate.history.filter(isChatMessage);
    history = valid
      .filter((msg) => msg.content.trim().length > 0)
      .slice(-MAX_HISTORY);
  }

  let dbRecords: AgroRecordSummary[] | undefined;
  if (candidate.dbRecords !== undefined) {
    if (!Array.isArray(candidate.dbRecords)) {
      return { ok: false, error: 'El campo "dbRecords" debe ser un arreglo.' };
    }
    dbRecords = candidate.dbRecords.filter(isRecordSummary).slice(0, MAX_RECORDS);
  }

  return {
    ok: true,
    value: {
      prompt: candidate.prompt.trim(),
      history,
      ...(dbRecords ? { dbRecords } : {}),
    },
  };
}
