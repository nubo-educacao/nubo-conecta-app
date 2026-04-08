// @vitest-environment jsdom
// TDD — Sprint 2.5: ExploreClient behavioural tests.
// Cobre os contratos críticos:
//   1. SearchBar com debounce de 300ms escreve ?q= via router.replace
//   2. Clique em Category Pill escreve ?category= e preserva ?tab=explore
//   3. Pill "Todas" (value='') REMOVE o parâmetro ?category da URL
//   4. Estado vazio renderiza mensagem correta
//   5. Grid renderiza cards corretos por is_partner
//   6. Botão de filtros abre FilterModal

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { expect as vitestExpect } from 'vitest';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
vitestExpect.extend(jestDomMatchers);

// ─── Mocks: ANTES dos imports dos módulos que os consomem ─────────────────────

const mockReplace = vi.fn();
let mockSearchParamsString = 'tab=explore';

vi.mock('next/navigation', () => ({
  useRouter:      () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
}));

vi.mock('@/components/opportunities/CardOportunidades', () => ({
  default: ({ opportunity }: { opportunity: { title: string } }) => (
    <div data-testid="card-mec">{opportunity.title}</div>
  ),
}));

vi.mock('@/components/opportunities/CardOportunidadeParceira', () => ({
  default: ({ opportunity }: { opportunity: { title: string } }) => (
    <div data-testid="card-partner">{opportunity.title}</div>
  ),
}));

vi.mock('../FilterModal', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div role="dialog" aria-label="Filtros avançados">
        <button onClick={onClose}>Fechar modal</button>
      </div>
    ) : null,
}));

// ─── Import DEPOIS dos mocks ──────────────────────────────────────────────────
import ExploreClient from '../ExploreClient';
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

describe('ExploreClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockSearchParamsString = 'tab=explore';
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  // ── SearchBar ──────────────────────────────────────────────────────────────

  it('renderiza a SearchBar com o placeholder correto', () => {
    render(<ExploreClient opportunities={[]} filters={emptyFilters} />);
    expect(screen.getByPlaceholderText('Buscar oportunidades...')).toBeDefined();
  });

  it('NÃO chama router.replace antes do debounce de 300ms', () => {
    render(<ExploreClient opportunities={[]} filters={emptyFilters} />);
    const input = screen.getByPlaceholderText('Buscar oportunidades...');

    fireEvent.change(input, { target: { value: 'medicina' } });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('chama router.replace com ?q=medicina APÓS 300ms de debounce', () => {
    render(<ExploreClient opportunities={[]} filters={emptyFilters} />);
    const input = screen.getByPlaceholderText('Buscar oportunidades...');

    fireEvent.change(input, { target: { value: 'medicina' } });

    act(() => { vi.advanceTimersByTime(300); });

    expect(mockReplace).toHaveBeenCalledOnce();
    const [url, opts] = mockReplace.mock.calls[0];
    expect(url).toContain('q=medicina');
    expect(url).toContain('tab=explore');
    expect(opts).toEqual({ scroll: false });
  });

  it('debounce: apenas a ÚLTIMA digitação dispara o replace (cancela intermediários)', () => {
    render(<ExploreClient opportunities={[]} filters={emptyFilters} />);
    const input = screen.getByPlaceholderText('Buscar oportunidades...');

    fireEvent.change(input, { target: { value: 'm' } });
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.change(input, { target: { value: 'me' } });
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.change(input, { target: { value: 'medicina' } });
    act(() => { vi.advanceTimersByTime(300); });

    expect(mockReplace).toHaveBeenCalledOnce();
    expect(mockReplace.mock.calls[0][0]).toContain('q=medicina');
  });

  it('valor vazio na SearchBar REMOVE o parâmetro ?q da URL', () => {
    mockSearchParamsString = 'tab=explore&q=medicina';
    render(<ExploreClient opportunities={[]} filters={{ q: 'medicina' }} />);
    const input = screen.getByPlaceholderText('Buscar oportunidades...');

    fireEvent.change(input, { target: { value: '' } });
    act(() => { vi.advanceTimersByTime(300); });

    const [url] = mockReplace.mock.calls[0];
    expect(url).not.toContain('q=');
  });

  // ── Category Pills ─────────────────────────────────────────────────────────

  it('renderiza as 4 Category Pills', () => {
    render(<ExploreClient opportunities={[]} filters={emptyFilters} />);
    expect(screen.getByText('Todas')).toBeDefined();
    expect(screen.getByText('Bolsa Integral')).toBeDefined();
    expect(screen.getByText('Prouni')).toBeDefined();
    expect(screen.getByText('Sisu')).toBeDefined();
  });

  it('clique em "Sisu" chama router.replace com ?category=sisu preservando ?tab=explore', () => {
    render(<ExploreClient opportunities={[]} filters={emptyFilters} />);

    fireEvent.click(screen.getByText('Sisu'));

    expect(mockReplace).toHaveBeenCalledOnce();
    const [url, opts] = mockReplace.mock.calls[0];
    expect(url).toContain('category=sisu');
    expect(url).toContain('tab=explore');
    expect(opts).toEqual({ scroll: false });
  });

  it('clique em "Prouni" chama router.replace com ?category=prouni', () => {
    render(<ExploreClient opportunities={[]} filters={emptyFilters} />);

    fireEvent.click(screen.getByText('Prouni'));

    expect(mockReplace.mock.calls[0][0]).toContain('category=prouni');
  });

  it('clique em "Todas" REMOVE o parâmetro ?category da URL', () => {
    mockSearchParamsString = 'tab=explore&category=sisu';
    render(<ExploreClient opportunities={[]} filters={{ category: 'sisu' }} />);

    fireEvent.click(screen.getByText('Todas'));

    const [url] = mockReplace.mock.calls[0];
    expect(url).not.toContain('category=');
  });

  // ── Estado vazio ───────────────────────────────────────────────────────────

  it('renderiza mensagem de estado vazio quando não há oportunidades', () => {
    render(<ExploreClient opportunities={[]} filters={emptyFilters} />);
    expect(screen.getByText('Nenhuma oportunidade encontrada.')).toBeDefined();
  });

  // ── Grid de cards ──────────────────────────────────────────────────────────

  it('renderiza CardOportunidades para oportunidades MEC (is_partner=false)', () => {
    const opps = [makeOpp({ id: 'mec_001', title: 'Direito UFMG', is_partner: false })];
    render(<ExploreClient opportunities={opps} filters={emptyFilters} />);
    expect(screen.getByTestId('card-mec')).toBeDefined();
    expect(screen.queryByTestId('card-partner')).toBeNull();
  });

  it('renderiza CardOportunidadeParceira para oportunidades parceiras (is_partner=true)', () => {
    const opps = [makeOpp({ id: 'partner_001', title: 'Bootcamp TechCorp', is_partner: true, type: 'partner', opportunity_type: 'bootcamp' })];
    render(<ExploreClient opportunities={opps} filters={emptyFilters} />);
    expect(screen.getByTestId('card-partner')).toBeDefined();
    expect(screen.queryByTestId('card-mec')).toBeNull();
  });

  it('renderiza múltiplos cards sem duplicatas (key correta)', () => {
    const opps = [
      makeOpp({ id: 'mec_001', title: 'Engenharia' }),
      makeOpp({ id: 'mec_002', title: 'Medicina' }),
      makeOpp({ id: 'mec_003', title: 'Direito' }),
    ];
    render(<ExploreClient opportunities={opps} filters={emptyFilters} />);
    expect(screen.getAllByTestId('card-mec')).toHaveLength(3);
  });

  // ── FilterModal ────────────────────────────────────────────────────────────

  it('botão "Abrir filtros avançados" abre o FilterModal', () => {
    render(<ExploreClient opportunities={[]} filters={emptyFilters} />);
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByLabelText('Abrir filtros avançados'));

    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('fechar o FilterModal remove o dialog do DOM', () => {
    render(<ExploreClient opportunities={[]} filters={emptyFilters} />);

    fireEvent.click(screen.getByLabelText('Abrir filtros avançados'));
    fireEvent.click(screen.getByText('Fechar modal'));

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
