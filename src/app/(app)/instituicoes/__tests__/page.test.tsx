// @vitest-environment jsdom
// TDD — Sprint 2.5: InstitutionsPage (listagem /instituicoes) tests.
// Cobre os contratos críticos:
//   1. Grid renderiza múltiplos cards de instituições
//   2. Card com logo_url exibe o elemento <img> com dimensão w-[56px] h-[56px]
//   3. Cover do card tem altura h-[140px]
//   4. Body do card tem padding-top pt-8 (compensação do logo overflow)
//   5. Estado vazio renderiza mensagem correta
//   6. Link de cada card aponta para /instituicoes/:id

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { expect as vitestExpect } from 'vitest';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
vitestExpect.extend(jestDomMatchers);

// ─── Mocks: next/headers e @supabase/ssr ─────────────────────────────────────

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    setAll: () => {},
  }),
}));

// AppShell — renderiza apenas os children para simplificar asserts
vi.mock('@/components/layout/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

// next/link — renderiza como <a> simples
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// ─── Supabase mock chain ──────────────────────────────────────────────────────

const mockOrder = vi.fn();
const mockEq    = vi.fn().mockReturnValue({ order: mockOrder });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom  = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ from: mockFrom })),
}));

// ─── Import DEPOIS dos mocks ──────────────────────────────────────────────────
import InstitutionsPage from '../page';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeInstitution = (overrides = {}) => ({
  id:          'inst_001',
  name:        'Universidade Parceira',
  partner_institutions: {
    logo_url:    'https://example.com/logo.png',
    cover_url:   'https://example.com/cover.png',
    description: 'Uma descrição da instituição.',
    brand_color: '#7030C2',
  },
  ...overrides,
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('InstitutionsPage (listagem)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ── Estado vazio ───────────────────────────────────────────────────────────

  it('renderiza mensagem de estado vazio quando não há instituições', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    const page = await InstitutionsPage();
    render(page);

    expect(screen.getByText('Nenhuma instituição parceira cadastrada.')).toBeDefined();
  });

  // ── Grid responsivo ────────────────────────────────────────────────────────

  it('container da lista usa grid com classes responsivas corretas', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [makeInstitution(), makeInstitution({ id: 'inst_002', name: 'Outra Parceira' })],
      error: null,
    });

    const { container } = render(await InstitutionsPage());

    const grid = container.querySelector(
      '.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3.gap-6',
    );
    expect(grid).not.toBeNull();
  });

  it('renderiza um card para cada instituição retornada', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        makeInstitution({ id: 'inst_001', name: 'Parceira Alpha' }),
        makeInstitution({ id: 'inst_002', name: 'Parceira Beta' }),
        makeInstitution({ id: 'inst_003', name: 'Parceira Gamma' }),
      ],
      error: null,
    });

    render(await InstitutionsPage());

    expect(screen.getByText('Parceira Alpha')).toBeDefined();
    expect(screen.getByText('Parceira Beta')).toBeDefined();
    expect(screen.getByText('Parceira Gamma')).toBeDefined();
  });

  // ── Dimensões do card ──────────────────────────────────────────────────────

  it('cover do card tem classe h-[140px] (Sprint 2.5 refinamento)', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [makeInstitution()],
      error: null,
    });

    const { container } = render(await InstitutionsPage());

    const cover = container.querySelector('.h-\\[140px\\]');
    expect(cover).not.toBeNull();
  });

  it('logo do card tem classes w-[56px] h-[56px] e shadow-md', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [makeInstitution()],
      error: null,
    });

    const { container } = render(await InstitutionsPage());

    const logo = container.querySelector('.w-\\[56px\\].h-\\[56px\\]');
    expect(logo).not.toBeNull();
    expect(logo?.classList.contains('shadow-md')).toBe(true);
  });

  it('body do card tem padding-top pt-8 para compensar logo overflow', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [makeInstitution()],
      error: null,
    });

    const { container } = render(await InstitutionsPage());

    const body = container.querySelector('.pt-8');
    expect(body).not.toBeNull();
  });

  // ── Logo não exibido quando ausente ───────────────────────────────────────

  it('NÃO renderiza elemento de logo quando logo_url é null', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        makeInstitution({
          partner_institutions: {
            logo_url:    null,
            cover_url:   null,
            description: null,
            brand_color: '#3092bb',
          },
        }),
      ],
      error: null,
    });

    const { container } = render(await InstitutionsPage());

    // sem logo_url, o elemento redondo não deve existir
    const logo = container.querySelector('.w-\\[56px\\].h-\\[56px\\]');
    expect(logo).toBeNull();
  });

  // ── Links de navegação ─────────────────────────────────────────────────────

  it('cada card linka para /instituicoes/:id', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [makeInstitution({ id: 'inst_abc' })],
      error: null,
    });

    const { container } = render(await InstitutionsPage());

    const link = container.querySelector('a[href="/instituicoes/inst_abc"]');
    expect(link).not.toBeNull();
  });

  // ── Query Supabase ─────────────────────────────────────────────────────────

  it('consulta a tabela "institutions" filtrando is_partner=true', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    await InstitutionsPage();

    expect(mockFrom).toHaveBeenCalledWith('institutions');
    expect(mockEq).toHaveBeenCalledWith('is_partner', true);
  });

  it('lança erro quando Supabase retorna error', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'DB connection failed' } });

    await expect(InstitutionsPage()).rejects.toThrow('getPartnerInstitutions failed');
  });
});
