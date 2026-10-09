// Busca inteligente do catálogo (search_opportunities_v2, migration 20261009150000 no admin).
//
// A tolerância a acento, caixa, erros de digitação e apelidos vive na RPC e é exercitada
// contra Postgres. Aqui se testa o contrato DESTA camada: qual RPC é chamada, com quais
// parâmetros, e que a ordenação respeita a relevância em vez da data.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], get: () => undefined }),
}));

type Call = { method: string; args: unknown[] };

function makeQuery(calls: Call[]) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'order', 'range', 'eq', 'ilike', 'or']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
  return builder;
}

const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();
const mockPrefs = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
    from: (table: string) => (table === 'user_preferences' ? mockPrefs() : mockFrom(table)),
  })),
}));

import { getUnifiedOpportunities } from '@/services/opportunities';

let calls: Call[];

beforeEach(() => {
  vi.clearAllMocks();
  calls = [];
  mockGetUser.mockResolvedValue({ data: { user: null } });
  mockRpc.mockImplementation(() => makeQuery(calls));
  mockFrom.mockImplementation(() => makeQuery(calls));
});

const orders = () => calls.filter(c => c.method === 'order').map(c => c.args[0]);

describe('getUnifiedOpportunities — busca', () => {
  it('usa search_opportunities_v2 com o termo e ordena por relevância', async () => {
    await getUnifiedOpportunities({ mode: 'explorar', q: '  medcina sao paulo  ' });

    expect(mockRpc).toHaveBeenCalledWith('search_opportunities_v2', {
      p_q: 'medcina sao paulo',
      p_lat: null,
      p_long: null,
    });
    expect(orders()[0]).toBe('search_rank');
    expect(orders()).not.toContain('distance_km');
  });

  it('com coordenadas do aluno, passa lat/long e desempata por distância', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockPrefs.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { device_latitude: -19.9, device_longitude: -43.9 } }),
        }),
      }),
    });

    await getUnifiedOpportunities({ mode: 'explorar', q: 'adm bh' });

    expect(mockRpc).toHaveBeenCalledWith('search_opportunities_v2', {
      p_q: 'adm bh',
      p_lat: -19.9,
      p_long: -43.9,
    });
    expect(orders().slice(0, 2)).toEqual(['search_rank', 'distance_km']);
  });

  it('sem termo de busca não chama a RPC de busca', async () => {
    await getUnifiedOpportunities({ mode: 'explorar' });

    expect(mockRpc).not.toHaveBeenCalledWith('search_opportunities_v2', expect.anything());
    expect(mockFrom).toHaveBeenCalledWith('v_unified_opportunities');
    expect(orders()).not.toContain('search_rank');
  });
});
