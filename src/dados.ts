/*
 * Base fictícia da Rotalume Logística: entregas (com peso, valor,
 * transportadora, prazo, motivo de falha e frete) e o dia a dia de três
 * centros de distribuição, de nov/2025 a out/2026. Semente fixa.
 */
import { rng } from './kit/rng';
import { mean, sum } from './kit/formato';
import { MONTHS, monthIdx, type Periodo } from './kit/meses';

const R = rng(20261101);
const DAY = 86400000, T0 = Date.UTC(2025, 10, 1), T1 = Date.UTC(2026, 9, 31);

export const CDS = [
  { nome: 'Campos (RJ)', curto: 'Campos', w: 0.35, reg: [0.75, 0.05, 0.05, 0.10, 0.05], prom: [2, 4, 4, 5, 7], prod: 95 },
  { nome: 'Campinas (SP)', curto: 'Campinas', w: 0.45, reg: [0.55, 0.25, 0.15, 0.03, 0.02], prom: [2, 3, 3, 6, 7], prod: 104 },
  { nome: 'Recife (PE)', curto: 'Recife', w: 0.20, reg: [0.04, 0.01, 0.03, 0.80, 0.12], prom: [5, 7, 6, 2, 5], prod: 88 },
];
export const REG = ['Sudeste', 'Sul', 'Centro-Oeste', 'Nordeste', 'Norte'];
const UFS = [['SP', 'RJ', 'MG', 'ES'], ['PR', 'SC', 'RS'], ['GO', 'DF', 'MT', 'MS'], ['PE', 'BA', 'CE', 'PB', 'RN', 'AL'], ['PA', 'AM', 'TO']];
export const CAR = [
  { nome: 'Frota própria', delay: 0.035, dmg: 0.002, cost: 1.15 },
  { nome: 'Transportadora Alfa', delay: 0.06, dmg: 0.003, cost: 1.0 },
  { nome: 'Transportadora Beta', delay: 0.085, dmg: 0.004, cost: 0.95 },
  { nome: 'Transportadora Gama', delay: 0.19, dmg: 0.012, cost: 0.8 },
  { nome: 'Transportadora Delta', delay: 0.075, dmg: 0.004, cost: 1.05 },
];
const CAR_BY_REG = [[0.45, 0.35, 0.20, 0, 0], [0, 0.6, 0.4, 0, 0], [0, 0.4, 0.35, 0, 0.25], [0, 0, 0.2, 0.5, 0.3], [0, 0, 0.15, 0.45, 0.4]];
const MOT_ATR = ['Trânsito e rodovias', 'Janela de recebimento do cliente', 'Problema no veículo', 'Documentação fiscal', 'Chuvas', 'Atraso na expedição do CD'];
const MOT_INC = ['Falta de estoque', 'Erro de separação'];
export const MOTIVOS_DO_CD = ['Erro de separação', 'Falta de estoque', 'Atraso na expedição do CD'];
const BF0 = Date.UTC(2025, 10, 17), BF1 = Date.UTC(2025, 10, 30);
const WMS = Date.UTC(2026, 2, 9);
export const DIESEL = Date.UTC(2026, 5, 1);

export type Entrega = {
  t: number; m: number; cd: number; rg: number; uf: string; ca: number; prom: number; lt: number; onTime: boolean; inFull: boolean; otif: boolean;
  motivo: string | null; incMot: string | null; peso: number; valor: number; frete: number; dmg: boolean; linhas: number; nf: number;
};
export type DiaCD = { t: number; m: number; cd: number; pedidos: number; linhas: number; horas: number; erros: number };

export const S: Entrega[] = [];
export const W: DiaCD[] = [];
let nfn = 482100;
for (let t = T0; t <= T1; t += DAY) {
  const dow = new Date(t).getUTCDay(); if (dow === 0 || dow === 6) continue;
  const m = monthIdx(t), mo = new Date(t).getUTCMonth();
  const bf = t >= BF0 && t <= BF1, dez = mo === 11, rain = mo === 0 || mo === 1;
  const lam = 56 * (dow === 1 ? 1.12 : dow === 5 ? 0.9 : 1) * (bf ? 1.7 : dez ? 1.2 : 1) * (1 + 0.006 * m);
  const n = R.poisson(lam);
  const day = CDS.map(() => ({ pedidos: 0, linhas: 0, erros: 0 }));
  for (let k = 0; k < n; k++) {
    const cd = R.pickW(CDS.map((c) => c.w)), C = CDS[cd];
    const rg = R.pickW(C.reg), uf = R.pick(UFS[rg]);
    const ca = R.pickW(CAR_BY_REG[rg]), CA = CAR[ca];
    const prom = C.prom[rg];
    let lt = Math.max(1, Math.ceil(prom * R.between(0.55, 0.98)));
    let motivo: string | null = null;
    const pDelay = CA.delay * (bf ? 1.6 : 1);
    if (bf && R.r() < 0.16) { lt = Math.max(lt, prom) + 1; motivo = 'Atraso na expedição do CD'; }
    else if (rain && rg === 0 && R.r() < 0.09) { lt = Math.max(lt, prom) + 1; motivo = 'Chuvas'; }
    else if (R.r() < pDelay) { lt = prom + 1 + R.poisson(0.7); motivo = MOT_ATR[R.pickW([0.36, 0.22, 0.16, 0.14, 0.02, 0.10])]; }
    const onTime = lt <= prom;
    const wmsBad = cd === 1 && t >= WMS && m <= 6;
    let incMot: string | null = null;
    const pInc = 0.022 + (wmsBad ? 0.035 : 0) + (bf ? 0.02 : 0) - (cd === 1 && m >= 7 ? 0.008 : 0);
    if (R.r() < pInc) incMot = wmsBad ? (R.r() < 0.75 ? 'Erro de separação' : 'Falta de estoque') : MOT_INC[R.pickW([0.55, 0.45])];
    const peso = Math.round(180 * Math.exp(R.n() * 0.6));
    const valor = Math.round(peso * 38 * Math.exp(R.n() * 0.3));
    const dmg = R.r() < CA.dmg * (bf ? 1.5 : 1);
    const rate = 0.25 * prom;
    const frete = Math.round((85 + peso * rate) * CA.cost * (t >= DIESEL ? 1.09 : 1) * Math.exp(R.n() * 0.08) * 100) / 100;
    const linhas = 3 + R.poisson(6);
    day[cd].pedidos++; day[cd].linhas += linhas;
    S.push({ t, m, cd, rg, uf, ca, prom, lt, onTime, inFull: !incMot, otif: onTime && !incMot, motivo: onTime ? null : motivo || 'Trânsito e rodovias', incMot, peso, valor, frete, dmg, linhas, nf: ++nfn });
  }
  CDS.forEach((C, ci) => {
    let f = 1;
    if (ci === 1 && t >= WMS) f = m === 4 ? 0.9 : m === 5 ? 0.76 : m === 6 ? 0.92 : 1.16;
    if (bf) f *= 0.93;
    const prod = C.prod * f * Math.exp(R.n() * 0.05);
    const L = day[ci].linhas;
    const errRate = 0.0022 * (ci === 1 && t >= WMS && m <= 6 ? 3.2 : ci === 1 && m >= 7 ? 0.7 : 1) * (bf ? 1.4 : 1);
    W.push({ t, m, cd: ci, pedidos: day[ci].pedidos, linhas: L, horas: L / prod, erros: R.binom(L, errRate) });
  });
}
/** ocupação e acuracidade mensais por CD */
export const OCC = CDS.map((_, ci) => MONTHS.map((mm) => { let o = [0.86, 0.80, 0.83][ci] + (mm.mo === 10 ? 0.07 : mm.mo === 11 ? 0.04 : 0) + R.n() * 0.012; if (ci === 1 && mm.i >= 7) o -= 0.06; return Math.min(0.98, o); }));
export const ACC = CDS.map((_, ci) => MONTHS.map((mm) => { let a = 0.986 + R.n() * 0.002; if (ci === 1 && (mm.i === 5 || mm.i === 6)) a = 0.968 + R.n() * 0.002; if (ci === 1 && mm.i >= 7) a = 0.993 + R.n() * 0.001; if (ci === 2) a -= 0.004; return a; }));

/* ---------------- consultas ---------------- */
export const META = { otif: 0.95, avaria: 0.005, frete: 0.035, prod: 95, erros: 3, occ: 0.90, acc: 0.985 };
export type Filtro = { periodo: Periodo; cd: string; rg: string };

export const sel = (f: Filtro, o: { from?: number; to?: number } = {}) => {
  const de = o.from ?? f.periodo.from, ate = o.to ?? f.periodo.to;
  return S.filter((s) => s.m >= de && s.m <= ate && (f.cd === 'all' || s.cd === +f.cd) && (f.rg === 'all' || s.rg === +f.rg));
};
export const selAll = (f: Filtro) => S.filter((s) => (f.cd === 'all' || s.cd === +f.cd) && (f.rg === 'all' || s.rg === +f.rg));

export type Agg = ReturnType<typeof agg>;
export function agg(rows: Entrega[]) {
  const n = rows.length;
  const frete = sum(rows, (s) => s.frete), valor = sum(rows, (s) => s.valor), peso = sum(rows, (s) => s.peso);
  return {
    n,
    otif: n ? rows.filter((s) => s.otif).length / n : NaN,
    onTime: n ? rows.filter((s) => s.onTime).length / n : NaN,
    inFull: n ? rows.filter((s) => s.inFull).length / n : NaN,
    lt: mean(rows.map((s) => s.lt)), prom: mean(rows.map((s) => s.prom)),
    atraso: n ? rows.filter((s) => !s.onTime).length / n : NaN,
    dmg: n ? rows.filter((s) => s.dmg).length / n : NaN,
    frete, valor, peso,
    fretePct: frete / Math.max(1, valor), kg: frete / Math.max(1, peso), porEntrega: n ? frete / n : NaN,
  };
}
export const byMonth = <T,>(rows: Entrega[], fn: (r: Entrega[]) => T) => MONTHS.map((mm) => fn(rows.filter((s) => s.m === mm.i)));

export const wSel = (f: Filtro, o: { from?: number; to?: number } = {}) =>
  W.filter((w) => w.m >= (o.from ?? f.periodo.from) && w.m <= (o.to ?? f.periodo.to) && (f.cd === 'all' || w.cd === +f.cd));
export const wAgg = (rows: DiaCD[]) => ({
  linhas: sum(rows, (w) => w.linhas), horas: sum(rows, (w) => w.horas), erros: sum(rows, (w) => w.erros),
  prod: sum(rows, (w) => w.linhas) / Math.max(1e-9, sum(rows, (w) => w.horas)),
  errK: (sum(rows, (w) => w.erros) / Math.max(1, sum(rows, (w) => w.linhas))) * 1000,
});
