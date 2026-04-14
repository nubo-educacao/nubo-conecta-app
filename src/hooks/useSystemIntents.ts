'use client';

/**
 * useSystemIntents — Dispara system intents contextuais ao backend da Cloudinha.
 *
 * Em QUALQUER mudança de rota, envia um system intent "page_context" ao backend.
 * O backend decide (via tabela system_intents no DB) se responde ou não.
 *
 * Quando o backend responde:
 *   - A resposta da Cloudinha (real, gerada pelo LLM) é armazenada como pendingMessage
 *   - O FAB exibe um badge com o contador de mensagens não lidas
 *   - Se o backend envia intent_metadata com open_drawer=true, o drawer abre após delay_ms
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { streamChat, type ChatMessage } from '@/services/chatService';

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
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Zerar badge quando drawer é aberto
  useEffect(() => {
    if (isDrawerOpen) {
      setUnreadCount(0);
      // Cancelar timer de abertura automática se o usuário já abriu manualmente
      if (openTimerRef.current) {
        clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
    }
  }, [isDrawerOpen]);

  useEffect(() => {
    // Evitar disparar 2x na mesma rota
    if (pathname === lastRouteRef.current) return;
    lastRouteRef.current = pathname;

    // Não disparar se não tem auth
    if (!userId || !accessToken) return;

    let cancelled = false;

    async function dispatchPageContext() {
      try {
        // Extrair ID do recurso (último segmento da URL)
        const segments = pathname.split('/').filter(Boolean);
        const resourceId = segments[segments.length - 1] || '';

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

        let hasContent = false;

        for await (const event of stream) {
          if (cancelled) break;

          // Resposta real da Cloudinha (gerada pelo LLM)
          if (event.type === 'text' && event.content) {
            // Acumular texto na última mensagem pendente ou criar nova
            setPendingMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && !hasContent) {
                // Primeira chunk — já criamos uma mensagem vazia? Não, criar agora.
              }
              if (hasContent && prev.length > 0) {
                // Acumular no último
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + event.content,
                };
                return updated;
              }
              // Primeira chunk — criar nova mensagem
              return [...prev, {
                id: genId(),
                sender: 'model' as const,
                content: event.content,
                timestamp: new Date(),
              }];
            });

            if (!hasContent) {
              hasContent = true;
              if (!isDrawerOpen) {
                setUnreadCount((n) => n + 1);
              }
            }
          }

          // Metadados do intent (open_drawer, delay_ms) — emitidos pelo backend pós-pipeline
          if (event.type === 'intent_metadata') {
            if (event.open_drawer && !isDrawerOpen) {
              const delay = event.delay_ms ?? 5000;
              openTimerRef.current = setTimeout(() => {
                onOpen();
                openTimerRef.current = null;
              }, delay);
            }
          }
        }
      } catch (e) {
        // System intents são silenciosos em caso de falha
        console.warn('[SystemIntent] Falha ao disparar page_context:', e);
      }
    }

    dispatchPageContext();

    return () => {
      cancelled = true;
      if (openTimerRef.current) {
        clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Consumir mensagens (para injetar no ChatDrawer quando abre)
  const consumeMessages = useCallback((): ChatMessage[] => {
    const msgs = [...pendingMessages];
    if (msgs.length > 0) {
      setPendingMessages([]);
    }
    return msgs;
  }, [pendingMessages]);

  return { pendingMessages, unreadCount, consumeMessages };
}
