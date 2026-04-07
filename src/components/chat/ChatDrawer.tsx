'use client';

// ChatDrawer — Sprint 03 Épico 1C
// Responsive chat interface:
//   Mobile: bottom sheet that slides up from 40% height, expandable to full
//   Desktop: fixed side panel (right, 380px)

import { useEffect, useRef } from 'react';
import { X, CloudLightning } from 'lucide-react';
import { usePathname } from 'next/navigation';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';
import ConversationStarters from './ConversationStarters';
import ToolBadge from './ToolBadge';
import { useChat } from '@/hooks/useChat';
import { useConversationStarters } from '@/hooks/useConversationStarters';
import { useAuth } from '@/contexts/AuthContext';

interface ChatDrawerProps {
  onClose: () => void;
}

function genSessionId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const SESSION_KEY = 'nubo_chat_session';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return genSessionId();
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id = genSessionId();
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

export default function ChatDrawer({ onClose }: ChatDrawerProps) {
  const pathname = usePathname();
  const { user, session, setShowAuthModal } = useAuth();
  const sessionId = useRef(getOrCreateSessionId()).current;

  const { intro_message, starters } = useConversationStarters(pathname);

  const { messages, isStreaming, activeTool, suggestions, sendMessage } = useChat({
    userId: user?.id ?? '',
    profileId: user?.id ?? '',
    pageRoute: pathname,
    sessionId,
    accessToken: session?.access_token ?? '',
  });

  const hasMessages = messages.length > 0;

  function handleSend(input: string) {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    sendMessage(input);
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const showStarters = !hasMessages && starters.length > 0;
  const showSuggestions = hasMessages && !isStreaming && suggestions.length > 0;

  return (
    <>
      {/* Backdrop — mobile only */}
      <div
        className="fixed inset-0 z-40 bg-black/30 md:hidden backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={[
          'fixed z-50 flex flex-col',
          // Mobile: bottom sheet
          'bottom-0 left-0 right-0 rounded-t-3xl max-h-[85vh]',
          // Desktop: right side panel
          'md:bottom-6 md:right-6 md:left-auto md:w-[380px] md:rounded-3xl md:max-h-[600px] md:h-[600px]',
        ].join(' ')}
        style={{
          background: 'rgba(245,250,255,0.97)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          border: '1px solid rgba(56,177,228,0.2)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'rgba(56,177,228,0.15)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #38B1E4, #024F86)' }}
            >
              <CloudLightning size={16} color="white" />
            </div>
            <div>
              <p
                className="text-sm font-bold leading-none"
                style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
              >
                Cloudinha
              </p>
              <p
                className="text-[10px]"
                style={{ color: isStreaming ? '#38B1E4' : '#16a34a', fontFamily: 'Montserrat, sans-serif' }}
              >
                {isStreaming ? 'Pensando...' : 'Online'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/5"
            aria-label="Fechar chat"
          >
            <X size={18} style={{ color: '#707A7E' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          {hasMessages && (
            <ChatMessageList messages={messages} isStreaming={isStreaming} />
          )}

          {activeTool && <ToolBadge toolName={activeTool} />}

          {showStarters && (
            <div className="mt-auto">
              <ConversationStarters
                starters={starters}
                introMessage={intro_message}
                onSelect={handleSend}
              />
            </div>
          )}

          {showSuggestions && (
            <div className="px-4 pb-3">
              <p
                className="text-[10px] mb-2 font-medium"
                style={{ color: '#707A7E', fontFamily: 'Montserrat, sans-serif' }}
              >
                Sugestões:
              </p>
              <ConversationStarters
                starters={suggestions}
                onSelect={handleSend}
              />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 pt-2">
          <ChatInput
            onSend={handleSend}
            disabled={isStreaming}
            placeholder={user ? 'Digite sua mensagem...' : 'Entre para conversar com a Cloudinha...'}
          />
        </div>
      </div>
    </>
  );
}
