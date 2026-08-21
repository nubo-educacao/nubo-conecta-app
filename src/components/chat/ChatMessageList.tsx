'use client';

// ChatMessageList — Sprint 03 Épico 1C
// Scrollable list of chat messages. Auto-scrolls to bottom on new messages.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChatMessage } from '@/services/chatService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

function MessageBubble({ msg, onCloseDrawer }: { msg: ChatMessage; onCloseDrawer?: () => void }) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleCopy = async () => {
    if (!msg.content) return;
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
        style={{
          background:
            msg.sender === 'user'
              ? 'linear-gradient(135deg, #3092bb, #024F86)'
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
        {msg.content ? (
          <>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="mb-0.5">{children}</li>,
                h1: ({ children }) => <h1 className="text-base font-extrabold mb-1.5 mt-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold mb-1 mt-1.5">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xs font-bold mb-1 mt-1.5">{children}</h3>,
                code: ({ children }) => (
                  <code className={`font-mono px-1 py-0.5 rounded text-[11px] font-semibold ${msg.sender === 'user' ? 'bg-white/20' : 'bg-black/5'}`}>
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className={`font-mono p-2 rounded text-[11px] my-2 overflow-x-auto w-full ${msg.sender === 'user' ? 'bg-white/10' : 'bg-black/5'}`}>
                    {children}
                  </pre>
                ),
                a: ({ href, children }) => {
                  const isInternal = href?.startsWith('/');
                  if (isInternal) {
                    return (
                      <button
                        onClick={() => {
                          router.push(href!);
                          onCloseDrawer?.();
                        }}
                        className="underline font-semibold text-[#3092bb] hover:text-[#024F86] cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={msg.sender === 'user' ? 'text-white inline mr-1' : 'text-[#3092bb] inline mr-1'}>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        {children}
                      </button>
                    );
                  }
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`underline font-semibold ${
                        msg.sender === 'user'
                          ? 'text-white hover:text-sky-100'
                          : 'text-[#3092bb] hover:text-[#024F86]'
                      }`}
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {msg.content}
            </ReactMarkdown>
            
            <div className={`flex justify-end mt-2 pt-2 border-t ${msg.sender === 'user' ? 'border-white/20' : 'border-black/5'}`}>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider transition-colors ${
                  msg.sender === 'user'
                    ? 'text-white/70 hover:text-white'
                    : 'text-[#636E7C] hover:text-[#024F86]'
                }`}
                title="Copiar mensagem"
              >
                {copied ? (
                  <>
                    <Check size={12} strokeWidth={3} />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} strokeWidth={2.5} />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <span className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        )}
      </div>
    </div>
  );
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onCloseDrawer?: () => void;
}

export default function ChatMessageList({ messages, isStreaming, onCloseDrawer }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  if (messages.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 px-4 py-4 overflow-y-auto flex-1">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} msg={msg} onCloseDrawer={onCloseDrawer} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
