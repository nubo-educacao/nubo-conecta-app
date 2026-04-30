// @vitest-environment jsdom
// TDD — Sprint 2.5: OpportunitiesClient behavioural tests.
// Cobre os contratos críticos:
//   1. Tab switch usa router.replace com ?tab= (NÃO push, sem histórico)
//   2. Aba "Para Você" exibe heading "Seus Matches" e lista de cards
//   3. Aba "Explorar Todas" renderiza ExploreClient (delegação correta)
//   4. Estado vazio em "Para Você" exibe mensagem
//   5. SwitchPill reflete visualmente a aba ativa via prop activeTab

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { expect as vitestExpect } from 'vitest';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
vitestExpect.extend(jestDomMatchers);

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/components/opportunities/OpportunityCard', () => ({
  default: ({ opportunity }: { opportunity: { title: string } }) => (
    <div data-testid="opportunity-card">{opportunity.title}</div>
  ),
}));

// ExploreClient stub — verificamos apenas que ele é montado na aba "explore"
vi.mock('../ExploreClient', () => ({
  default: () => <div data-testid="explore-client" />,
}));

// ─── Import DEPOIS dos mocks ──────────────────────────────────────────────────
import OpportunitiesClient from '../OpportunitiesClient';
import type { IUnifiedOpportunity, ExploreFilters } from '@/types/opportunities';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeOpp = (overrides: Partial<IUnifiedOpportunity> = {}): IUnifiedOpportunity => ({
  id:               'mec_001',
  title:            'Engenharia de Software',
  institution_name: 'UFABC',
  is_partner:       false,
  type:             'sisu',
  opportunity_type: 'sisu',
  category:         'public_universities',
  category_label:   'Universidades Públicas',
  location:         'SP',
  education_level:  'Graduação',
  badges:           [],
  created_at:       '2026-01-01T00:00:00Z',
  ...overrides,
});

const emptyFilters: ExploreFilters = {};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('OpportunitiesClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ── SwitchPill ─────────────────────────────────────────────────────────────

  it('renderiza os dois botões do SwitchPill', () => {
    render(
      <OpportunitiesClient
        opportunities={[]}
        activeTab="para-voce"
        filters={emptyFilters}
      />,
    );
    expect(screen.getByText('Para Você')).toBeDefined();
    expect(screen.getByText('Explorar Todas')).toBeDefined();
  });

  it('renderiza o título da página "Oportunidades"', () => {
    render(
      <OpportunitiesClient
        opportunities={[]}
        activeTab="para-voce"
        filters={emptyFilters}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Oportunidades' })).toBeDefined();
  });

  // ── Tab switch via router.replace ──────────────────────────────────────────

  it('clique em "Explorar Todas" chama router.replace com ?tab=explore (sem push)', () => {
    render(
      <OpportunitiesClient
        opportunities={[]}
        activeTab="para-voce"
        filters={emptyFilters}
      />,
    );

    fireEvent.click(screen.getByText('Explorar Todas'));

    expect(mockReplace).toHaveBeenCalledOnce();
    expect(mockReplace).toHaveBeenCalledWith('?tab=explore', { scroll: false });
  });

  it('clique em "Para Você" chama router.replace com ?tab=para-voce (sem push)', () => {
    render(
      <OpportunitiesClient
        opportunities={[]}
        activeTab="explore"
        filters={emptyFilters}
      />,
    );

    fireEvent.click(screen.getByText('Para Você'));

    expect(mockReplace).toHaveBeenCalledOnce();
    expect(mockReplace).toHaveBeenCalledWith('?tab=para-voce', { scroll: false });
  });

  // ── Aba "Para Você" ────────────────────────────────────────────────────────

  it('aba "para-voce" exibe heading "Seus Matches"', () => {
    render(
      <OpportunitiesClient
        opportunities={[makeOpp()]}
        activeTab="para-voce"
        filters={emptyFilters}
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Seus Matches' })).toBeDefined();
  });

  it('aba "para-voce" com lista vazia exibe mensagem de empty state', () => {
    render(
      <OpportunitiesClient
        opportunities={[]}
        activeTab="para-voce"
        filters={emptyFilters}
      />,
    );
    expect(screen.getByText('Nenhuma oportunidade encontrada.')).toBeDefined();
  });

  it('aba "para-voce" renderiza OpportunityCard para MEC', () => {
    render(
      <OpportunitiesClient
        opportunities={[makeOpp({ title: 'Direito UFMG' })]}
        activeTab="para-voce"
        filters={emptyFilters}
      />,
    );
    expect(screen.getByTestId('opportunity-card')).toBeDefined();
    expect(screen.getByText('Direito UFMG')).toBeDefined();
  });

  it('aba "para-voce" renderiza OpportunityCard para parceiros', () => {
    render(
      <OpportunitiesClient
        opportunities={[makeOpp({ is_partner: true, title: 'Bootcamp TechCorp', type: 'partner', opportunity_type: 'bootcamp' })]}
        activeTab="para-voce"
        filters={emptyFilters}
      />,
    );
    expect(screen.getByTestId('opportunity-card')).toBeDefined();
  });

  it('aba "para-voce" NÃO renderiza ExploreClient', () => {
    render(
      <OpportunitiesClient
        opportunities={[makeOpp()]}
        activeTab="para-voce"
        filters={emptyFilters}
      />,
    );
    expect(screen.queryByTestId('explore-client')).toBeNull();
  });

  // ── Aba "Explorar Todas" ───────────────────────────────────────────────────

  it('aba "explore" renderiza ExploreClient (delegação correta)', () => {
    render(
      <OpportunitiesClient
        opportunities={[makeOpp()]}
        activeTab="explore"
        filters={emptyFilters}
      />,
    );
    expect(screen.getByTestId('explore-client')).toBeDefined();
  });

  it('aba "explore" NÃO renderiza heading "Seus Matches"', () => {
    render(
      <OpportunitiesClient
        opportunities={[]}
        activeTab="explore"
        filters={emptyFilters}
      />,
    );
    expect(screen.queryByText('Seus Matches')).toBeNull();
  });
});
