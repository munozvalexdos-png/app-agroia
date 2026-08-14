'use client';

import { memo } from 'react';
import { Bot, Download, FileCode, FileSpreadsheet, FileText, Loader2, User } from 'lucide-react';
import { MarkdownContent } from '@/components/agroia/MarkdownContent';
import type { ChatMessage } from '@/lib/types/chat';

export type ChatExportFormat = 'pdf' | 'excel' | 'word';

export interface ChatMessageItemProps {
  message: ChatMessage;
  isStreaming: boolean;
  previousQuery?: string;
  onExport?: (message: ChatMessage, format: ChatExportFormat, previousQuery: string) => void;
}

function ChatMessageItemInner({
  message,
  isStreaming,
  previousQuery = '',
  onExport,
}: ChatMessageItemProps) {
  const isUser = message.role === 'user';
  const emptyStream = isStreaming && message.content.length === 0;
  const canExport =
    !isUser && !isStreaming && message.content.trim().length > 0 && Boolean(onExport);

  return (
    <article
      className={`flex gap-2.5 sm:gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-800 text-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-5 h-5" aria-hidden />
        </div>
      )}

      <div className={`max-w-[88%] sm:max-w-[80%] ${isUser ? 'items-end' : ''}`}>
        <div className="flex items-center gap-2 px-1 mb-1 text-[11px] text-slate-400">
          <span className="font-bold text-slate-600">
            {isUser ? 'Productor / Usuario' : 'AgroIA Tolima'}
          </span>
          <span aria-hidden>•</span>
          <time dateTime={message.createdAt}>{message.createdAt}</time>
        </div>

        <div
          className={
            isUser
              ? 'p-3.5 rounded-2xl rounded-tr-none bg-emerald-600 text-white text-sm leading-relaxed whitespace-pre-wrap'
              : 'p-3.5 rounded-2xl rounded-tl-none bg-slate-50 border border-slate-200'
          }
        >
          {emptyStream ? (
            <p className="flex items-center gap-2 text-emerald-700 font-semibold text-xs py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              AgroIA respondiendo en tiempo real…
            </p>
          ) : isUser ? (
            message.content
          ) : (
            <>
              <MarkdownContent text={message.content} />
              {isStreaming && (
                <span
                  className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom bg-emerald-500 animate-pulse"
                  aria-hidden
                />
              )}
            </>
          )}
        </div>

        {canExport && onExport ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 px-1">
            <span className="text-[11px] font-bold text-slate-400 mr-1 inline-flex items-center gap-1">
              <Download className="w-3 h-3" aria-hidden />
              Descargar respuesta:
            </span>
            <button
              type="button"
              onClick={() => onExport(message, 'pdf', previousQuery)}
              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1"
              title="Descargar este dictamen en PDF"
            >
              <FileText className="w-3 h-3" aria-hidden />
              PDF
            </button>
            <button
              type="button"
              onClick={() => onExport(message, 'excel', previousQuery)}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1"
              title="Descargar esta respuesta en Excel / CSV"
            >
              <FileSpreadsheet className="w-3 h-3" aria-hidden />
              Excel
            </button>
            <button
              type="button"
              onClick={() => onExport(message, 'word', previousQuery)}
              className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1"
              title="Descargar esta respuesta en Word"
            >
              <FileCode className="w-3 h-3" aria-hidden />
              Word
            </button>
          </div>
        ) : null}
      </div>

      {isUser && (
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-5 h-5" aria-hidden />
        </div>
      )}
    </article>
  );
}

export const ChatMessageItem = memo(ChatMessageItemInner);
ChatMessageItem.displayName = 'ChatMessageItem';
