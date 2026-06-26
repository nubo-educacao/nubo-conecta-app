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
 *   - Se o backend envia intent_metadata com open_drawer=true, sinaliza hasPriorityMessage
 *     para o FAB exibir animação de pulso — NÃO abre o drawer automaticamente
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
}

interface UseSystemIntentsReturn {
  pendingMessages: ChatMessage[];
  unreadCount: number;
  hasPriorityMessage: boolean;
  shouldOpenDrawer: boolean;
  setShouldOpenDrawer: (v: boolean) => void;
  consumeMessages: () => ChatMessage[];
}

export function useSystemIntents({
  userId,
  profileId,
  sessionId,
  accessToken,
  isDrawerOpen,
}: UseSystemIntentsOptions): UseSystemIntentsReturn {
  const pathname = usePathname();
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasPriorityMessage, setHasPriorityMessage] = useState(false);
  const [shouldOpenDrawer, setShouldOpenDrawer] = useState(false);

  // Rastreia qual rota+userId já foi disparado para evitar duplicatas
  // Formato: "userId::pathname"
  const dispatchedRef = useRef<string>('');

  // Zerar badge e prioridade quando drawer é aberto
  useEffect(() => {
    if (isDrawerOpen) {
      setUnreadCount(0);
      setHasPriorityMessage(false);
      setShouldOpenDrawer(false);
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
              setShouldOpenDrawer(true);
            } else if (event.pulsate && !isDrawerOpen) {
              setHasPriorityMessage(true);
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
    };
  // Intencionalmente inclui userId e accessToken para retentar quando auth carrega
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, userId, accessToken]);

  // Escutar CustomEvents do PartnerFormEngine (step_change, validation_error)
  useEffect(() => {
    if (!userId || !accessToken) return;

    const handleCloudinhaIntent = async (e: Event) => {
      const { type: intentType, metadata } = (e as CustomEvent).detail ?? {};
      if (!intentType || !['step_change', 'validation_error', 'welcome_back', 'submit'].includes(intentType)) return;

      console.log('[SystemIntent] CustomEvent recebido:', intentType, metadata);
      let cancelled = false;

      try {
        const stream = streamChat(
          {
            chatInput: intentType,
            userId,
            active_profile_id: profileId,
            sessionId,
            intent_type: 'system_intent',
            ui_context: { current_page: pathname, page_data: metadata ?? {} },
          },
          accessToken,
        );

        let hasContent = false;
        for await (const event of stream) {
          if (cancelled) break;
          if (event.type === 'text' && event.content) {
            setPendingMessages((prev) => {
              if (hasContent && prev.length > 0) {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + event.content,
                };
                return updated;
              }
              return [...prev, { id: genId(), sender: 'model' as const, content: event.content!, timestamp: new Date() }];
            });
            if (!hasContent) {
              hasContent = true;
              if (!isDrawerOpen) setUnreadCount((n) => n + 1);
            }
          }
          if (event.type === 'intent_metadata') {
            if (event.open_drawer && !isDrawerOpen) {
              setShouldOpenDrawer(true);
            } else if (event.pulsate && !isDrawerOpen) {
              setHasPriorityMessage(true);
            }
          }
        }
      } catch (err) {
        console.warn('[SystemIntent] Falha ao processar CustomEvent:', err);
      }

      return () => { cancelled = true; };
    };

    window.addEventListener('cloudinha-intent', handleCloudinhaIntent);
    return () => window.removeEventListener('cloudinha-intent', handleCloudinhaIntent);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, accessToken]);

  // Tutorial para usuários anônimos: dispara 1x por sessão via sessionStorage
  useEffect(() => {
    const TUTORIAL_KEY = 'nubo_tutorial_shown';
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(TUTORIAL_KEY)) return;

    sessionStorage.setItem(TUTORIAL_KEY, 'true');

    // UUID nulo é aceito pelo backend como sentinela para usuários anônimos
    const ANON_UUID = '00000000-0000-0000-0000-000000000000';
    const effectiveUserId = userId || ANON_UUID;
    const effectiveProfileId = profileId || ANON_UUID;

    let cancelled = false;

    async function dispatchTutorial() {
      try {
        const stream = streamChat(
          {
            chatInput: 'tutorial',
            userId: effectiveUserId,
            active_profile_id: effectiveProfileId,
            sessionId,
            intent_type: 'system_intent',
            ui_context: { current_page: pathname },
          },
          accessToken,
        );

        let hasContent = false;
        for await (const event of stream) {
          if (cancelled) break;
          if (event.type === 'text' && event.content) {
            setPendingMessages((prev) => {
              if (hasContent && prev.length > 0) {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + event.content,
                };
                return updated;
              }
              return [...prev, { id: genId(), sender: 'model' as const, content: event.content!, timestamp: new Date() }];
            });
            if (!hasContent) {
              hasContent = true;
              if (!isDrawerOpen) setUnreadCount((n) => n + 1);
            }
          }
          if (event.type === 'intent_metadata') {
            if (event.open_drawer && !isDrawerOpen) {
              setShouldOpenDrawer(true);
            } else if (event.pulsate && !isDrawerOpen) {
              setHasPriorityMessage(true);
            }
          }
        }
      } catch (e) {
        console.warn('[SystemIntent] Falha ao disparar tutorial:', e);
      }
    }

    dispatchTutorial();
    return () => { cancelled = true; };
  // Executa apenas 1x na montagem — sessionStorage garante deduplicação entre renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Consumir mensagens (para injetar no ChatDrawer quando abre)
  const consumeMessages = useCallback((): ChatMessage[] => {
    const msgs = [...pendingMessages];
    if (msgs.length > 0) {
      setPendingMessages([]);
    }
    return msgs;
  }, [pendingMessages]);

  return { 
    pendingMessages, 
    unreadCount, 
    hasPriorityMessage,
    shouldOpenDrawer,
    setShouldOpenDrawer,
    consumeMessages 
  };
}
