// TP-2 2b — clique em card sobre engagement_events (ADR-0022).
// Card eeb42964.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInsert = vi.fn();
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();
const mockSelect = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: () => mockGetUser() },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (t: string) => mockFrom(t),
  },
}));

import { registerPartnerClick } from '@/services/partnersClickService';

const USER = { id: 'user-001' };

function chainFor() {
  const chain: any = {
    insert: mockInsert,
    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    select: () => chain,
    eq: () => chain,
    single: mockSelect,
  };
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: USER } });
  mockRpc.mockResolvedValue({ data: { status: 'created', inserted: 1 }, error: null });
  document.cookie = 'nubo:aid=; path=/; max-age=0';
  mockFrom.mockImplementation(chainFor);
  mockInsert.mockResolvedValue({ error: null });
  mockSelect.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
});

describe('registerPartnerClick', () => {
  it('registra card_click de PARCEIRO nas duas fontes (dual-write)', async () => {
    await registerPartnerClick('partner-uuid-1', { unifiedOpportunityId: 'partner_partner-uuid-1' });

    expect(mockRpc).toHaveBeenCalledWith('record_card_click', expect.objectContaining({
      p_entity_type: 'partner_opportunity',
      p_entity_id: 'partner-uuid-1',
      p_unified_opportunity_id: 'partner_partner-uuid-1',
    }));

    // A antiga segue recebendo: vw_partner_funnel ainda lê dela.
    expect(mockFrom).toHaveBeenCalledWith('partners_click');
  });

  it('REGISTRA card_click de oportunidade MEC — antes era ignorado', async () => {
    // partners_click tem partner_id NOT NULL com FK para partner_opportunities,
    // então o catálogo MEC nunca teve como ser registrado. Eram 66 mil
    // oportunidades sem nenhuma métrica de interesse.
    await registerPartnerClick(null, { unifiedOpportunityId: 'mec_abc-123' });

    expect(mockRpc).toHaveBeenCalledWith('record_card_click', expect.objectContaining({
      p_entity_type: 'mec_opportunity',
      p_entity_id: null,
      p_unified_opportunity_id: 'mec_abc-123',
    }));

    // E NÃO tenta a tabela antiga, cuja FK rejeitaria.
    expect(mockFrom).not.toHaveBeenCalledWith('partners_click');
  });

  it('event_id duplicado não é tratado como erro', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { status: 'duplicate', inserted: 0 },
      error: null,
    });

    const { error } = await registerPartnerClick(null, { unifiedOpportunityId: 'mec_abc-123' });

    expect(error).toBeNull();
  });

  it('registra clique anônimo usando a identidade estável do cookie', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    document.cookie = 'nubo:aid=anon-001; path=/';

    const { error } = await registerPartnerClick(null, { unifiedOpportunityId: 'mec_abc-123' });

    expect(error).toBeNull();
    expect(mockRpc).toHaveBeenCalledWith('record_card_click', expect.objectContaining({
      p_anonymous_id: 'anon-001',
      p_entity_type: 'mec_opportunity',
    }));
    expect(mockFrom).not.toHaveBeenCalledWith('partners_click');
  });

  it('não registra sem usuário nem identidade anônima', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { error } = await registerPartnerClick('partner-uuid-1');

    expect(error).toBe('Missing click subject');
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
