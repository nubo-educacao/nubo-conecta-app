// TP-2 2b — clique em card sobre engagement_events (ADR-0022).
// Card eeb42964.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInsert = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();
const mockSelect = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: () => mockGetUser() },
    from: (t: string) => mockFrom(t),
  },
}));

import { registerPartnerClick } from '@/services/partnersClickService';

const USER = { id: 'user-001' };

/** partners_click faz select().eq().eq().single(); engagement_events só insert. */
function chainFor(table: string) {
  if (table === 'engagement_events') return { insert: mockInsert };
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
  mockFrom.mockImplementation(chainFor);
  mockInsert.mockResolvedValue({ error: null });
  mockSelect.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
});

describe('registerPartnerClick', () => {
  it('registra card_click de PARCEIRO nas duas fontes (dual-write)', async () => {
    await registerPartnerClick('partner-uuid-1', { unifiedOpportunityId: 'partner_partner-uuid-1' });

    expect(mockFrom).toHaveBeenCalledWith('engagement_events');
    expect(mockInsert).toHaveBeenNthCalledWith(1, expect.objectContaining({
      event_type:  'card_click',
      user_id:     'user-001',
      entity_type: 'partner_opportunity',
      entity_id:   'partner-uuid-1',
    }));

    // A antiga segue recebendo: vw_partner_funnel ainda lê dela.
    expect(mockFrom).toHaveBeenCalledWith('partners_click');
  });

  it('REGISTRA card_click de oportunidade MEC — antes era ignorado', async () => {
    // partners_click tem partner_id NOT NULL com FK para partner_opportunities,
    // então o catálogo MEC nunca teve como ser registrado. Eram 66 mil
    // oportunidades sem nenhuma métrica de interesse.
    await registerPartnerClick(null, { unifiedOpportunityId: 'mec_abc-123' });

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      event_type:             'card_click',
      entity_type:            'mec_opportunity',
      entity_id:              null,
      unified_opportunity_id: 'mec_abc-123',
    }));

    // E NÃO tenta a tabela antiga, cuja FK rejeitaria.
    expect(mockFrom).not.toHaveBeenCalledWith('partners_click');
  });

  it('event_id duplicado não é tratado como erro', async () => {
    // Clicar duas vezes no card enquanto a página carrega não pode virar dois
    // cliques nem estourar um erro na cara de quem clicou.
    mockInsert.mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate key' } });

    const { error } = await registerPartnerClick(null, { unifiedOpportunityId: 'mec_abc-123' });

    expect(error).toBeNull();
  });

  it('não registra nada para visitante não autenticado', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { error } = await registerPartnerClick('partner-uuid-1');

    expect(error).toBe('User not authenticated');
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
