import { describe, it, expect } from 'vitest';
import { prouniVacancies } from '@/lib/prouniVacancies';

describe('prouniVacancies', () => {
  it('soma qt_ofertada como ampla concorrência quando a modalidade é AMPLA', () => {
    expect(prouniVacancies([{ qt_ofertada: 12 }, { qt_ofertada: '3' }], 'AMPLA')).toEqual({
      broad_competition_offered: 15,
      quotas_offered: 0,
    });
  });

  it('soma qt_ofertada como cotas para COTA_PPI, COTA_PCD e o legado "PPI"', () => {
    for (const tipo of ['COTA_PPI', 'COTA_PCD', 'PPI']) {
      expect(prouniVacancies([{ qt_ofertada: 6 }], tipo)).toEqual({
        broad_competition_offered: 0,
        quotas_offered: 6,
      });
    }
  });

  it('sem modalidade definida trata como ampla concorrência', () => {
    expect(prouniVacancies([{ qt_ofertada: 4 }], null).broad_competition_offered).toBe(4);
  });

  it('ignora as colunas antigas bolsas_*_ofertada (removidas em 20260828)', () => {
    const legado = [{ bolsas_ampla_ofertada: 10, bolsas_cota_ofertada: 5 } as never];
    expect(prouniVacancies(legado, 'AMPLA')).toEqual({ broad_competition_offered: 0, quotas_offered: 0 });
  });
});
