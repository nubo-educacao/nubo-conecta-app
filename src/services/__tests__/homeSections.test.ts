import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do supabase
const mockWithMethods = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  then: vi.fn(),
};

vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    from: vi.fn(() => mockWithMethods),
  }),
}));

describe('getHomeSections', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('retorna seções ativas ordenadas por display_order', async () => {
    mockWithMethods.order.mockResolvedValueOnce({
      data: [
        { id: '1', title: 'Para Você', section_type: 'match_carousel', data_source: 'match_results', display_order: 2, is_active: true, config: {} },
        { id: '2', title: 'Novidades', section_type: 'opportunity_carousel', data_source: 'recent_opportunities', display_order: 3, is_active: true, config: {} },
      ],
      error: null,
    });

    const { getHomeSections } = await import('@/services/homeSections');
    const sections = await getHomeSections();

    expect(sections).toHaveLength(2);
    expect(sections[0].display_order).toBeLessThan(sections[1].display_order);
  });

  it('filtra seções por target_states se userState fornecido', async () => {
    mockWithMethods.order.mockResolvedValueOnce({
      data: [
        { id: '1', title: 'SP Only', section_type: 'opportunity_carousel', data_source: 'partner_opportunities', display_order: 1, is_active: true, target_states: ['SP'], config: {} },
        { id: '2', title: 'Global', section_type: 'opportunity_carousel', data_source: 'recent_opportunities', display_order: 2, is_active: true, target_states: null, config: {} },
      ],
      error: null,
    });

    const { getHomeSections } = await import('@/services/homeSections');
    const sections = await getHomeSections('RJ');

    // SP Only deve ser filtrada (user é RJ), Global deve ficar
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Global');
  });
});
