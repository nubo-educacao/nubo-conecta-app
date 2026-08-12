// TP-5 5b — Server Action submitPartnerSolicitation (card 7410a5bc).
// Mocka @supabase/ssr e next/headers, como redirectService.test.ts — sem banco real.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: () => {} }),
}));

const mockInsert = vi.fn();
const mockLimit = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ from: mockFrom })),
}));

import { submitPartnerSolicitation } from '@/services/partnerSolicitations';

/** Encadeamento do dedupe: .select().eq().gte().or().limit() */
function buildQueryChain() {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    or: vi.fn(() => chain),
    limit: mockLimit,
    insert: mockInsert,
  };
  return chain;
}

const valid = {
  institution_name: 'Instituto Sol',
  contact_name: 'Maria',
  email: 'maria@instituto.org',
  whatsapp: '',
  how_did_you_know: 'Indicação',
  goals: 'Ampliar bolsas',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockImplementation(() => buildQueryChain());
  mockLimit.mockResolvedValue({ data: [], error: null });
  mockInsert.mockResolvedValue({ error: null });
});

describe('submitPartnerSolicitation — validação', () => {
  it('aceita uma submissão válida e insere', async () => {
    const result = await submitPartnerSolicitation(valid);

    expect(result).toEqual({ ok: true, duplicate: false });
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        institution_name: 'Instituto Sol',
        contact_name: 'Maria',
        email: 'maria@instituto.org',
        how_did_you_know: 'Indicação',
      }),
    );
  });

  it('rejeita sem nome da instituição, sem inserir', async () => {
    const result = await submitPartnerSolicitation({ ...valid, institution_name: '   ' });

    expect(result).toEqual({ ok: false, error: 'Informe o nome da instituição.' });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejeita quando não há nem whatsapp válido nem e-mail válido', async () => {
    const result = await submitPartnerSolicitation({
      ...valid,
      email: '',
      whatsapp: '123',
    });

    expect(result.ok).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('aceita só com whatsapp, sem e-mail', async () => {
    const result = await submitPartnerSolicitation({
      ...valid,
      email: '',
      whatsapp: '(11) 98888-7777',
    });

    expect(result).toEqual({ ok: true, duplicate: false });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ whatsapp: '(11) 98888-7777', email: null }),
    );
  });

  it('normaliza o e-mail para minúsculas', async () => {
    await submitPartnerSolicitation({ ...valid, email: 'Maria@Instituto.ORG' });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'maria@instituto.org' }),
    );
  });

  it('trunca campos longos em vez de deixar a tabela crescer sem teto', async () => {
    await submitPartnerSolicitation({ ...valid, goals: 'x'.repeat(5000) });

    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.goals.length).toBe(2000);
  });
});

describe('submitPartnerSolicitation — abuso', () => {
  it('descarta submissão com honeypot preenchido, respondendo sucesso', async () => {
    // Sucesso e não erro de propósito: dizer "você é um bot" ensina o bot.
    const result = await submitPartnerSolicitation({ ...valid, website: 'http://spam.example' });

    expect(result).toEqual({ ok: true, duplicate: false });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('trata reenvio do mesmo contato como duplicado e não insere de novo', async () => {
    mockLimit.mockResolvedValue({ data: [{ id: 'existente' }], error: null });

    const result = await submitPartnerSolicitation(valid);

    expect(result).toEqual({ ok: true, duplicate: true });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('não perde o lead se a checagem de duplicidade falhar', async () => {
    // Um duplicado custa menos que um lead perdido.
    mockLimit.mockResolvedValue({ data: null, error: { message: 'timeout' } });

    const result = await submitPartnerSolicitation(valid);

    expect(result).toEqual({ ok: true, duplicate: false });
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });
});

describe('submitPartnerSolicitation — falha de escrita', () => {
  it('devolve erro genérico e não vaza detalhe do banco', async () => {
    mockInsert.mockResolvedValue({
      error: { message: 'duplicate key value violates unique constraint "pk_xyz"' },
    });

    const result = await submitPartnerSolicitation(valid);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toContain('constraint');
      expect(result.error).toBe('Não foi possível enviar agora. Tente novamente em instantes.');
    }
  });
});
