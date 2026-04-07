'use client';

// ChatInput — Sprint 03 Épico 1C
// Text input with send button. Supports Enter to submit, Shift+Enter for newline.

import { useState, useRef } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Digite sua mensagem...',
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div
      className="flex items-end gap-2 px-3 py-2 mx-4 mb-4 rounded-2xl"
      style={{
        background: 'rgba(255,255,255,0.85)',
        border: '1px solid rgba(56,177,228,0.25)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 resize-none bg-transparent outline-none text-sm py-1.5 max-h-[120px] leading-relaxed disabled:opacity-50"
        style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl mb-0.5 transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
        style={{
          background: canSend
            ? 'linear-gradient(135deg, #38B1E4, #024F86)'
            : 'rgba(56,177,228,0.2)',
        }}
        aria-label="Enviar"
      >
        <Send size={14} color={canSend ? 'white' : '#38B1E4'} />
      </button>
    </div>
  );
}
