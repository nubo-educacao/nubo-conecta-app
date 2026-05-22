'use client';

// ChatDrawer — Sprint 03 Épico 1C
// Responsive chat interface:
//   Mobile: bottom sheet that slides up from the bottom
//   Desktop: fixed side panel (right, 380px)

import { useEffect, useRef } from 'react';
import { X, CloudLightning } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';
import ConversationStarters from './ConversationStarters';
import ToolBadge from './ToolBadge';
import { useChat } from '@/hooks/useChat';
import { useConversationStarters } from '@/hooks/useConversationStarters';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/services/chatService';

interface ChatDrawerProps {
  onClose: () => void;
  initialMessages?: ChatMessage[];
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

export default function ChatDrawer({ onClose, initialMessages = [] }: ChatDrawerProps) {
  const pathname = usePathname();
  const { user, session, setShowAuthModal } = useAuth();
  const { activeProfileId } = useProfile();
  const sessionId = useRef(getOrCreateSessionId()).current;

  const { intro_message, starters } = useConversationStarters(pathname);

  const { messages, isStreaming, activeTool, suggestions, sendMessage } = useChat({
    userId: user?.id ?? '',
    profileId: activeProfileId ?? user?.id ?? '',
    pageRoute: pathname,
    sessionId,
    accessToken: session?.access_token ?? '',
    initialMessages,
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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Backdrop — visible on both mobile and desktop now */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-md pointer-events-auto cursor-pointer"
          onClick={onClose}
        />

        {/* Panel Wrapper for Animation */}
        <motion.div
          initial={{ 
            opacity: 0, 
            x: isMobile ? 0 : "100%", 
            y: isMobile ? "100%" : 0 
          }}
          animate={{ 
            opacity: 1, 
            x: 0, 
            y: 0 
          }}
          exit={{ 
            opacity: 0, 
            x: isMobile ? 0 : "100%", 
            y: isMobile ? "100%" : 0 
          }}
          transition={{ 
            type: 'spring', 
            damping: 28, 
            stiffness: 220 
          }}
          className={cn(
            "absolute z-50 flex flex-col pointer-events-auto",
            // Mobile: full screen with rounded top for organic feel
            "bottom-0 left-0 right-0 top-0 rounded-t-[32px] md:rounded-none h-full max-h-full",
            // Desktop: right side wizard (full height)
            "md:inset-y-0 md:right-0 md:left-auto md:w-[500px] md:h-full md:max-h-screen md:rounded-l-[40px] md:rounded-r-none",
            "bg-white/95 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.15)] border-l border-nubo-primary/10 overflow-hidden"
          )}
        >
          {/* Mobile Drag Indicator / Close handle */}
          <div className="w-full flex justify-center pt-4 pb-2 md:hidden">
            <div className="w-12 h-1.5 bg-nubo-line/60 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-nubo-line/50">
            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-nubo-primary to-nubo-primary-dark shadow-sm"
              >
                <CloudLightning size={16} color="white" />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-bold leading-tight text-nubo-text-head font-sans">
                  Cloudinha
                </p>
                <p className={cn(
                  "text-[10px] font-sans font-medium",
                  isStreaming ? 'text-nubo-primary' : 'text-green-600'
                )}>
                  {isStreaming ? 'Pensando...' : 'Online'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-black/5 text-nubo-nav-inactive hover:text-nubo-text-head"
              aria-label="Fechar chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-slate-50/30">
            {hasMessages && (
              <ChatMessageList messages={messages} isStreaming={isStreaming} onCloseDrawer={onClose} />
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
                <p className="text-[10px] mb-2 font-semibold text-nubo-nav-inactive font-sans uppercase tracking-wider">
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
          <div className="flex-shrink-0 pt-2 bg-white/80 border-t border-nubo-line/30 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-3">
            <ChatInput
              onSend={handleSend}
              disabled={isStreaming}
              placeholder={user ? 'Digite sua mensagem...' : 'Entre para conversar com a Cloudinha...'}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
