'use client';

// ChatMessageList — Sprint 03 Épico 1C
// Scrollable list of chat messages. Auto-scrolls to bottom on new messages.

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/services/chatService';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

export default function ChatMessageList({ messages, isStreaming }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  if (messages.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 px-4 py-4 overflow-y-auto flex-1">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className="max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
            style={{
              background:
                msg.sender === 'user'
                  ? 'linear-gradient(135deg, #38B1E4, #024F86)'
                  : 'rgba(255,255,255,0.85)',
              color: msg.sender === 'user' ? 'white' : '#3a424e',
              borderRadius:
                msg.sender === 'user'
                  ? '18px 18px 4px 18px'
                  : '18px 18px 18px 4px',
              border: msg.sender === 'model' ? '1px solid rgba(56,177,228,0.15)' : 'none',
              fontFamily: 'Montserrat, sans-serif',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            {msg.content || (
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
