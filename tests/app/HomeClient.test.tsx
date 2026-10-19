// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { expect as vitestExpect } from 'vitest';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { render, screen } from '@testing-library/react';
import HomeClient from '@/app/HomeClient';

vitestExpect.extend(jestDomMatchers);

// Mock todos os componentes filhos
vi.mock('@/components/home/HeroSearch', () => ({ default: () => <div data-testid="hero-search" /> }));
vi.mock('@/components/home/OpportunityCarousel', () => ({
  default: ({ title, surface }: { title: string; surface?: string }) => (
    <div data-testid={`carousel-${title}`} data-surface={surface} />
  ),
}));
vi.mock('@/components/home/InstitutionCarousel', () => ({
  default: ({ surface }: { surface?: string }) => <div data-testid="institution-carousel" data-surface={surface} />,
}));
vi.mock('@/components/home/ImportantDates', () => ({
  default: () => <div data-testid="important-dates" />,
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false, setShowAuthModal: vi.fn() }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('@/hooks/useMatchResults', () => ({
  useMatchResults: () => ({ results: [], matchState: 'idle', error: null, runMatch: vi.fn(), loadExisting: vi.fn() }),
}));

describe('HomeClient — renderização dinâmica', () => {
  it('renderiza seções na ordem especificada', () => {
    const sections = [
      { id: '1', title: '', section_type: 'hero_search' as const, data_source: 'static' as const, display_order: 0, is_active: true, target_states: null, target_onboarding_status: null, config: {} },
      { id: '2', title: 'Novidades', section_type: 'opportunity_carousel' as const, data_source: 'recent_opportunities' as const, display_order: 1, is_active: true, target_states: null, target_onboarding_status: null, config: {}, opportunities: [{ id: 'opp1' }] },
    ];

    render(<HomeClient sections={sections as any} />);

    expect(screen.getByTestId('hero-search')).toBeInTheDocument();
    expect(screen.getByTestId('carousel-Novidades')).toBeInTheDocument();
  });

  it('NUB-RD-96: cada seção da home passa a sua própria superfície ao carrossel', () => {
    const base = { data_source: 'static' as const, display_order: 1, is_active: true, target_states: null, target_onboarding_status: null, config: {} };
    const sections = [
      { ...base, id: 'm', title: 'Para Você', section_type: 'match_carousel' as const, opportunities: [{ id: 'opp1' }] },
      { ...base, id: 'o', title: 'Novidades', section_type: 'opportunity_carousel' as const, opportunities: [{ id: 'opp2' }] },
      { ...base, id: 'i', title: '', section_type: 'institution_carousel' as const, institutions: [{ id: 'inst1' }] },
    ];

    render(<HomeClient sections={sections as any} />);

    // "Para Você" da home é distinguível do carrossel genérico
    expect(screen.getByTestId('carousel-Para Você').getAttribute('data-surface')).toBe('home_para_voce');
    expect(screen.getByTestId('carousel-Novidades').getAttribute('data-surface')).toBe('home_carrossel_oportunidades');
    expect(screen.getByTestId('institution-carousel').getAttribute('data-surface')).toBe('home_carrossel_instituicoes');
  });

  it('não renderiza carrossel se opportunities está vazio', () => {
    const sections = [
      { id: '1', title: 'Vazio', section_type: 'opportunity_carousel' as const, data_source: 'partner_opportunities' as const, display_order: 0, is_active: true, target_states: null, target_onboarding_status: null, config: {}, opportunities: [] },
    ];

    render(<HomeClient sections={sections as any} />);
    expect(screen.queryByTestId('carousel-Vazio')).not.toBeInTheDocument();
  });
});
