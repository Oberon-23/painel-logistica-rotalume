import { describe, expect, test } from 'vitest';
import { agg, CDS, REG, S, sel, wAgg, wSel, type Filtro } from './dados';

const TUDO: Filtro = { periodo: { from: 0, to: 11 }, cd: 'all', rg: 'all' };

describe('OTIF', () => {
  test('nunca passa do "no prazo" nem do "completas"', () => {
    const a = agg(sel(TUDO));
    expect(a.otif).toBeLessThanOrEqual(a.onTime);
    expect(a.otif).toBeLessThanOrEqual(a.inFull);
  });
  test('cada entrega OTIF está no prazo e completa', () => {
    expect(S.every((s) => !s.otif || (s.onTime && s.inFull))).toBe(true);
  });
});

describe('filtros', () => {
  test('a soma das regiões e dos CDs é igual ao total', () => {
    const total = sel(TUDO).length;
    expect(REG.reduce((n, _, i) => n + sel({ ...TUDO, rg: String(i) }).length, 0)).toBe(total);
    expect(CDS.reduce((n, _, i) => n + sel({ ...TUDO, cd: String(i) }).length, 0)).toBe(total);
  });
  test('frete sobre o valor e por kg são coerentes com os totais', () => {
    const a = agg(sel(TUDO));
    expect(a.fretePct).toBeCloseTo(a.frete / a.valor, 10);
    expect(a.kg).toBeCloseTo(a.frete / a.peso, 10);
  });
});

describe('armazém', () => {
  test('produtividade e erros positivos em todos os CDs', () => {
    CDS.forEach((_, i) => {
      const w = wAgg(wSel({ ...TUDO, cd: String(i) }));
      expect(w.prod).toBeGreaterThan(0);
      expect(w.errK).toBeGreaterThanOrEqual(0);
    });
  });
});
