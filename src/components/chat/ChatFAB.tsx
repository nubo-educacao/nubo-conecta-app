'use client';

import { useState, useRef } from 'react';
import { CloudLightning, X } from 'lucide-react';
import ChatDrawer from './ChatDrawer';
import { useSystemIntents } from '@/hooks/useSystemIntents';
import { useAuth } from '@/contexts/AuthContext';
import { type ChatMessage } from '@/services/chatService';

const SESSION_KEY = 'nubo_chat_session';
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return Math.random().toString(36).slice(2);
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

export default function ChatFAB() {
  const { user, session } = useAuth();
  const sessionId = getOrCreateSessionId();

  // Snapshot das mensagens pendentes capturado no momento da abertura
  const [drawerMessages, setDrawerMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // pendingMessagesRef: sempre tem o valor mais atual do pendingMessages
  // Usado pelo onOpen para leitura síncrona sem depender de closure
  const pendingMessagesRef = useRef<ChatMessage[]>([]);

  const { pendingMessages, unreadCount } = useSystemIntents({
    userId: user?.id ?? '',
    profileId: user?.id ?? '',
    sessionId,
    accessToken: session?.access_token ?? '',
    isDrawerOpen: isOpen,
    onOpen: () => {
      // Lê o ref — sempre tem o valor atual, sem stale closure
      setDrawerMessages([...pendingMessagesRef.current]);
      setIsOpen(true);
    },
  });

  // Sincronizar ref com o state atual (síncrono, sem delay de useEffect)
  pendingMessagesRef.current = pendingMessages;

  function handleToggle() {
    if (isOpen) {
      setIsOpen(false);
    } else {
      // Abertura manual: captura snapshot atual das mensagens
      setDrawerMessages([...pendingMessagesRef.current]);
      setIsOpen(true);
    }
  }

  return (
    <>
      {/* FAB button */}
      <button
        onClick={handleToggle}
        className="fixed z-30 flex items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 76px)',
          right: '16px',
          width: 52,
          height: 52,
          background: isOpen
            ? 'rgba(255,255,255,0.9)'
            : 'linear-gradient(135deg, #38B1E4 0%, #024F86 100%)',
          border: isOpen ? '2px solid rgba(56,177,228,0.4)' : 'none',
          boxShadow: '0 8px 24px rgba(2,79,134,0.35)',
        }}
        aria-label={isOpen ? 'Fechar Cloudinha' : 'Abrir Cloudinha'}
      >
        {isOpen ? (
          <X size={22} style={{ color: '#38B1E4' }} />
        ) : (
          <CloudLightning size={22} color="white" />
        )}

        {/* Badge de notificação */}
        {!isOpen && unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              background: '#ef4444',
              color: 'white',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid white',
            }}
            aria-label={`${unreadCount} mensagens não lidas`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Drawer — drawerMessages é setado no mesmo ciclo que isOpen=true */}
      {isOpen && (
        <ChatDrawer
          onClose={() => setIsOpen(false)}
          initialMessages={drawerMessages}
        />
      )}
    </>
  );
}
