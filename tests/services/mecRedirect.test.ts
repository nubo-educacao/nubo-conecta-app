// NUB-RD-96 (TP-H §3 96a/96g) — redirect MEC fail-open.
//
// Roda o trackAndRedirect REAL (só o supabase é falso), para provar o payload
// que de fato chega ao engagement_events — não um mock do helper.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: () => {} }),
}));

const mockInsert = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  REDIRECT_TRACKING_TIMEOUT_MS,
  trackRedirectFailOpen,
  navigateToDestination,
} from '@/services/mecRedirect';

const PARAMS = {
  userId: 'user-auth-001',
  unifiedOpportunityId: 'mec_abc-123',
  destinationUrl: 'https://acessounico.mec.gov.br/sisu',
  source: 'apply:oportunidade_detalhe',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  mockFrom.mockReturnValue({ insert: mockInsert });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('trackRedirectFailOpen — payload', () => {
  it('grava 1 redirect/mec_opportunity com unified_opportunity_id, destination_url e source', async () => {
    mockInsert.mockResolvedValue({ error: null });

    const result = await trackRedirectFailOpen(PARAMS);

    expect(result).toEqual({ tracked: true });
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith('engagement_events');
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'redirect',
      entity_type: 'mec_opportunity',
      entity_id: null,
      user_id: 'user-auth-001',
      unified_opportunity_id: 'mec_abc-123',
      destination_url: 'https://acessounico.mec.gov.br/sisu',
      source: 'apply:oportunidade_detalhe',
    }));
  });

  it('não escreve na tabela legada (a FK external_redirect_clicks exige parceiro)', async () => {
    mockInsert.mockResolvedValue({ error: null });
    await trackRedirectFailOpen(PARAMS);
    expect(mockFrom).not.toHaveBeenCalledWith('external_redirect_clicks');
  });

  it('o payload não inventa verified_since nem cobertura', async () => {
    mockInsert.mockResolvedValue({ error: null });
    await trackRedirectFailOpen(PARAMS);
    const payload = mockInsert.mock.calls[0][0];
    expect(Object.keys(payload)).not.toContain('verified_since');
    expect(Object.keys(payload)).not.toContain('coverage');
  });

  it('event_id duplicado (23505) conta como registrado — é a idempotência', async () => {
    mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });
    await expect(trackRedirectFailOpen(PARAMS)).resolves.toEqual({ tracked: true });
  });
});

describe('trackRedirectFailOpen — fail-open', () => {
  it('erro do insert (ex.: RLS) NÃO propaga: devolve tracked=false e nunca lança', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'RLS violation' } });

    const result = await trackRedirectFailOpen(PARAMS);

    expect(result).toEqual({ tracked: false, reason: 'error' });
  });

  it('exceção do server action NÃO propaga', async () => {
    mockInsert.mockRejectedValue(new Error('network down'));

    const result = await trackRedirectFailOpen(PARAMS);

    expect(result).toEqual({ tracked: false, reason: 'error' });
  });

  it('timeout curto: tracking pendurado resolve em 1500 ms, sem esperar o insert', async () => {
    vi.useFakeTimers();
    mockInsert.mockReturnValue(new Promise(() => {})); // nunca resolve

    expect(REDIRECT_TRACKING_TIMEOUT_MS).toBe(1500);

    let settled: unknown = null;
    const pending = trackRedirectFailOpen(PARAMS).then((r) => { settled = r; });

    await vi.advanceTimersByTimeAsync(REDIRECT_TRACKING_TIMEOUT_MS - 1);
    expect(settled).toBeNull();

    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(settled).toEqual({ tracked: false, reason: 'timeout' });
  });

  it('sucesso antes do prazo não deixa timer pendente', async () => {
    vi.useFakeTimers();
    mockInsert.mockResolvedValue({ error: null });

    await trackRedirectFailOpen(PARAMS);

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('navigateToDestination', () => {
  const URL_ = 'https://acessounico.mec.gov.br/sisu';

  it('janela pré-aberta: navega ela, sem abrir outra nem trocar a aba atual', () => {
    const win = { closed: false, location: { href: 'about:blank' } } as unknown as Window;
    const env = { open: vi.fn(), assign: vi.fn() };

    navigateToDestination(win, URL_, env);

    expect(win.location.href).toBe(URL_);
    expect(env.open).not.toHaveBeenCalled();
    expect(env.assign).not.toHaveBeenCalled();
  });

  it('pop-up bloqueado (null): tenta window.open com a URL final', () => {
    const env = { open: vi.fn().mockReturnValue({} as Window), assign: vi.fn() };

    navigateToDestination(null, URL_, env);

    expect(env.open).toHaveBeenCalledWith(URL_, '_blank');
    expect(env.assign).not.toHaveBeenCalled();
  });

  it('pop-up bloqueado de novo: último recurso é navegar a aba atual', () => {
    const env = { open: vi.fn().mockReturnValue(null), assign: vi.fn() };

    navigateToDestination(null, URL_, env);

    expect(env.assign).toHaveBeenCalledWith(URL_);
  });

  it('janela pré-aberta que o usuário fechou conta como bloqueada', () => {
    const win = { closed: true, location: { href: 'about:blank' } } as unknown as Window;
    const env = { open: vi.fn().mockReturnValue(null), assign: vi.fn() };

    navigateToDestination(win, URL_, env);

    expect(env.assign).toHaveBeenCalledWith(URL_);
  });
});
