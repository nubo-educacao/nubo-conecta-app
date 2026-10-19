// NUB-RD-96 (TP-H §2) — taxonomia de superfície: contrato com o admin.
//
// view:  `view:<surface>`        (inalterado, gravado por record_card_views)
// click: `click:<surface>`       (a MESMA <surface> do view do mesmo card)
// apply: `apply:<surface>`       (redirect MEC; sem origem conhecida → oportunidade_detalhe)

import { describe, it, expect } from 'vitest';
import {
  SURFACES,
  DETAIL_FALLBACK_SURFACE,
  applySource,
  clickSource,
  sanitizeOriginSurface,
} from '@/lib/surfaces';

describe('superfícies canônicas (§2)', () => {
  it('"Para Você" tem superfície própria na home e na aba de /oportunidades', () => {
    expect(SURFACES.HOME_PARA_VOCE).toBe('home_para_voce');
    expect(SURFACES.OPORTUNIDADES_PARA_VOCE).toBe('oportunidades_para_voce');
  });

  it('as demais superfícies novas seguem a tabela do plano', () => {
    expect(SURFACES.HOME_CARROSSEL_OPORTUNIDADES).toBe('home_carrossel_oportunidades');
    expect(SURFACES.HOME_CARROSSEL_INSTITUICOES).toBe('home_carrossel_instituicoes');
    expect(SURFACES.DETALHE_SIMILARES).toBe('detalhe_similares');
    expect(SURFACES.PARTNER_FORMS_SUGESTOES).toBe('partner_forms_sugestoes');
    expect(SURFACES.PERFIL_FAVORITOS).toBe('perfil_favoritos');
  });

  it('as superfícies que ficam inalteradas continuam com o mesmo nome', () => {
    expect(SURFACES.OPORTUNIDADES_EXPLORAR).toBe('oportunidades_explorar');
    expect(SURFACES.INSTITUICAO_DETALHE).toBe('instituicao_detalhe');
    expect(SURFACES.INSTITUICOES_LISTA).toBe('instituicoes_lista');
  });

  it('nenhuma superfície emitida pelo app é "unknown"', () => {
    expect(Object.values(SURFACES)).not.toContain('unknown');
  });
});

describe('source por tipo de evento', () => {
  it('clique = click:<surface>', () => {
    expect(clickSource('home_para_voce')).toBe('click:home_para_voce');
  });

  it('redirect MEC = apply:<surface>', () => {
    expect(applySource('oportunidades_para_voce')).toBe('apply:oportunidades_para_voce');
  });

  it('redirect MEC sem origem conhecida cai em apply:oportunidade_detalhe', () => {
    expect(DETAIL_FALLBACK_SURFACE).toBe('oportunidade_detalhe');
    expect(applySource(undefined)).toBe('apply:oportunidade_detalhe');
    expect(applySource(null)).toBe('apply:oportunidade_detalhe');
    expect(applySource('')).toBe('apply:oportunidade_detalhe');
  });
});

describe('sanitizeOriginSurface (?from=, validado por whitelist)', () => {
  it('aceita cada superfície que renderiza OpportunityCard', () => {
    for (const s of [
      SURFACES.HOME_PARA_VOCE,
      SURFACES.HOME_CARROSSEL_OPORTUNIDADES,
      SURFACES.OPORTUNIDADES_PARA_VOCE,
      SURFACES.OPORTUNIDADES_EXPLORAR,
      SURFACES.INSTITUICAO_DETALHE,
      SURFACES.DETALHE_SIMILARES,
      SURFACES.PARTNER_FORMS_SUGESTOES,
      SURFACES.PERFIL_FAVORITOS,
    ]) {
      expect(sanitizeOriginSurface(s)).toBe(s);
    }
  });

  it('valor fora da whitelist vira oportunidade_detalhe (nada de texto livre no source)', () => {
    expect(sanitizeOriginSurface('<script>alert(1)</script>')).toBe('oportunidade_detalhe');
    expect(sanitizeOriginSurface('home_para_voce; DROP TABLE')).toBe('oportunidade_detalhe');
    expect(sanitizeOriginSurface('x'.repeat(500))).toBe('oportunidade_detalhe');
  });

  it('"unknown", vazio, ausente e não-string viram oportunidade_detalhe', () => {
    expect(sanitizeOriginSurface('unknown')).toBe('oportunidade_detalhe');
    expect(sanitizeOriginSurface('')).toBe('oportunidade_detalhe');
    expect(sanitizeOriginSurface(undefined)).toBe('oportunidade_detalhe');
    expect(sanitizeOriginSurface(null)).toBe('oportunidade_detalhe');
    // searchParams do Next pode devolver string[] quando o param se repete.
    expect(sanitizeOriginSurface(['home_para_voce', 'x'])).toBe('oportunidade_detalhe');
  });
});
