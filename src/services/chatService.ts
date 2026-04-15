// ChatService — Sprint 03 Épico 1C
// NDJSON streaming client for Cloudinha multi-agent pipeline.
// Must run client-side only (uses fetch + ReadableStream).

export interface ChatMessage {
  id: string;
  sender: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface ChatEvent {
  type: 'text' | 'tool_start' | 'tool_end' | 'suggestions' | 'error' | 'system_message' | 'intent_metadata';
  content?: string;
  tool?: string;
  args?: Record<string, unknown>;
  open_drawer?: boolean;
  delay_ms?: number;
  output?: string;
  items?: string[];
  message?: string;
}

export interface ChatRequest {
  chatInput: string;
  userId: string;
  active_profile_id: string;
  sessionId: string;
  intent_type?: 'user_message' | 'system_intent';
  ui_context?: {
    current_page: string;
    page_data?: Record<string, unknown>;
    form_state?: Record<string, unknown>;
    focused_field?: string;
  };
}

const CLOUDINHA_URL =
  process.env.NEXT_PUBLIC_CLOUDINHA_URL ?? 'http://localhost:8000';

export async function* streamChat(
  request: ChatRequest,
  token: string,
): AsyncGenerator<ChatEvent> {
  let response: Response;

  try {
    response = await fetch(`${CLOUDINHA_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
  } catch {
    yield { type: 'error', message: 'Não foi possível conectar à Cloudinha. Verifique sua conexão.' };
    return;
  }

  if (!response.ok) {
    yield {
      type: 'error',
      message: `Erro de conexão (${response.status}). Tente novamente.`,
    };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: 'error', message: 'Stream indisponível.' };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim()) {
          try {
            yield JSON.parse(line) as ChatEvent;
          } catch {
            // malformed NDJSON line — skip silently
          }
        }
      }
    }
    // flush any remaining buffer
    if (buffer.trim()) {
      try {
        yield JSON.parse(buffer) as ChatEvent;
      } catch {
        // ignore
      }
    }
  } finally {
    reader.releaseLock();
  }
}
