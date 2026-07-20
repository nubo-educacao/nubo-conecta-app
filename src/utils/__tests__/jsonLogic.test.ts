import { describe, it, expect } from 'vitest';
import { evaluateJsonLogic } from '../jsonLogic';

describe('evaluateJsonLogic - Renda & Numeric Parsing', () => {
  it('deve avaliar corretamente quando a renda é um objeto com per_capita_income', () => {
    const rule = { '<=': [{ var: 'renda_per_capita' }, 4000] };
    const dataElegivel = {
      renda_per_capita: {
        per_capita_income: 1100,
        total_income: 4400,
        family_members: 4,
      },
    };
    const dataNaoElegivel = {
      renda_per_capita: {
        per_capita_income: 5000,
        total_income: 20000,
        family_members: 4,
      },
    };

    expect(evaluateJsonLogic(rule, dataElegivel)).toBe(true);
    expect(evaluateJsonLogic(rule, dataNaoElegivel)).toBe(false);
  });

  it('deve ignorar caracteres não numéricos e formatação de moeda em ambas as pontas da comparação', () => {
    const ruleFormataCriterio = { '<=': [{ var: 'renda' }, 'R$ 4.000,00'] };
    
    expect(evaluateJsonLogic(ruleFormataCriterio, { renda: 1100 })).toBe(true);
    expect(evaluateJsonLogic(ruleFormataCriterio, { renda: 'R$ 1.100,00' })).toBe(true);
    expect(evaluateJsonLogic(ruleFormataCriterio, { renda: '1.100' })).toBe(true);
    expect(evaluateJsonLogic(ruleFormataCriterio, { renda: 5000 })).toBe(false);
    expect(evaluateJsonLogic(ruleFormataCriterio, { renda: 'R$ 5.000,00' })).toBe(false);
  });
});
