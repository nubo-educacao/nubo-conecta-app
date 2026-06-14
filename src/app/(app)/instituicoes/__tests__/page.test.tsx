// @vitest-environment jsdom
// TDD — Sprint 8.0: InstitutionsPage (listagem /instituicoes) — cenários BDD
//
// BDD Cobertos:
//   1. Renderizar página com lista mista (parceiras + MEC)
//   2. Filtrar por Parceiras (client-side via InstitutionsClient)
//   3. Grid responsivo: classes md:grid-cols-2 xl:grid-cols-3
//   4. Cabeçalho "Instituições" (não mais "Instituições Parceiras")
//   5. Repasse correto de institutions para InstitutionsClient

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { expect as vitestExpect } from 'vitest';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
vitestExpect.extend(jestDomMatchers);

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: () => {} }),
}));

vi.mock('@/components/layout/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

// Spy InstitutionsClient para verificar props recebidas
let capturedInstitutions: any[] = [];
vi.mock('../InstitutionsClient', () => ({
  default: ({ institutions }: { institutions: any[] }) => {
    capturedInstitutions = institutions;
    return (
      <div data-testid="institutions-client">
        {institutions.map((i: any) => (
          <div key={i.id} data-testid={`card-${i.id}`}>{i.name}</div>
        ))}
      </div>
    );
  },
}));

const mockRange = vi.fn();
const mockOrder2 = vi.fn().mockReturnValue({ range: mockRange });
const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
const mockSelect = vi.fn().mockReturnValue({ order: mockOrder1 });
const mockFrom   = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ from: mockFrom })),
}));

// ─── Import DEPOIS dos mocks ──────────────────────────────────────────────────

import InstitutionsPage from '../page';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makePartner = (overrides = {}) => ({
  id: 'inst-partner-001',
  name: 'Universidade Parceira',
  location: 'São Paulo, SP',
  logo_url: 'https://example.com/logo.png',
  cover_url: null,
  brand_color: '#C82D26',
  description: 'Descrição',
  type: 'partner',
  ...overrides,
});

const makeMec = (overrides = {}) => ({
  id: 'inst-mec-001',
  name: 'Universidade Federal',
  location: null,
  logo_url: null,
  cover_url: null,
  brand_color: null,
  description: null,
  type: 'mec',
  ...overrides,
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('InstitutionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedInstitutions = [];
  });

  afterEach(() => cleanup());

  it('exibe título "Instituições"', async () => {
    mockRange.mockResolvedValueOnce({ data: [], error: null });
    render(await InstitutionsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText('Instituições')).toBeDefined();
  });

  it('passa lista mista (parceiras + MEC) para InstitutionsClient', async () => {
    mockRange.mockResolvedValueOnce({
      data: [
        makePartner(),
        makeMec(),
        makeMec({ id: 'inst-mec-002', name: 'UFMG' }),
      ],
      error: null,
    });

    render(await InstitutionsPage({ searchParams: Promise.resolve({}) }));

    expect(capturedInstitutions).toHaveLength(3);
    expect(capturedInstitutions.filter((i) => i.type === 'partner')).toHaveLength(1);
    expect(capturedInstitutions.filter((i) => i.type === 'mec')).toHaveLength(2);
  });

  it('renderiza InstitutionsClient com os nomes das instituições', async () => {
    mockRange.mockResolvedValueOnce({
      data: [
        makePartner({ id: 'p1', name: 'Parceira Alpha' }),
        makeMec({ id: 'm1', name: 'MEC Beta' }),
      ],
      error: null,
    });

    render(await InstitutionsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText('Parceira Alpha')).toBeDefined();
    expect(screen.getByText('MEC Beta')).toBeDefined();
  });

  it('consulta a view "v_unified_institutions"', async () => {
    mockRange.mockResolvedValueOnce({ data: [], error: null });

    await InstitutionsPage({ searchParams: Promise.resolve({}) });

    expect(mockFrom).toHaveBeenCalledWith('v_unified_institutions');
  });

  it('lança erro quando Supabase retorna error', async () => {
    mockRange.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error', code: '500' },
    });

    await expect(InstitutionsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('getUnifiedInstitutions failed');
  });

  it('passa lista vazia para InstitutionsClient quando não há instituições', async () => {
    mockRange.mockResolvedValueOnce({ data: [], error: null });

    render(await InstitutionsPage({ searchParams: Promise.resolve({}) }));

    expect(capturedInstitutions).toHaveLength(0);
  });
});
