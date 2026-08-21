// TP-7 7B — atribuição de canal: rota /r/<code> e costura pós-login.
// Card fbc7273e.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ATTR_COOKIES } from '@/lib/attribution';

const mockCookieGet = vi.fn();
const mockRpc = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: (k: string) => mockCookieGet(k),
    getAll: () => [],
    setAll: () => {},
  }),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ rpc: mockRpc })),
}));

import { attachAttribution } from '@/services/attributionService';

const USER = 'aaaaaaaa-0000-0000-0000-00000000000a';

beforeEach(() => {
  vi.clearAllMocks();
  mockCookieGet.mockReturnValue(undefined);
  mockRpc.mockResolvedValue({ data: { status: 'ok' }, error: null });
});

function withCookies(map: Record<string, string>) {
  mockCookieGet.mockImplementation((k: string) =>
    map[k] ? { value: map[k] } : undefined,
  );
}

describe('attachAttribution', () => {
  it('envia first e last touch separados para a RPC', async () => {
    withCookies({
      [ATTR_COOKIES.anonymous]: 'sess-1',
      [ATTR_COOKIES.first]: 'dudinhanubo',
      [ATTR_COOKIES.last]: 'pontesol09',
    });

    const result = await attachAttribution(USER);

    expect(result).toEqual({ ok: true, attributed: true });
    expect(mockRpc).toHaveBeenCalledWith('attach_user_attribution', {
      p_user_id: USER,
      p_anonymous_id: 'sess-1',
      p_first_code: 'dudinhanubo',
      p_last_code: 'pontesol09',
    });
  });

  it('costura pelo anonymous_id mesmo sem cookie de code', async () => {
    // Caso de quem clicou, fechou o navegador e voltou: os codes se perderam,
    // mas os eventos daquele anonymous_id continuam no banco.
    withCookies({ [ATTR_COOKIES.anonymous]: 'sess-2' });

    await attachAttribution(USER);

    expect(mockRpc).toHaveBeenCalledWith(
      'attach_user_attribution',
      expect.objectContaining({ p_anonymous_id: 'sess-2', p_first_code: null }),
    );
  });

  it('não chama o banco quando não há nada para atribuir', async () => {
    // Chegou digitando o endereço. Não é erro.
    const result = await attachAttribution(USER);

    expect(result).toEqual({ ok: true, attributed: false });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('distingue "sem atribuição" de "atribuiu"', async () => {
    withCookies({ [ATTR_COOKIES.anonymous]: 'sess-3' });
    mockRpc.mockResolvedValue({ data: { status: 'no_attribution' }, error: null });

    expect(await attachAttribution(USER)).toEqual({ ok: true, attributed: false });
  });

  it('falha de atribuição não derruba o cadastro', async () => {
    // Perder a origem custa uma linha de relatório. Barrar o cadastro custa o
    // cadastro. A função devolve erro, mas nunca lança.
    withCookies({ [ATTR_COOKIES.anonymous]: 'sess-4' });
    mockRpc.mockRejectedValue(new Error('conexão caiu'));

    const result = await attachAttribution(USER);

    expect(result.ok).toBe(false);
  });
});

describe('contrato dos cookies de atribuição', () => {
  it('first e last são cookies DIFERENTES', () => {
    // O bug do middleware anterior era ter só um cookie, reescrito a cada
    // visita: quem descobria o Nubo por uma influenciadora e voltava por um
    // disparo de CRM era creditado ao CRM.
    expect(ATTR_COOKIES.first).not.toBe(ATTR_COOKIES.last);
  });

  it('mantém o cookie legado, que o trigger handle_new_user ainda lê', () => {
    expect(ATTR_COOKIES.referral).toBe('nubo:referral');
  });
});
