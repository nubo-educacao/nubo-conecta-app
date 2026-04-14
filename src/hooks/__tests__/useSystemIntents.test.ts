// @vitest-environment jsdom
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSystemIntents } from '@/hooks/useSystemIntents';
import { vi, describe, beforeEach, it, expect, Mock } from 'vitest';
import { usePathname } from 'next/navigation';
import { streamChat } from '@/services/chatService';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

// Mock do streamChat
vi.mock('@/services/chatService', () => ({
  streamChat: vi.fn(),
}));

describe('useSystemIntents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispara page_context quando rota muda para /opportunities/[id]', async () => {
    (usePathname as Mock).mockReturnValue('/partner-opportunities/opp-123');

    // Simular resposta do backend com system_message
    (streamChat as Mock).mockImplementation(async function* () {
      yield { type: 'system_message', content: 'Oi! Vejo que está vendo esta oportunidade.', open_drawer: true };
    });

    const onOpen = vi.fn();
    const { result } = renderHook(() =>
      useSystemIntents({
        userId: 'user-123',
        profileId: 'profile-abc',
        sessionId: 'session-xyz',
        accessToken: 'token-123',
        isDrawerOpen: false,
        onOpen,
      })
    );

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(1);
      expect(result.current.pendingMessages).toHaveLength(1);
      expect(result.current.pendingMessages[0].content).toContain('Oi!');
    });

    // open_drawer=true deve ter chamado onOpen
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('NÃO dispara em rotas genéricas como /home ou /perfil', async () => {
    (usePathname as Mock).mockReturnValue('/perfil');

    const onOpen = vi.fn();
    renderHook(() =>
      useSystemIntents({
        userId: 'u', profileId: 'p', sessionId: 's', accessToken: 'tk',
        isDrawerOpen: false, onOpen,
      })
    );

    await new Promise((r) => setTimeout(r, 100));
    expect(streamChat).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('limpa unreadCount quando drawer é aberto', async () => {
    (usePathname as Mock).mockReturnValue('/opportunities/opp-456');

    (streamChat as Mock).mockImplementation(async function* () {
      yield { type: 'system_message', content: 'Olá!', open_drawer: false };
    });

    const { result, rerender } = renderHook(
      ({ isDrawerOpen }) =>
        useSystemIntents({
          userId: 'u', profileId: 'p', sessionId: 's', accessToken: 'tk',
          isDrawerOpen, onOpen: vi.fn(),
        }),
      { initialProps: { isDrawerOpen: false } }
    );

    await waitFor(() => expect(result.current.unreadCount).toBe(1));

    // Abrir o drawer
    rerender({ isDrawerOpen: true });
    expect(result.current.unreadCount).toBe(0);
  });
});
