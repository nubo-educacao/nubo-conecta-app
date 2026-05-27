'use client';

// useChat — Sprint 03 Épico 1C
// Manages chat UI state: messages, streaming, tool activity, and follow-up suggestions.

import { useState, useCallback, useEffect } from 'react';
import { streamChat, type ChatMessage, type ChatEvent } from '@/services/chatService';
import { supabase } from '@/lib/supabase';

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface UseChatOptions {
  userId: string;
  profileId: string;
  pageRoute: string;
  sessionId: string;
  accessToken: string;
  initialMessages?: ChatMessage[];
}

export function useChat({
  userId,
  profileId,
  pageRoute,
  sessionId,
  accessToken,
  initialMessages = [],
}: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Carregar histórico da sessão ao montar o drawer
  useEffect(() => {
    if (!sessionId || !supabase) return;

    async function loadHistory() {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('id, sender, content, created_at')
          .eq('session_id', sessionId)
          .neq('sender', 'system')
          .order('created_at', { ascending: true });

        if (error || !data || data.length === 0) return;

        const historical: ChatMessage[] = data.map((row: { id: string; sender: string; content: string; created_at: string }) => ({
          id: row.id,
          sender: row.sender as 'user' | 'model',
          content: row.content,
          timestamp: new Date(row.created_at),
        }));

        setMessages((prev) => {
          // Evitar duplicatas: IDs do banco vs initialMessages
          const existingIds = new Set(prev.map((m) => m.id));
          const newHistorical = historical.filter((m) => !existingIds.has(m.id));
          if (newHistorical.length === 0) return prev;
          return [...newHistorical, ...prev];
        });
      } catch (e) {
        console.warn('[useChat] Falha ao carregar histórico:', e);
      }
    }

    loadHistory();
  // Executa apenas na montagem; sessionId não muda durante o ciclo de vida do drawer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed || isStreaming) return;

      const userMsg: ChatMessage = {
        id: genId(),
        sender: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      const modelMsgId = genId();
      const modelMsg: ChatMessage = {
        id: modelMsgId,
        sender: 'model',
        content: '',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, modelMsg]);
      setSuggestions([]);
      setIsStreaming(true);

      try {
        const stream = streamChat(
          {
            chatInput: trimmed,
            userId,
            active_profile_id: profileId,
            sessionId,
            intent_type: 'user_message',
            ui_context: { current_page: pageRoute },
          },
          accessToken,
        );

        for await (const event of stream) {
          applyEvent(event, modelMsgId);
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === modelMsgId
              ? {
                  ...m,
                  content:
                    'Desculpe, houve um erro de conexão. Tente novamente.',
                }
              : m,
          ),
        );
      } finally {
        setIsStreaming(false);
        setActiveTool(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, profileId, pageRoute, sessionId, accessToken, isStreaming],
  );

  function applyEvent(event: ChatEvent, modelMsgId: string) {
    switch (event.type) {
      case 'text':
        if (event.content) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === modelMsgId
                ? { ...m, content: m.content + event.content }
                : m,
            ),
          );
        }
        break;
      case 'tool_start':
        setActiveTool(event.tool ?? 'pesquisando');
        break;
      case 'tool_end':
        setActiveTool(null);
        break;
      case 'suggestions':
        setSuggestions(event.items ?? []);
        break;
      case 'error':
        setMessages((prev) =>
          prev.map((m) =>
            m.id === modelMsgId
              ? { ...m, content: event.message ?? 'Ocorreu um erro.' }
              : m,
          ),
        );
        break;
    }
  }

  return { messages, isStreaming, activeTool, suggestions, sendMessage };
}
