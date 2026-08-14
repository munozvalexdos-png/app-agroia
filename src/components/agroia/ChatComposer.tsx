'use client';

import {
  useLayoutEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Loader2, Send } from 'lucide-react';

interface ChatComposerProps {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

const MIN_PX = 44;
const MAX_PX = 160;

export function ChatComposer({
  value,
  disabled,
  onChange,
  onSubmit,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(MAX_PX, Math.max(MIN_PX, el.scrollHeight))}px`;
  }, [value]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (disabled || value.trim().length === 0) return;
    onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (disabled || value.trim().length === 0) return;
      onSubmit();
    }
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <label htmlFor="agroia-composer" className="sr-only">
        Consulta agronómica
      </label>
      <textarea
        id="agroia-composer"
        ref={textareaRef}
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escriba su consulta. Enter envía · Shift+Enter nueva línea"
        className="flex-1 resize-none bg-slate-50 focus:bg-white text-slate-800 border border-slate-300 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Enviar consulta"
        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 sm:px-5 py-3 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 shrink-0"
      >
        {disabled ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        ) : (
          <Send className="w-4 h-4" aria-hidden />
        )}
        <span className="hidden sm:inline">Enviar</span>
      </button>
    </form>
  );
}
