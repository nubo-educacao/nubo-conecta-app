// Taxonomia de superfície — NUB-RD-96 (TP-H §2), contrato com o admin.
//
//   card_view  → `view:<surface>`   (gravado por record_card_views; inalterado)
//   card_click → `click:<surface>`  (a MESMA <surface> do view do mesmo card)
//   redirect   → `apply:<surface>`  (redirect MEC; origem desconhecida → oportunidade_detalhe)
//
// Uma superfície nova só nasce aqui: o caller importa a constante em vez de
// digitar a string, para view e click nunca divergirem por erro de digitação.

export const SURFACES = {
  /** Home, seção `match_carousel` ("Para Você" da home). */
  HOME_PARA_VOCE: 'home_para_voce',
  /** Home, seção `opportunity_carousel` — strip e grid desktop. */
  HOME_CARROSSEL_OPORTUNIDADES: 'home_carrossel_oportunidades',
  /** Home, seção `institution_carousel` — strip e grid desktop. */
  HOME_CARROSSEL_INSTITUICOES: 'home_carrossel_instituicoes',
  /**
   * Aba "Para Você" de /oportunidades. Substitui `oportunidades_lista`: o
   * histórico dessa superfície é Para Você (o admin documenta o mapeamento).
   */
  OPORTUNIDADES_PARA_VOCE: 'oportunidades_para_voce',
  OPORTUNIDADES_EXPLORAR: 'oportunidades_explorar',
  INSTITUICAO_DETALHE: 'instituicao_detalhe',
  INSTITUICOES_LISTA: 'instituicoes_lista',
  /** DetailsLayout, "Outras Oportunidades para Você". */
  DETALHE_SIMILARES: 'detalhe_similares',
  /** partner-forms (página e PartnerFormEngine), "Melhores opções para você". */
  PARTNER_FORMS_SUGESTOES: 'partner_forms_sugestoes',
  /** Perfil → Favoritos. */
  PERFIL_FAVORITOS: 'perfil_favoritos',
} as const;

/** Superfície do redirect quando a origem não é conhecida (acesso direto, link externo). */
export const DETAIL_FALLBACK_SURFACE = 'oportunidade_detalhe';

/**
 * Superfícies que renderizam OpportunityCard e, portanto, podem aparecer em
 * `?from=` na página de detalhe. Whitelist: o valor vira parte do `source` do
 * evento, então texto livre da URL nunca entra.
 */
const ORIGIN_SURFACES: ReadonlySet<string> = new Set([
  SURFACES.HOME_PARA_VOCE,
  SURFACES.HOME_CARROSSEL_OPORTUNIDADES,
  SURFACES.OPORTUNIDADES_PARA_VOCE,
  SURFACES.OPORTUNIDADES_EXPLORAR,
  SURFACES.INSTITUICAO_DETALHE,
  SURFACES.DETALHE_SIMILARES,
  SURFACES.PARTNER_FORMS_SUGESTOES,
  SURFACES.PERFIL_FAVORITOS,
]);

/** Valida o `?from=` da página de detalhe; fora da whitelist → `oportunidade_detalhe`. */
export function sanitizeOriginSurface(raw: unknown): string {
  return typeof raw === 'string' && ORIGIN_SURFACES.has(raw) ? raw : DETAIL_FALLBACK_SURFACE;
}

/** `source` do card_click. */
export function clickSource(surface: string): string {
  return `click:${surface}`;
}

/** `source` do redirect MEC. */
export function applySource(surface?: string | null): string {
  return `apply:${surface || DETAIL_FALLBACK_SURFACE}`;
}
