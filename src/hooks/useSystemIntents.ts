'use client';

/**
 * useSystemIntents — Dispara system intents contextuais ao backend da Cloudinha.
 *
 * Em QUALQUER mudança de rota (ou quando auth ficar disponível), envia um
 * system intent "page_context" ao backend. O backend decide (via tabela
 * system_intents no DB) se responde ou não.
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

  // Rastreia qual rota+userId já foi disparado para evitar duplicatas
  // Formato: "userId::pathname"
  const dispatchedRef = useRef<string>('');
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Zerar badge quando drawer é aberto
  useEffect(() => {
    if (isDrawerOpen) {
      setUnreadCount(0);
      if (openTimerRef.current) {
        clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
    }
  }, [isDrawerOpen]);

  // Disparar quando pathname OU auth mudam — resolve race condition de auth carregando
  useEffect(() => {
    // Não disparar sem auth
    if (!userId || !accessToken) {
      console.log('[SystemIntent] Aguardando auth...', { userId: !!userId, token: !!accessToken });
      return;
    }

    // Chave única: só dispara 1x por rota+usuário
    const dispatchKey = `${userId}::${pathname}`;
    if (dispatchedRef.current === dispatchKey) return;
    dispatchedRef.current = dispatchKey;

    console.log('[SystemIntent] Disparando page_context para:', pathname);

    let cancelled = false;

    async function dispatchPageContext() {
      try {
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

          // Resposta real da Cloudinha (chunks de texto do LLM)
          if (event.type === 'text' && event.content) {
            setPendingMessages((prev) => {
              if (hasContent && prev.length > 0) {
                // Acumular no último chunk
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + event.content,
                };
                return updated;
              }
              // Primeiro chunk — criar nova mensagem
              return [...prev, {
                id: genId(),
                sender: 'model' as const,
                content: event.content!,
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

          // Metadados do intent — emitidos pelo backend pós-pipeline (NÃO vai pro agente)
          if (event.type === 'intent_metadata') {
            console.log('[SystemIntent] intent_metadata recebido:', event);
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
  // Intencionalmente inclui userId e accessToken para retentar quando auth carrega
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, userId, accessToken]);

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
