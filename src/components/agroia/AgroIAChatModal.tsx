'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot,
  FileCode,
  FileSpreadsheet,
  FileText,
  Lightbulb,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import { ChatComposer } from '@/components/agroia/ChatComposer';
import {
  ChatMessageItem,
  type ChatExportFormat,
} from '@/components/agroia/ChatMessageItem';
import { queryAgronomicKnowledgeBase } from '@/lib/agroia/fallbackAdvice';
import {
  createMessageId,
  FREQUENT_QUERIES,
  formatClock,
  INITIAL_BOT_GREETING,
} from '@/lib/constants/chat';
import {
  exportToExcel,
  exportToPDF,
  exportToWord,
} from '@/lib/export/exportChatReport';
import { streamAgroIAChat } from '@/lib/network/streamChat';
import { AgroIAChatError, type AgroRecordSummary, type ChatMessage } from '@/lib/types/chat';

export interface AgroIAChatModalProps {
  open?: boolean;
  onClose?: () => void;
  /** Predios SIG opcionales inyectados al system prompt. */
  dbRecords?: readonly AgroRecordSummary[];
  /** `fullscreen` = PWA de campo; `modal` = overlay. */
  variant?: 'modal' | 'fullscreen';
}

function buildGreeting(): ChatMessage {
  return {
    id: 'msg-welcome',
    role: 'assistant',
    content: INITIAL_BOT_GREETING,
    createdAt: formatClock(),
  };
}

function previousUserQuery(messages: readonly ChatMessage[], botId: string): string {
  const index = messages.findIndex((msg) => msg.id === botId);
  if (index <= 0) return '';
  const previous = messages[index - 1];
  return previous?.role === 'user' ? previous.content : '';
}

export function AgroIAChatModal({
  open = true,
  onClose,
  dbRecords,
  variant = 'fullscreen',
}: AgroIAChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [buildGreeting()]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const sendingLock = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSending, open]);

  const resetChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    sendingLock.current = false;
    setIsSending(false);
    setStreamingId(null);
    setDraft('');
    setBanner(null);
    setMessages([buildGreeting()]);
  }, []);

  const exportMessage = useCallback(
    (message: ChatMessage, format: ChatExportFormat, query: string) => {
      const payload = {
        title: 'Dictamen Fitosanitario y Técnico AgroIA Tolima',
        query,
        responseText: message.content,
        timestamp: message.createdAt,
      };
      if (format === 'pdf') exportToPDF(payload);
      else if (format === 'excel') exportToExcel(payload);
      else exportToWord(payload);
    },
    [],
  );

  const exportSession = useCallback(
    (format: ChatExportFormat) => {
      const fullContent = messages
        .map(
          (msg) =>
            `[${msg.createdAt}] ${msg.role === 'user' ? 'PRODUCTOR' : 'AGROIA TOLIMA'}:\n${msg.content}`,
        )
        .join('\n\n----------------------------------------\n\n');
      const payload = {
        title: 'Informe Completo de Sesión AgroIA Tolima',
        query: 'Historial completo de consultas agropecuarias',
        responseText: fullContent,
        timestamp: new Date().toLocaleString('es-CO'),
      };
      if (format === 'pdf') exportToPDF(payload);
      else if (format === 'excel') exportToExcel(payload);
      else exportToWord(payload);
    },
    [messages],
  );

  const sendPrompt = useCallback(
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      if (prompt.length === 0 || sendingLock.current) return;

      sendingLock.current = true;
      setIsSending(true);
      setBanner(null);
      setDraft('');

      const userMsg: ChatMessage = {
        id: createMessageId('usr'),
        role: 'user',
        content: prompt,
        createdAt: formatClock(),
      };
      const botId = createMessageId('bot');
      const botMsg: ChatMessage = {
        id: botId,
        role: 'assistant',
        content: '',
        createdAt: formatClock(),
      };

      setMessages((prev) => [...prev, userMsg, botMsg]);
      setStreamingId(botId);

      const controller = new AbortController();
      abortRef.current = controller;

      const history = messages.filter((msg) => msg.content.trim().length > 0);

      try {
        let streamed = '';
        await streamAgroIAChat(
          {
            prompt,
            history,
            ...(dbRecords && dbRecords.length > 0 ? { dbRecords } : {}),
          },
          {
            onToken: (chunk) => {
              streamed += chunk;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === botId ? { ...msg, content: msg.content + chunk } : msg,
                ),
              );
            },
          },
          controller.signal,
        );

        if (streamed.trim().length === 0) {
          const fallback = queryAgronomicKnowledgeBase(prompt);
          setBanner('Gemini no devolvió texto. Se usó la base técnica local.');
          setMessages((prev) =>
            prev.map((msg) => (msg.id === botId ? { ...msg, content: fallback } : msg)),
          );
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        const message =
          error instanceof AgroIAChatError
            ? error.message
            : 'No fue posible completar la consulta. Verifique la señal e intente de nuevo.';
        const fallback = queryAgronomicKnowledgeBase(prompt);
        setBanner(`${message} Se muestra orientación técnica local.`);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botId
              ? {
                  ...msg,
                  content: msg.content.length > 0 ? msg.content : fallback,
                }
              : msg,
          ),
        );
      } finally {
        sendingLock.current = false;
        setIsSending(false);
        setStreamingId(null);
        abortRef.current = null;
      }
    },
    [dbRecords, messages],
  );

  if (!open) return null;

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-emerald-200 font-semibold hidden md:inline">
        Exportar sesión:
      </span>
      <button
        type="button"
        onClick={() => exportSession('pdf')}
        className="bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-700/60 px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
        title="Exportar conversación en PDF"
      >
        <FileText className="w-3.5 h-3.5 text-red-400" aria-hidden />
        PDF
      </button>
      <button
        type="button"
        onClick={() => exportSession('excel')}
        className="bg-emerald-950/90 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/60 px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
        title="Exportar conversación en Excel / CSV"
      >
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" aria-hidden />
        Excel
      </button>
      <button
        type="button"
        onClick={() => exportSession('word')}
        className="bg-blue-950/90 hover:bg-blue-900 text-blue-200 border border-blue-700/60 px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
        title="Exportar conversación en Word"
      >
        <FileCode className="w-3.5 h-3.5 text-blue-400" aria-hidden />
        Word
      </button>
      <button
        type="button"
        onClick={resetChat}
        disabled={isSending}
        title="Limpiar historial"
        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-700 bg-emerald-900 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-800 disabled:opacity-50"
      >
        <Trash2 className="w-3.5 h-3.5" aria-hidden />
        Limpiar
      </button>
      {variant === 'modal' && onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar chat"
          className="rounded-xl p-2 text-emerald-100 hover:bg-emerald-900"
        >
          <X className="w-5 h-5" aria-hidden />
        </button>
      ) : null}
    </div>
  );

  const header = (
    <header className="bg-emerald-950 text-white px-4 py-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 rounded-none sm:rounded-2xl">
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
          <Bot className="w-7 h-7 text-slate-950" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 id="agroia-title" className="text-lg sm:text-xl font-bold">
              AgroIA Tolima — Asistente Especializado
            </h1>
            <span className="bg-amber-400 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase">
              Gemini 2.5 AI
            </span>
          </div>
          <p className="text-xs text-emerald-200 mt-0.5">
            Consulta agronómica, ICA y subsidios departamentales
          </p>
        </div>
      </div>
      {headerActions}
    </header>
  );

  const frequent = (
    <div className="px-3 sm:px-4 py-3 bg-white border-b border-slate-200 shrink-0 sm:rounded-2xl sm:border">
      <p className="text-xs sm:text-sm font-bold text-slate-800 mb-2 inline-flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-amber-500" aria-hidden />
        Consultas frecuentes de productores tolimenses
      </p>
      <div className="flex flex-wrap gap-2">
        {FREQUENT_QUERIES.map((query) => (
          <button
            key={query.label}
            type="button"
            disabled={isSending}
            onClick={() => void sendPrompt(query.prompt)}
            className="bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-950 border border-slate-200 hover:border-emerald-300 font-medium px-3 py-1.5 rounded-2xl text-xs text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="mr-1.5" aria-hidden>
              {query.icon}
            </span>
            {query.label}
          </button>
        ))}
      </div>
    </div>
  );

  const thread = (
    <>
      {banner && (
        <div className="mx-3 sm:mx-4 mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <WifiOff className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          <p>{banner}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-5 min-h-0">
        {messages.map((message) => (
          <ChatMessageItem
            key={message.id}
            message={message}
            isStreaming={streamingId === message.id}
            previousQuery={previousUserQuery(messages, message.id)}
            onExport={exportMessage}
          />
        ))}
        <div ref={endRef} />
      </div>

      <footer className="border-t border-slate-200 bg-white px-3 sm:px-5 py-3 shrink-0 sm:rounded-b-2xl">
        <ChatComposer
          value={draft}
          disabled={isSending}
          onChange={setDraft}
          onSubmit={() => void sendPrompt(draft)}
        />
      </footer>
    </>
  );

  if (variant === 'fullscreen') {
    return (
      <main className="min-h-dvh bg-slate-100 p-3 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          {header}
          {frequent}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[60vh]">
            {thread}
          </section>
        </div>
      </main>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="agroia-title">
      <div className="flex flex-col w-full sm:max-w-3xl sm:max-h-[90vh] h-[100dvh] sm:h-auto sm:rounded-2xl bg-white shadow-2xl overflow-hidden">
        {header}
        {frequent}
        {thread}
      </div>
    </div>
  );
}
