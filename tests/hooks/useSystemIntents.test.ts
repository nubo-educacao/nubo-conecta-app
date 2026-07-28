// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { useSystemIntents } from '@/hooks/useSystemIntents';
import { vi, describe, beforeEach, afterEach, it, expect, Mock } from 'vitest';
import { usePathname } from 'next/navigation';
import { streamChat } from '@/services/chatService';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

vi.mock('@/services/chatService', () => ({
  streamChat: vi.fn(),
}));

describe('useSystemIntents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // O hook também dispara o system intent 'tutorial' 1x por sessão (via
    // sessionStorage) no mount de qualquer usuário anônimo/autenticado. Sem isso,
    // o mock de streamChat (que não distingue chatInput) responde 2x por teste —
    // uma vez para page_context, outra para tutorial — inflando unreadCount etc.
    sessionStorage.setItem('nubo_tutorial_shown', 'true');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultProps = {
    userId: 'user-123',
    profileId: 'profile-abc',
    sessionId: 'session-xyz',
    accessToken: 'token-123',
    isDrawerOpen: false,
  };

  it('dispara page_context em qualquer rota (backend decide se responde)', async () => {
    vi.useRealTimers();
    (usePathname as Mock).mockReturnValue('/oportunidades/opp-123');

    // Backend responde com texto real do LLM + metadata
    (streamChat as Mock).mockImplementation(async function* () {
      yield { type: 'text', content: 'Olá! Vejo que você está explorando esta oportunidade.' };
      yield { type: 'intent_metadata', open_drawer: true, delay_ms: 5000 };
    });

    const { result } = renderHook(() =>
      useSystemIntents(defaultProps)
    );

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(1);
      expect(result.current.pendingMessages).toHaveLength(1);
      expect(result.current.pendingMessages[0].content).toContain('Olá!');
      // open_drawer:true abre o drawer automaticamente (shouldOpenDrawer), não é
      // o mesmo sinal que pulsate (hasPriorityMessage) — ver useSystemIntents.ts.
      expect(result.current.shouldOpenDrawer).toBe(true);
    });

    // streamChat deve ter sido chamado com page_context
    expect(streamChat).toHaveBeenCalledWith(
      expect.objectContaining({
        chatInput: 'page_context',
        intent_type: 'system_intent',
      }),
      'token-123',
    );
  });

  it('NÃO dispara sem auth (userId vazio)', async () => {
    vi.useRealTimers();
    (usePathname as Mock).mockReturnValue('/oportunidades/opp-456');

    renderHook(() =>
      useSystemIntents({ ...defaultProps, userId: '', accessToken: '' })
    );

    await new Promise((r) => setTimeout(r, 100));
    expect(streamChat).not.toHaveBeenCalled();
  });

  it('sinaliza shouldOpenDrawer se open_drawer=true', async () => {
    vi.useRealTimers();
    (usePathname as Mock).mockReturnValue('/oportunidades/opp-789');

    (streamChat as Mock).mockImplementation(async function* () {
      yield { type: 'text', content: 'Resposta real da Cloudinha' };
      yield { type: 'intent_metadata', open_drawer: true };
    });

    const { result } = renderHook(() =>
      useSystemIntents(defaultProps)
    );

    await waitFor(() => {
      expect(result.current.shouldOpenDrawer).toBe(true);
    });
  });

  it('sinaliza hasPriorityMessage se pulsate=true (sem abrir o drawer)', async () => {
    vi.useRealTimers();
    (usePathname as Mock).mockReturnValue('/oportunidades/opp-790');

    (streamChat as Mock).mockImplementation(async function* () {
      yield { type: 'text', content: 'Resposta real da Cloudinha' };
      yield { type: 'intent_metadata', open_drawer: false, pulsate: true };
    });

    const { result } = renderHook(() =>
      useSystemIntents(defaultProps)
    );

    await waitFor(() => {
      expect(result.current.hasPriorityMessage).toBe(true);
      expect(result.current.shouldOpenDrawer).toBe(false);
    });
  });

  it('limpa unreadCount quando drawer é aberto', async () => {
    vi.useRealTimers();
    (usePathname as Mock).mockReturnValue('/oportunidades/opp-456');

    (streamChat as Mock).mockImplementation(async function* () {
      yield { type: 'text', content: 'Olá!' };
    });

    const { result, rerender } = renderHook(
      ({ isDrawerOpen }) =>
        useSystemIntents({ ...defaultProps, isDrawerOpen }),
      { initialProps: { isDrawerOpen: false } }
    );

    await waitFor(() => expect(result.current.unreadCount).toBe(1));

    // Abrir o drawer
    rerender({ isDrawerOpen: true });
    expect(result.current.unreadCount).toBe(0);
  });

  it('quando backend não responde com texto (rota sem handler), ignora silenciosamente', async () => {
    vi.useRealTimers();
    (usePathname as Mock).mockReturnValue('/perfil');

    // Backend retorna system_ack (sem texto, sem intent_metadata) — JSON direto, não stream
    // Mas o frontend faz fetch como stream, então simular stream vazio
    (streamChat as Mock).mockImplementation(async function* () {
      // Nenhum evento de texto — backend retornou system_ack como JSON direto
    });

    const { result } = renderHook(() =>
      useSystemIntents(defaultProps)
    );

    await new Promise((r) => setTimeout(r, 100));
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.pendingMessages).toHaveLength(0);
    expect(result.current.hasPriorityMessage).toBe(false);
  });
});
