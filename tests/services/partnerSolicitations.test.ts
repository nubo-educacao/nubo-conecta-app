// TP-5 5b — Server Action submitPartnerSolicitation (card 7410a5bc).
//
// A escrita e a validação de negócio vivem na RPC submit_partner_solicitation
// (migration 20260812120000), exercitada contra Postgres real em
// supabase/tests/. Aqui se testa o que é responsabilidade DESTA camada:
// honeypot, resolução do IP, encaminhamento dos campos e tradução do status
// para o que a UI mostra.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockHeaderGet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: () => {} }),
  headers: vi.fn().mockResolvedValue({ get: (k: string) => mockHeaderGet(k) }),
}));

const mockRpc = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ rpc: mockRpc })),
}));

import { submitPartnerSolicitation } from '@/services/partnerSolicitations';

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
  mockHeaderGet.mockReturnValue(null);
  mockRpc.mockResolvedValue({ data: { status: 'created' }, error: null });
});

describe('submitPartnerSolicitation — encaminhamento', () => {
  it('delega para a RPC, sem inserir na tabela direto', async () => {
    const result = await submitPartnerSolicitation(valid);

    expect(result).toEqual({ ok: true, duplicate: false });
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith(
      'submit_partner_solicitation',
      expect.objectContaining({
        p_institution_name: 'Instituto Sol',
        p_contact_name: 'Maria',
        p_email: 'maria@instituto.org',
        p_how_did_you_know: 'Indicação',
      }),
    );
  });

  it('usa o primeiro IP de x-forwarded-for, não a cadeia inteira', async () => {
    // Os demais endereços da cadeia são dos proxies; usar a string toda daria
    // um "IP" distinto por rota e furaria o rate limit.
    mockHeaderGet.mockImplementation((k: string) =>
      k === 'x-forwarded-for' ? '203.0.113.7, 70.41.3.18, 150.172.238.178' : null,
    );

    await submitPartnerSolicitation(valid);

    expect(mockRpc).toHaveBeenCalledWith(
      'submit_partner_solicitation',
      expect.objectContaining({ p_ip: '203.0.113.7' }),
    );
  });

  it('cai para x-real-ip quando não há x-forwarded-for', async () => {
    mockHeaderGet.mockImplementation((k: string) => (k === 'x-real-ip' ? '198.51.100.4' : null));

    await submitPartnerSolicitation(valid);

    expect(mockRpc).toHaveBeenCalledWith(
      'submit_partner_solicitation',
      expect.objectContaining({ p_ip: '198.51.100.4' }),
    );
  });

  it('envia null quando não consegue resolver o IP, sem quebrar', async () => {
    const result = await submitPartnerSolicitation(valid);

    expect(result.ok).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith(
      'submit_partner_solicitation',
      expect.objectContaining({ p_ip: null }),
    );
  });
});

describe('submitPartnerSolicitation — honeypot', () => {
  it('descarta antes de tocar o banco e responde sucesso', async () => {
    // Sucesso e não erro de propósito: dizer "você é um bot" ensina o bot.
    const result = await submitPartnerSolicitation({ ...valid, website: 'http://spam.example' });

    expect(result).toEqual({ ok: true, duplicate: false });
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe('submitPartnerSolicitation — tradução do status', () => {
  it('duplicate vira sucesso marcado como duplicado', async () => {
    mockRpc.mockResolvedValue({ data: { status: 'duplicate' }, error: null });

    expect(await submitPartnerSolicitation(valid)).toEqual({ ok: true, duplicate: true });
  });

  it('rate_limited vira mensagem de espera, não erro genérico', async () => {
    mockRpc.mockResolvedValue({ data: { status: 'rate_limited', scope: 'ip' }, error: null });

    const result = await submitPartnerSolicitation(valid);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/aguarde alguns minutos/i);
  });

  it('invalid usa a mensagem do campo que a RPC apontou', async () => {
    mockRpc.mockResolvedValue({
      data: { status: 'invalid', field: 'contact' },
      error: null,
    });

    const result = await submitPartnerSolicitation(valid);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/WhatsApp válido ou um e-mail válido/);
  });

  it('status desconhecido não é tratado como sucesso', async () => {
    mockRpc.mockResolvedValue({ data: { status: 'algo_novo' }, error: null });

    expect((await submitPartnerSolicitation(valid)).ok).toBe(false);
  });
});

describe('submitPartnerSolicitation — falha da RPC', () => {
  it('devolve erro genérico e não vaza detalhe do banco', async () => {
    mockRpc.mockResolvedValue({
      data: null,
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
