// @vitest-environment jsdom
// NUB-RD-96 (TP-H §3 96a/96b/96g) — CTA real do DetailsLayout.handleApply.
//
// O que está sendo provado aqui (e não em teste de helper):
//   - a janela é pré-aberta DENTRO do gesto, antes de qualquer await;
//   - o evento é gravado ANTES de a janela ir para o portal oficial;
//   - erro / timeout do tracking nunca impedem a navegação;
//   - reabrir uma candidatura parceira `redirected` NÃO grava outro redirect.

import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render as rtlRender, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
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

let mockShouldOpenDrawer = false;
const mockSetShouldOpenDrawer = vi.fn((value: boolean) => { mockShouldOpenDrawer = value; });
vi.mock('@/hooks/useSystemIntents', () => ({
  useSystemIntents: () => ({
    pendingMessages: [],
    unreadCount: 0,
    hasPriorityMessage: false,
    shouldOpenDrawer: mockShouldOpenDrawer,
    setShouldOpenDrawer: mockSetShouldOpenDrawer,
    consumeMessages: vi.fn(),
  }),
}));
vi.mock('@/components/chat/ChatDrawer', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <button onClick={onClose}>Fechar drawer</button>
  ),
}));

import DetailsLayout from '@/components/opportunities/DetailsLayout';
import ChatFAB from '@/components/chat/ChatFAB';
import { ChatVisibilityProvider } from '@/contexts/ChatVisibilityContext';
import type { IUnifiedOpportunity } from '@/types/opportunities';

function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: ChatVisibilityProvider });
}

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
  mockShouldOpenDrawer = false;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.dataset.testid === 'opportunity-cards-area') {
      return { left: 100, width: 800 } as DOMRect;
    }
    return { top: 0, height: 0, left: 0, width: 0 } as DOMRect;
  });
  order.length = 0;
  mockUser = { id: 'auth-user-001' };
  mockGetExistingApplication.mockResolvedValue(null);
  mockCreateApplication.mockReset();
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
  vi.unstubAllGlobals();
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
  it('aligns the desktop CTA with the padded cards area after resizing', async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
    let observer: TestResizeObserver | undefined;
    class TestResizeObserver implements ResizeObserver {
      constructor(private callback: ResizeObserverCallback) { observer = this; }
      observe() {}
      unobserve() {}
      disconnect() {}
      trigger() { this.callback([], this); }
    }
    vi.stubGlobal('ResizeObserver', TestResizeObserver);
    try {
      render(<DetailsLayout opportunity={mecOpp()} />);
      const area = screen.getByTestId('opportunity-cards-area');
      area.style.paddingLeft = '24px';
      area.style.paddingRight = '32px';
      let rect = { left: 120, width: 1200 };
      vi.spyOn(area, 'getBoundingClientRect').mockImplementation(() => rect as DOMRect);
      fireEvent.resize(window);
      const cta = screen.getByTestId('floating-apply-cta');
      await waitFor(() => expect(cta).toHaveStyle({ left: '144px', width: '1144px' }));

      rect = { left: 24, width: 976 };
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
      fireEvent.resize(window);
      await waitFor(() => expect(cta).toHaveStyle({ left: '48px', width: '920px' }));

      rect = { left: 40, width: 900 };
      observer?.trigger();
      await waitFor(() => expect(cta).toHaveStyle({ left: '64px', width: '844px' }));

      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
      fireEvent.resize(window);
      await waitFor(() => expect(screen.getByTestId('floating-apply-cta').style.width).toBe(''));
      rect = { left: 30, width: 708 };
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 768 });
      fireEvent.resize(window);
      await waitFor(() => expect(screen.getByTestId('floating-apply-cta')).toHaveStyle({
        left: '54px', width: '652px', visibility: 'visible',
      }));
      expect(document.querySelectorAll('[data-testid="floating-apply-cta"]')).toHaveLength(1);
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    }
  });

  it('renders the single floating CTA through a body portal with the desktop content width', async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    try {
      render(<DetailsLayout opportunity={mecOpp()} />);
      await act(async () => {});

      const cta = screen.getByTestId('floating-apply-cta');
      expect(cta.parentElement).toBe(document.body);
      expect(document.querySelectorAll('[data-testid="floating-apply-cta"]')).toHaveLength(1);
      await waitFor(() => expect(cta).toHaveStyle({ left: '100px', width: '800px', visibility: 'visible' }));
      expect(screen.getByRole('button', { name: /Quero me Candidatar/ })).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    }
  });

  it('keeps the CTA in the layout stacking context on mobile', async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    try {
      const { container } = render(<DetailsLayout opportunity={mecOpp()} />);
      await act(async () => {});

      const cta = screen.getByTestId('floating-apply-cta');
      expect(container.contains(cta)).toBe(true);
      expect(cta.parentElement).toBe(container);
      expect(cta.parentElement).not.toBe(document.body);
      expect(document.querySelectorAll('[data-testid="floating-apply-cta"]')).toHaveLength(1);
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    }
  });

  it('moves one CTA between the layout and portal when resizing across the breakpoint', async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    try {
      const { container } = render(<DetailsLayout opportunity={mecOpp()} />);
      await act(async () => {});
      expect(container.contains(screen.getByTestId('floating-apply-cta'))).toBe(true);

      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 768 });
      await act(async () => {
        fireEvent.resize(window);
      });
      expect(screen.getByTestId('floating-apply-cta').parentElement).toBe(document.body);
      expect(document.querySelectorAll('[data-testid="floating-apply-cta"]')).toHaveLength(1);

      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 767 });
      await act(async () => {
        fireEvent.resize(window);
      });
      expect(container.contains(screen.getByTestId('floating-apply-cta'))).toBe(true);
      expect(document.querySelectorAll('[data-testid="floating-apply-cta"]')).toHaveLength(1);
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    }
  });

  it.each([
    { width: 440, height: 956, footerFar: 1000, footerNear: 500, footerTooClose: 60 },
    { width: 390, height: 844, footerFar: 900, footerNear: 300, footerTooClose: 60 },
  ])('moves the mobile CTA above the footer at $width x $height', async ({
    width, height, footerFar, footerNear, footerTooClose,
  }) => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
    const footer = document.createElement('footer');
    document.body.appendChild(footer);
    let footerTop = footerFar;
    vi.spyOn(footer, 'getBoundingClientRect').mockImplementation(() =>
      ({ top: footerTop } as DOMRect),
    );

    try {
      const { container } = render(<DetailsLayout opportunity={mecOpp()} />);
      await act(async () => {});
      const cta = screen.getByTestId('floating-apply-cta');
      vi.spyOn(cta, 'getBoundingClientRect').mockReturnValue({ height: 56 } as DOMRect);
      const updatePosition = async () => {
        await act(async () => {
          fireEvent.scroll(window);
          await new Promise(resolve => setTimeout(resolve, 30));
        });
      };

      await updatePosition();
      expect(cta.parentElement).toBe(container);
      expect(cta).toHaveStyle({ bottom: '24px', visibility: 'visible' });

      footerTop = footerNear;
      await updatePosition();
      expect(cta).toHaveStyle({
        bottom: `${height - footerNear + 24}px`,
        visibility: 'visible',
      });

      footerTop = footerTooClose;
      await updatePosition();
      expect(cta).toHaveStyle({
        bottom: `${height - footerTooClose + 24}px`,
        visibility: 'hidden',
      });
      expect(document.querySelectorAll('[data-testid="floating-apply-cta"]')).toHaveLength(1);
    } finally {
      footer.remove();
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
    }
  });

  it('keeps the CTA above the footer on desktop and restores inline mobile positioning', async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    const footer = document.createElement('footer');
    document.body.appendChild(footer);
    let footerTop = 500;
    vi.spyOn(footer, 'getBoundingClientRect').mockImplementation(() =>
      ({ top: footerTop } as DOMRect),
    );

    try {
      const { container } = render(<DetailsLayout opportunity={mecOpp()} />);
      await act(async () => {});
      const cta = screen.getByTestId('floating-apply-cta');
      vi.spyOn(cta, 'getBoundingClientRect').mockReturnValue({ height: 56 } as DOMRect);
      await act(async () => {
        fireEvent.scroll(window);
        await new Promise(resolve => setTimeout(resolve, 30));
      });
      expect(cta).toHaveStyle({ bottom: '292px', visibility: 'visible' });

      footerTop = 50;
      await act(async () => {
        fireEvent.scroll(window);
        await new Promise(resolve => setTimeout(resolve, 30));
      });
      expect(cta).toHaveStyle({ visibility: 'hidden' });

      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
      await act(async () => {
        fireEvent.resize(window);
        await new Promise(resolve => setTimeout(resolve, 30));
      });
      const mobileCta = screen.getByTestId('floating-apply-cta');
      expect(container.contains(mobileCta)).toBe(true);
      vi.spyOn(mobileCta, 'getBoundingClientRect').mockReturnValue({ height: 56 } as DOMRect);
      await act(async () => {
        fireEvent.scroll(window);
        await new Promise(resolve => setTimeout(resolve, 30));
      });
      expect(mobileCta).toHaveStyle({ bottom: '742px', visibility: 'hidden' });
    } finally {
      footer.remove();
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    }
  });

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

    await act(async () => {
      fireEvent.click(cta);
    });
    // a janela foi aberta, mas o portal ainda não: o tracking segura até o prazo
    expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank');
    expect(popup.location.href).toBe('about:blank');

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1600));
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

describe('floating CTA and Cloudinha', () => {
  it.each([
    ['SiSU', mecOpp(), 'Quero me Candidatar', '#3092bb'],
    ['ProUni', mecOpp({ type: 'prouni', opportunity_type: 'prouni' }), 'Quero me Candidatar', '#3092bb'],
    ['parceira', partnerOpp(), 'Candidatar Agora', '#7030C2'],
  ])('preserves the CTA color for %s after the chat closes', async (_type, opportunity, label, color) => {
    render(<><DetailsLayout opportunity={opportunity} /><ChatFAB /></>);
    const button = await screen.findByRole('button', { name: label });
    expect(button).toHaveStyle({ background: color });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Cloudinha' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar drawer' }));
    expect(button).toBeVisible();
    expect(button).toHaveStyle({ background: color });
  });

  it.each([
    ['SUBMITTED', 'Já Candidatado', true],
    ['IN_REVIEW', 'Já Candidatado', true],
    ['APPROVED', 'Já Candidatado', true],
    ['REJECTED', 'Tentar Novamente', false],
    ['redirected', 'Acessar Link de Inscrição', false],
  ])('preserves application status %s after the chat closes', async (status, label, disabled) => {
    mockGetExistingApplication.mockResolvedValue({ id: 'app-1', status });
    render(<><DetailsLayout opportunity={partnerOpp()} /><ChatFAB /></>);
    const button = await screen.findByRole('button', { name: label });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Cloudinha' }));
    expect(button).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar drawer' }));
    expect(button).toBeVisible();
    if (disabled) expect(button).toBeDisabled();
    else expect(button).toBeEnabled();
  });

  it('preserves loading and error feedback when the chat opens and closes', async () => {
    let rejectApplication: (reason: Error) => void = () => {};
    mockCreateApplication.mockReturnValue(new Promise((_resolve, reject) => {
      rejectApplication = reject;
    }));
    render(<><DetailsLayout opportunity={partnerOpp()} /><ChatFAB /></>);
    const button = await screen.findByRole('button', { name: 'Candidatar Agora' });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Cloudinha' }));
    expect(button).not.toBeVisible();
    await act(async () => rejectApplication(new Error('test failure')));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar drawer' }));
    expect(button).toBeEnabled();
    expect(button).toHaveTextContent('Candidatar Agora');
    expect(screen.getByText('Erro ao iniciar candidatura. Tente novamente.')).toBeVisible();
  });

  it.each([390, 1024])('hides and restores the existing application state on manual and automatic opening at %ipx', async (width) => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    mockGetExistingApplication.mockResolvedValue({ id: 'app-1', status: 'DRAFT' });
    const ui = <><DetailsLayout opportunity={partnerOpp()} /><ChatFAB /></>;
    try {
      const view = render(ui);
      const button = await screen.findByRole('button', { name: 'Continuar Rascunho' });
      const cta = screen.getByTestId('floating-apply-cta');
      fireEvent.click(screen.getByRole('button', { name: 'Abrir Cloudinha' }));
      expect(cta).toHaveStyle({ visibility: 'hidden', pointerEvents: 'none' });
      expect(button).not.toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: 'Fechar Cloudinha' }));
      expect(cta).toBeVisible();
      expect(button).toHaveTextContent('Continuar Rascunho');

      mockShouldOpenDrawer = true;
      view.rerender(<><DetailsLayout opportunity={partnerOpp()} /><ChatFAB /></>);
      await waitFor(() => expect(cta).toHaveStyle({ visibility: 'hidden', pointerEvents: 'none' }));
      expect(mockSetShouldOpenDrawer).toHaveBeenCalledWith(false);
      fireEvent.click(screen.getByRole('button', { name: 'Fechar drawer' }));
      expect(cta).toBeVisible();
      expect(button).toHaveTextContent('Continuar Rascunho');
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    }
  });

  it('keeps the CTA hidden near the footer after closing the chat', async () => {
    const footer = document.createElement('footer');
    document.body.appendChild(footer);
    vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue({ top: 10 } as DOMRect);
    try {
      render(<><DetailsLayout opportunity={mecOpp()} /><ChatFAB /></>);
      const cta = screen.getByTestId('floating-apply-cta');
      await waitFor(() => expect(cta).toHaveStyle({
        bottom: `${window.innerHeight - 10 + 24}px`, visibility: 'hidden',
      }));
      fireEvent.click(screen.getByRole('button', { name: 'Abrir Cloudinha' }));
      fireEvent.click(screen.getByRole('button', { name: 'Fechar drawer' }));
      expect(cta).toHaveStyle({ visibility: 'hidden' });
    } finally {
      footer.remove();
    }
  });

  it('does not render a floating CTA for closed opportunities', async () => {
    render(<><DetailsLayout opportunity={mecOpp({ status: 'closed' })} /><ChatFAB /></>);
    await act(async () => {});
    expect(screen.queryByTestId('floating-apply-cta')).not.toBeInTheDocument();
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
