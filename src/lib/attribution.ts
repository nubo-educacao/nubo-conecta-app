// Atribuição de canal — nomes de cookie e regras de escrita (TP-7 7B).
//
// Isolado num módulo porque quatro lugares precisam concordar sobre estes
// nomes: a rota /r/<code>, o middleware, o cadastro e os testes. Constante
// duplicada em quatro arquivos é como o `nubo:referral` acabou sendo escrito
// por um lado e lido por outro sem ninguém notar que sobrescrevia.

export const ATTR_COOKIES = {
  /** Primeiro link que trouxe a pessoa. Escrito UMA vez e nunca mais. */
  first: 'nubo:attr_first',
  /** Último link pelo qual ela voltou. Reescrito a cada visita. */
  last: 'nubo:attr_last',
  /** Identidade do visitante antes do login — é a chave do stitching. */
  anonymous: 'nubo:aid',
  /** Legado: lido pelo trigger handle_new_user. Mantido até a migração fechar. */
  referral: 'nubo:referral',
} as const;

/** 90 dias: um ciclo de vestibular inteiro cabe na janela. */
export const ATTR_MAX_AGE = 60 * 60 * 24 * 90;

export const attrCookieOptions = {
  path: '/',
  maxAge: ATTR_MAX_AGE,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
} as const;

/** Parâmetros que vale a pena reter quando a visita não veio de /r/<code>. */
export const TRACKED_QUERY_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
] as const;

export function newAnonymousId(): string {
  return crypto.randomUUID();
}
