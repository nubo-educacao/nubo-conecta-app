// TDD — Wave 3: trackAndRedirect service tests.
// Verifies the HARD CONTRACT: INSERT must be called BEFORE the URL is returned.
// Uses vi.mock to intercept @supabase/ssr and next/headers — no real DB connection.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock next/headers (Server Action environment) ---
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    setAll: () => {},
  }),
}));

// --- Mock @supabase/ssr ---
const mockInsert = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Import AFTER mocks are set up
import { trackAndRedirect } from '@/services/redirectService';

describe('trackAndRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('grava na fonte nova E na antiga, nessa ordem (dual-write do expand/contract)', async () => {
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const result = await trackAndRedirect(
      'user-uuid-001',
      'institution-uuid-001',
      'https://example.com/apply',
      'catalog_card',
    );

    // engagement_events primeiro: é a fonte de verdade a partir de agora.
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'engagement_events');
    expect(mockInsert).toHaveBeenNthCalledWith(1, expect.objectContaining({
      event_type:      'redirect',
      user_id:         'user-uuid-001',
      entity_type:     'partner_opportunity',
      entity_id:       'institution-uuid-001',
      destination_url: 'https://example.com/apply',
      source:          'catalog_card',
    }));

    // A antiga segue recebendo enquanto vw_partner_funnel e as três RPCs de
    // funil ainda leem dela.
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'external_redirect_clicks');
    expect(mockInsert).toHaveBeenNthCalledWith(2, {
      user_id:      'user-uuid-001',
      partner_id:   'institution-uuid-001',
      redirect_url: 'https://example.com/apply',
      source:       'catalog_card',
    });

    expect(result.url).toBe('https://example.com/apply');
  });

  it('não devolve a URL quando o registro do evento falha', async () => {
    // O contrato duro continua: sem registro confirmado, sem URL. É o que
    // impede contornar o tracking (requisito de segurança do TDD da Sprint 02).
    mockInsert.mockResolvedValueOnce({ error: { message: 'RLS violation' } });
    mockFrom.mockReturnValue({ insert: mockInsert });

    await expect(
      trackAndRedirect(
        'user-uuid-002',
        'institution-uuid-002',
        'https://example.com/apply',
        'opportunity_detail',
      ),
    ).rejects.toThrow('trackAndRedirect: failed to record event');
  });

  it('event_id duplicado não é erro — é a idempotência funcionando', async () => {
    // 23505 = violação de unicidade. Duplo clique no botão não pode virar dois
    // redirects, e também não pode impedir a pessoa de chegar ao destino.
    mockInsert
      .mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate key' } })
      .mockResolvedValueOnce({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const result = await trackAndRedirect(
      'user-uuid-004',
      'institution-uuid-004',
      'https://example.com/apply',
      'catalog_card',
    );

    expect(result.url).toBe('https://example.com/apply');
  });

  it('RASTREIA oportunidade MEC em vez de pular o tracking', async () => {
    // Esta é a mudança de comportamento do TP-2 2b. A versão anterior tinha um
    // guard que devolvia a URL SEM registrar quando partnerId era null — e era
    // exatamente por isso que oportunidade MEC nunca apareceu em métrica
    // nenhuma. O teste antigo afirmava esse comportamento como correto.
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const result = await trackAndRedirect(
      'user-uuid-003',
      null,                              // MEC não tem partner_id
      'https://sisu.mec.gov.br',
      'mec_opportunity',
      'mec_abc-123',
    );

    expect(mockFrom).toHaveBeenCalledWith('engagement_events');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      event_type:             'redirect',
      entity_type:            'mec_opportunity',
      entity_id:              null,
      unified_opportunity_id: 'mec_abc-123',
    }));

    // A tabela antiga NÃO recebe: a FK dela exige parceiro. O evento já está
    // registrado na fonte nova.
    expect(mockFrom).not.toHaveBeenCalledWith('external_redirect_clicks');
    expect(result.url).toBe('https://sisu.mec.gov.br');
  });
});
