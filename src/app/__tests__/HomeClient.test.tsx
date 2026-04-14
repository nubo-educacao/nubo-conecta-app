import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomeClient from '@/app/HomeClient';

// Mock todos os componentes filhos
vi.mock('@/components/home/HeroSearch', () => ({ default: () => <div data-testid="hero-search" /> }));
vi.mock('@/components/home/OpportunityCarousel', () => ({
  default: ({ title }: { title: string }) => <div data-testid={`carousel-${title}`} />,
}));
vi.mock('@/components/home/InstitutionCarousel', () => ({
  default: () => <div data-testid="institution-carousel" />,
}));
vi.mock('@/components/home/ImportantDates', () => ({
  default: () => <div data-testid="important-dates" />,
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false, setShowAuthModal: vi.fn() }),
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

  it('não renderiza carrossel se opportunities está vazio', () => {
    const sections = [
      { id: '1', title: 'Vazio', section_type: 'opportunity_carousel' as const, data_source: 'partner_opportunities' as const, display_order: 0, is_active: true, target_states: null, target_onboarding_status: null, config: {}, opportunities: [] },
    ];

    render(<HomeClient sections={sections as any} />);
    expect(screen.queryByTestId('carousel-Vazio')).not.toBeInTheDocument();
  });
});
