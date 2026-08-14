/**
 * Contratos del chat AgroIA. Sin `any`: el cliente y la ruta Edge
 * comparten este módulo para validar el payload en ambos lados.
 */

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

/** Resumen mínimo de un predio SIG (contexto opcional para Gemini). */
export interface AgroRecordSummary {
  id: string;
  producerName?: string;
  farmName?: string;
  municipality?: string;
  vereda?: string;
  sector?: string;
  quantity?: number;
  quantityUnit?: string;
  icaRegister?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface AgroIAChatRequest {
  prompt: string;
  history: readonly ChatMessage[];
  dbRecords?: readonly AgroRecordSummary[];
}

export interface AgroIAStreamChunk {
  text?: string;
  error?: string;
}

export type AgroIAChatErrorCode =
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'UNAVAILABLE'
  | 'UNAUTHORIZED'
  | 'BAD_REQUEST'
  | 'NETWORK'
  | 'UNKNOWN';

export class AgroIAChatError extends Error {
  readonly code: AgroIAChatErrorCode;
  readonly status: number;
  readonly retryable: boolean;

  constructor(
    message: string,
    code: AgroIAChatErrorCode,
    status: number,
    retryable: boolean,
  ) {
    super(message);
    this.name = 'AgroIAChatError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

export function isChatRole(value: unknown): value is ChatRole {
  return value === 'user' || value === 'assistant';
}

export function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    isChatRole(candidate.role) &&
    typeof candidate.content === 'string' &&
    typeof candidate.createdAt === 'string'
  );
}
