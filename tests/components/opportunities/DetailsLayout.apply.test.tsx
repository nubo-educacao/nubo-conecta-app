// @vitest-environment jsdom
// NUB-RD-96 (TP-H §3 96a/96b/96g) — CTA real do DetailsLayout.handleApply.
//
// O que está sendo provado aqui (e não em teste de helper):
//   - a janela é pré-aberta DENTRO do gesto, antes de qualquer await;
//   - o evento é gravado ANTES de a janela ir para o portal oficial;
//   - erro / timeout do tracking nunca impedem a navegação;
//   - reabrir uma candidatura parceira `redirected` NÃO grava outro redirect.

import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { expect as vitestExpect } from 'vitest';
vitestExpect.extend(jestDomMatchers);

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Cadeia do supabase-js que sempre resolve vazio: o componente só consulta para
// preencher datas/campus/similares, nada disso importa para o CTA.
vi.mock('@/lib/supabase', () => {
  const chain: any = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === 'then') return (res: (v: unknown) => void) => res({ data: null, error: null });
        return () => chain;
      },
    },
  );
  return {
    supabase: {
      from: () => chain,
      auth: { getUser: async () => ({ data: { user: null } }) },
    },
  };
});

let mockUser: { id: string } | null = { id: 'auth-user-001' };
const mockOpenAuthModal = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, openAuthModal: mockOpenAuthModal }),
}));

vi.mock('@/contexts/ProfileContext', () => ({
  // activeProfileId diferente de user.id de propósito: o evento tem que usar
  // auth.uid() (RLS), nunca o perfil ativo.
  useProfile: () => ({ activeProfileId: 'profile-dependente-999' }),
}));

vi.mock('@/contexts/FavoritesContext', () => ({
  useFavorites: () => ({ isFavorited: () => false, toggleFavorite: vi.fn() }),
}));

const mockGetExistingApplication = vi.fn();
const mockCreateApplication = vi.fn();
vi.mock('@/app/(app)/oportunidades/[id]/actions', () => ({
  getExistingApplication: (...a: unknown[]) => mockGetExistingApplication(...a),
  createApplication: (...a: unknown[]) => mockCreateApplication(...a),
}));

// Server action: o ponto de observação do evento.
const mockTrackAndRedirect = vi.fn();
vi.mock('@/services/redirectService', () => ({
  trackAndRedirect: (...a: unknown[]) => mockTrackAndRedirect(...a),
}));

// Filhos pesados que não participam do CTA.
vi.mock('@/components/opportunities/OpportunityCard', () => ({ default: () => null }));
vi.mock('@/components/home/OpportunityCarousel', () => ({ default: () => null }));

import DetailsLayout from '@/components/opportunities/DetailsLayout';
import type { IUnifiedOpportunity } from '@/types/opportunities';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const PORTAL = 'https://acessounico.mec.gov.br/sisu';

const mecOpp = (over: Partial<IUnifiedOpportunity> = {}): IUnifiedOpportunity => ({
  id: 'mec_11111111-1111-1111-1111-111111111111',
  title: 'Engenharia de Software',
  institution_name: 'UFABC',
  is_partner: false,
  type: 'sisu',
  opportunity_type: 'sisu',
  category: 'public_universities',
  category_label: 'Universidades Públicas',
  location: 'SP',
  education_level: 'Graduação',
  badges: [],
  created_at: '2026-01-01T00:00:00Z',
  status: 'opened',
  external_redirect: { enabled: true, url: PORTAL },
  ...over,
});

const partnerOpp = (): IUnifiedOpportunity =>
  mecOpp({
    id: 'partner_22222222-2222-2222-2222-222222222222',
    is_partner: true,
    type: 'partner',
    external_redirect: { enabled: true, url: 'https://parceiro.example/inscricao' },
  });

function fakeWindow() {
  return { closed: false, opener: {}, location: { href: 'about:blank' } } as unknown as Window;
}

let openSpy: MockInstance<typeof window.open>;
let popup: Window;
const order: string[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  order.length = 0;
  mockUser = { id: 'auth-user-001' };
  mockGetExistingApplication.mockResolvedValue(null);
  mockTrackAndRedirect.mockImplementation(async () => {
    order.push('track');
    return { url: PORTAL };
  });
  popup = fakeWindow();
  // `href` observável: registra a ordem em que a janela foi navegada.
  let href = 'about:blank';
  Object.defineProperty(popup.location, 'href', {
    get: () => href,
    set: (v: string) => { order.push('navigate'); href = v; },
  });
  openSpy = vi.spyOn(window, 'open').mockImplementation((() => {
    order.push('open');
    return popup;
  }) as typeof window.open);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function renderAndClick(opp: IUnifiedOpportunity, props: { sourceSurface?: string } = {}) {
  render(<DetailsLayout opportunity={opp} {...props} />);
  // deixa os efeitos de montagem (datas, campus, application) assentarem
  await act(async () => {});
  const cta = await screen.findByRole('button', { name: /Quero me Candidatar|Candidatar Agora|Acessar Link/ });
  await act(async () => {
    fireEvent.click(cta);
  });
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('CTA MEC "Quero me Candidatar" — redirect rastreado', () => {
  it('pré-abre a janela no gesto, grava o evento e SÓ ENTÃO navega para o portal', async () => {
    await renderAndClick(mecOpp());

    expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank');
    expect(mockTrackAndRedirect).toHaveBeenCalledTimes(1);
    // gravado ANTES de abrir a URL do portal
    expect(order).toEqual(['open', 'track', 'navigate']);
    expect(popup.location.href).toBe(PORTAL);
  });

  it('o evento leva auth.uid (não o perfil ativo), MEC sem partner, id sintético e source apply:', async () => {
    await renderAndClick(mecOpp());

    expect(mockTrackAndRedirect).toHaveBeenCalledWith(
      'auth-user-001',                                   // user.id, não 'profile-dependente-999'
      null,                                              // MEC não tem partner_id
      PORTAL,                                            // destination_url do portal oficial
      'apply:oportunidade_detalhe',                      // sem origem conhecida
      'mec_11111111-1111-1111-1111-111111111111',        // unified_opportunity_id
    );
  });

  it('a superfície de origem entra no source (apply:<surface>)', async () => {
    await renderAndClick(mecOpp(), { sourceSurface: 'home_para_voce' });

    expect(mockTrackAndRedirect).toHaveBeenCalledWith(
      'auth-user-001', null, PORTAL, 'apply:home_para_voce', expect.any(String),
    );
  });

  it('erro do tracking NÃO impede abrir o portal', async () => {
    mockTrackAndRedirect.mockRejectedValue(new Error('RLS violation'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await renderAndClick(mecOpp());

    expect(popup.location.href).toBe(PORTAL);
  });

  it('timeout do tracking (1500 ms) NÃO impede abrir o portal', async () => {
    mockTrackAndRedirect.mockReturnValue(new Promise(() => {})); // pendurado
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<DetailsLayout opportunity={mecOpp()} />);
    await act(async () => {});
    const cta = await screen.findByRole('button', { name: /Quero me Candidatar/ });

    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(cta);
    });
    // a janela foi aberta, mas o portal ainda não: o tracking segura até o prazo
    expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank');
    expect(popup.location.href).toBe('about:blank');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(popup.location.href).toBe(PORTAL);
  });

  it('pop-up bloqueado (window.open → null): ainda registra e cai no fallback com a URL final', async () => {
    openSpy.mockReturnValueOnce(null).mockReturnValue(popup);

    await renderAndClick(mecOpp());

    expect(mockTrackAndRedirect).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenNthCalledWith(1, 'about:blank', '_blank');
    expect(openSpy).toHaveBeenNthCalledWith(2, PORTAL, '_blank');
  });

  it('sem redirect externo habilitado: não abre janela nem grava evento', async () => {
    await renderAndClick(mecOpp({ external_redirect: { enabled: false } }));

    expect(openSpy).not.toHaveBeenCalled();
    expect(mockTrackAndRedirect).not.toHaveBeenCalled();
  });
});

describe('usuário não logado', () => {
  it('abre o AuthModal, sem janela e sem evento', async () => {
    mockUser = null;

    await renderAndClick(mecOpp());

    expect(mockOpenAuthModal).toHaveBeenCalledWith('LOGIN');
    expect(openSpy).not.toHaveBeenCalled();
    expect(mockTrackAndRedirect).not.toHaveBeenCalled();
  });

  it('re-run pós-login (fora do gesto): o tracking acontece igual e a navegação usa o mesmo caminho', async () => {
    mockUser = null;
    const view = render(<DetailsLayout opportunity={mecOpp()} />);
    await act(async () => {});
    const cta = await screen.findByRole('button', { name: /Quero me Candidatar/ });
    await act(async () => {
      fireEvent.click(cta);
    });
    expect(mockTrackAndRedirect).not.toHaveBeenCalled();

    // login concluído: o efeito reexecuta handleApply sem gesto do usuário
    mockUser = { id: 'auth-user-001' };
    await act(async () => {
      view.rerender(<DetailsLayout opportunity={mecOpp()} />);
    });

    expect(mockTrackAndRedirect).toHaveBeenCalledTimes(1);
    expect(popup.location.href).toBe(PORTAL);
  });
});

describe('96b — candidatura parceira com status "redirected"', () => {
  it('reabrir o link NÃO grava novo redirect (o partner-forms já registrou partner_application)', async () => {
    mockGetExistingApplication.mockResolvedValue({
      id: 'app-1',
      status: 'redirected',
      redirect_url: 'https://parceiro.example/inscricao',
    });
    const direct = vi.spyOn(window, 'open').mockImplementation((() => null) as typeof window.open);

    render(<DetailsLayout opportunity={partnerOpp()} />);
    await act(async () => {});
    const cta = await screen.findByRole('button', { name: /Acessar Link de Inscrição/ });
    await act(async () => {
      fireEvent.click(cta);
    });

    expect(direct).toHaveBeenCalledWith('https://parceiro.example/inscricao', '_blank');
    expect(mockTrackAndRedirect).not.toHaveBeenCalled();
    // nem a pré-abertura do caminho MEC
    expect(direct).not.toHaveBeenCalledWith('about:blank', '_blank');
  });
});
