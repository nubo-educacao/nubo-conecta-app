// @vitest-environment jsdom
// NUB-RD-96 (TP-H §3 96c/96d/96f) — o clique carrega a MESMA superfície do view.
//
// card_view  → record_card_views grava `source = 'view:' || surface`
// card_click → registerPartnerClick grava `p_source = 'click:' || surface`
// Se as duas pontas divergirem, o admin não consegue cruzar view × clique.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { expect as vitestExpect } from 'vitest';
vitestExpect.extend(jestDomMatchers);

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

let mockUser: { id: string } | null = { id: 'auth-user-001' };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, setShowAuthModal: vi.fn() }),
}));

vi.mock('@/contexts/FavoritesContext', () => ({
  useFavorites: () => ({ isFavorited: () => false, toggleFavorite: vi.fn() }),
}));

// Captura o alvo do card_view exatamente como o componente o monta.
const viewTargets: Array<{ surface: string; unifiedOpportunityId: string }> = [];
vi.mock('@/hooks/useCardView', () => ({
  useViewSubject: () => 'auth-user-001',
  useCardView: (target: { surface: string; unifiedOpportunityId: string }) => {
    viewTargets.push(target);
    return { current: null };
  },
}));

const mockRegisterClick = vi.fn();
vi.mock('@/services/partnersClickService', () => ({
  registerPartnerClick: (...a: unknown[]) => mockRegisterClick(...a),
}));

import OpportunityCard from '@/components/opportunities/OpportunityCard';
import { clickSource } from '@/lib/surfaces';
import type { IUnifiedOpportunity } from '@/types/opportunities';

const opp = (over: Partial<IUnifiedOpportunity> = {}): IUnifiedOpportunity => ({
  id: 'mec_11111111-1111-1111-1111-111111111111',
  title: 'Direito UFMG',
  institution_name: 'UFMG',
  is_partner: false,
  type: 'sisu',
  opportunity_type: 'sisu',
  category: 'public_universities',
  category_label: 'Universidades Públicas',
  location: 'MG',
  education_level: 'Graduação',
  badges: [],
  created_at: '2026-01-01T00:00:00Z',
  status: 'opened',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  viewTargets.length = 0;
  mockUser = { id: 'auth-user-001' };
  mockRegisterClick.mockResolvedValue({ error: null });
});

afterEach(() => cleanup());

function clickCard() {
  fireEvent.click(screen.getByText('Direito UFMG'));
}

describe('OpportunityCard — superfície do clique = superfície do view', () => {
  it.each([
    'home_para_voce',
    'home_carrossel_oportunidades',
    'oportunidades_para_voce',
    'oportunidades_explorar',
    'detalhe_similares',
    'partner_forms_sugestoes',
    'perfil_favoritos',
  ])('surface=%s: view e click usam o mesmo valor', (surface) => {
    render(<OpportunityCard opportunity={opp()} surface={surface} />);
    clickCard();

    const viewSurface = viewTargets[0].surface;
    expect(viewSurface).toBe(surface);

    const [, options] = mockRegisterClick.mock.calls[0] as [string | null, { surface: string; unifiedOpportunityId: string }];
    expect(options.surface).toBe(viewSurface);
    expect(options.unifiedOpportunityId).toBe(viewTargets[0].unifiedOpportunityId);
    // p_source gravado = click:<a mesma surface do view>
    expect(clickSource(options.surface)).toBe(`click:${viewSurface}`);
  });

  it('sem prop surface, view e click continuam alinhados (ambos "unknown")', () => {
    render(<OpportunityCard opportunity={opp()} />);
    clickCard();

    const [, options] = mockRegisterClick.mock.calls[0] as [string | null, { surface?: string }];
    expect(options.surface).toBe(viewTargets[0].surface);
  });

  it('card de parceiro repassa a surface e o partnerId', () => {
    render(
      <OpportunityCard
        opportunity={opp({ id: 'partner_22222222-2222-2222-2222-222222222222', is_partner: true, type: 'partner' })}
        surface="home_para_voce"
      />,
    );
    clickCard();

    expect(mockRegisterClick).toHaveBeenCalledWith(
      '22222222-2222-2222-2222-222222222222',
      expect.objectContaining({ surface: 'home_para_voce' }),
    );
  });
});

describe('OpportunityCard — superfície de origem até o detalhe (96f)', () => {
  it('o link de detalhe leva ?from=<surface>', () => {
    render(<OpportunityCard opportunity={opp()} surface="home_para_voce" />);
    clickCard();

    expect(mockPush).toHaveBeenCalledWith(
      '/oportunidades/mec_11111111-1111-1111-1111-111111111111?from=home_para_voce',
    );
  });

  it('sem surface conhecida não acrescenta ?from (rota limpa, sem "unknown" na URL)', () => {
    render(<OpportunityCard opportunity={opp()} />);
    clickCard();

    expect(mockPush).toHaveBeenCalledWith('/oportunidades/mec_11111111-1111-1111-1111-111111111111');
  });

  it('usuário não logado: registra o clique, abre o modal e não navega', () => {
    mockUser = null;
    render(<OpportunityCard opportunity={opp()} surface="home_para_voce" />);
    clickCard();

    expect(mockRegisterClick).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
