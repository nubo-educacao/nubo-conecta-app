'use client';

/**
 * useSystemIntents — Dispara system intents contextuais ao backend da Cloudinha.
 *
 * Detecta mudanças de rota e, quando a rota é relevante (detalhe de oportunidade),
 * envia um system intent ao pipeline para obter uma mensagem contextual da Cloudinha.
 *
 * O resultado é injetado no chat e pode disparar abertura automática do drawer
 * se a resposta do backend incluir open_drawer: true.
 */

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { streamChat, type ChatMessage } from '@/services/chatService';

// Rotas que disparam system intent automático
// Formato: regex para detectar rota
const INTENT_ROUTES: RegExp[] = [
  /^\/opportunities\/[^\/]+$/,
  /^\/partner-opportunities\/[^\/]+$/,
];

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface UseSystemIntentsOptions {
  userId: string;
  profileId: string;
  sessionId: string;
  accessToken: string;
  isDrawerOpen: boolean;
  onOpen: () => void;
}

interface UseSystemIntentsReturn {
  pendingMessages: ChatMessage[];
  unreadCount: number;
  consumeMessages: () => ChatMessage[];
}

export function useSystemIntents({
  userId,
  profileId,
  sessionId,
  accessToken,
  isDrawerOpen,
  onOpen,
}: UseSystemIntentsOptions): UseSystemIntentsReturn {
  const pathname = usePathname();
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastRouteRef = useRef<string>('');

  // Zerar badge quando drawer é aberto
  useEffect(() => {
    if (isDrawerOpen) {
      setUnreadCount(0);
    }
  }, [isDrawerOpen]);

  useEffect(() => {
    // Evitar disparar 2x na mesma rota
    if (pathname === lastRouteRef.current) return;
    lastRouteRef.current = pathname;

    // Verificar se é uma rota com intent automático
    const shouldDispatch = INTENT_ROUTES.some((pattern) => pattern.test(pathname));
    if (!shouldDispatch) return;

    // Extrair ID do recurso da URL
    const segments = pathname.split('/').filter(Boolean);
    const resourceId = segments[segments.length - 1];

    let cancelled = false;

    async function dispatchIntent() {
      try {
        const stream = streamChat(
          {
            chatInput: 'page_context',
            userId,
            active_profile_id: profileId,
            sessionId,
            intent_type: 'system_intent',
            ui_context: {
              current_page: pathname,
              page_data: { opportunity_id: resourceId },
            },
          },
          accessToken,
        );

        for await (const event of stream) {
          if (cancelled) break;

          if (event.type === 'system_message' && event.content) {
            const msg: ChatMessage = {
              id: genId(),
              sender: 'model',
              content: event.content,
              timestamp: new Date(),
            };

            setPendingMessages((prev) => [...prev, msg]);

            if (!isDrawerOpen) {
              setUnreadCount((n) => n + 1);
            }

            // Abrir drawer se backend pediu
            if ((event as any).open_drawer === true && !isDrawerOpen) {
              onOpen();
            }
          }
        }
      } catch (e) {
        // System intents são silenciosos em caso de falha (não interromper o usuário)
        console.warn('[SystemIntent] Falha ao disparar page_context:', e);
      }
    }

    dispatchIntent();

    return () => {
      cancelled = true;
    };
  // Roda quando a rota muda. isDrawerOpen é lido no momento da execução via closure.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Consumir mensagens (para injetar no ChatDrawer)
  const consumeMessages = (): ChatMessage[] => {
    const msgs = [...pendingMessages];
    if (msgs.length > 0) {
      setPendingMessages([]); // Só reseta se havia mensagens para não causar re-renders desnecessários
    }
    return msgs;
  };

  return { pendingMessages, unreadCount, consumeMessages };
}
