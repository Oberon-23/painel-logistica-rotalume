import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { useFiltro } from '../App';
import { agg, byMonth, CAR, DIESEL, META, REG, sel, selAll } from '../dados';
import { fBRL, fN, fP, nf, statusOf } from '../kit/formato';
import { MONTHS, periodLabel, prevRange } from '../kit/meses';
import { Card, Delta, Kpis, Legenda, Manchete } from '../kit/ui';
import { CaixaTt, eixoX, eixoY, faixasForaDoPeriodo, grade, Grafico, margem, passos, tt, useCores } from '../kit/graficos';

export default function Custos() {
  const f = useFiltro();
  const cor = useCores();
  const { from, to } = f.periodo;
  const rows = sel(f), a = agg(rows);
  const pr = prevRange(f.periodo);
  const b = pr ? agg(sel(f, { from: pr[0], to: pr[1] })) : null;
  const all = selAll(f), mAll = byMonth(all, agg);
  const pre = agg(all.filter((s) => s.t < DIESEL && s.m >= 3)), pos = agg(all.filter((s) => s.t >= DIESEL));
  const regs = REG.map((r, i) => ({ r, a: agg(rows.filter((s) => s.rg === i)) })).filter((x) => x.a.n >= 10);
  const pior = [...regs].sort((x, y) => y.a.fretePct - x.a.fretePct)[0];

  const serieKg = MONTHS.map((mm, i) => ({ mes: mm.label, i, kg: +mAll[i].kg.toFixed(3) }));
  const cars = CAR.map((c, i) => ({ c, i, a: agg(rows.filter((s) => s.ca === i)) })).filter((x) => x.a.n >= 20)
    .map((x) => ({ nome: x.c.nome.replace('Transportadora ', ''), i: x.i, kg: +x.a.kg.toFixed(3), otif: +(x.a.otif * 100).toFixed(1), n: x.a.n }));
  const rs = [...regs].sort((x, y) => y.a.fretePct - x.a.fretePct).map((x) => ({ regiao: x.r, pct: +(x.a.fretePct * 100).toFixed(2), kg: x.a.kg }));
  const kgs = serieKg.map((s) => s.kg);
  const kgT = passos(Math.min(...kgs) - 0.02, Math.max(...kgs) + 0.02, 0.05);
  const cxT = passos(Math.min(...cars.map((x) => x.kg)) - 0.02, Math.max(...cars.map((x) => x.kg)) + 0.02, 0.1);
  const cyMin = Math.floor(Math.min(...cars.map((x) => x.otif)) / 5) * 5;

  return (
    <>
      <Manchete
        status={statusOf(a.fretePct, META.frete, false, 0.05)}
        titulo={`O frete custou ${fBRL(a.frete)} ${periodLabel(f.periodo)}, ou ${fP(a.fretePct, 2)} do valor das mercadorias.`}
        texto={<>Com o diesel mais caro, o frete por kg passou de R$ {fN(pre.kg, 2)} para <b>R$ {fN(pos.kg, 2)}</b> (+{fP(pos.kg / pre.kg - 1, 0)}).{pior && regs.length > 1 ? <> A região mais cara em proporção é o <b>{pior.r}</b> ({fP(pior.a.fretePct, 1)}).</> : null}</>}
      />

      <Kpis itens={[
        { label: 'Custo total de frete', tip: 'Soma do valor pago às transportadoras e do custo da frota própria.', value: fBRL(a.frete), target: `${fN(a.n)} entregas`, delta: <Delta atual={a.frete} anterior={b?.frete} sobeBom={false} fmt={fBRL} />, spark: mAll.map((x) => x.frete) },
        { label: 'Frete sobre o valor', tip: 'Frete dividido pelo valor das notas fiscais transportadas.', value: fN(a.fretePct * 100, 2), unit: '%', target: 'Meta ≤ 3,5%', status: statusOf(a.fretePct, META.frete, false, 0.05), delta: <Delta atual={a.fretePct} anterior={b?.fretePct} sobeBom={false} fmt={(x) => `${nf(2).format(x * 100)} p.p.`} />, spark: mAll.map((x) => x.fretePct) },
        { label: 'Frete por kg', tip: 'Custo de frete dividido pelo peso transportado.', value: `R$ ${fN(a.kg, 2)}`, target: 'por quilo', delta: <Delta atual={a.kg} anterior={b?.kg} sobeBom={false} fmt={(x) => `R$ ${nf(2).format(x)}`} />, spark: mAll.map((x) => x.kg) },
        { label: 'Custo por entrega', tip: 'Custo médio de frete de cada entrega.', value: `R$ ${fN(a.porEntrega, 0)}`, target: 'média por entrega', delta: <Delta atual={a.porEntrega} anterior={b?.porEntrega} sobeBom={false} fmt={(x) => `R$ ${nf(0).format(x)}`} />, spark: mAll.map((x) => x.porEntrega) },
      ]} />

      <div className="grade g2">
        <Card titulo="Quanto custa levar 1 kg?" sub="Frete por quilo transportado, mês a mês. A linha marca o aumento do diesel em junho.">
          <Grafico rotulo="Frete por kg por mês" altura={270}>
            <AreaChart data={serieKg} margin={margem}>
              <CartesianGrid {...grade} />
              {faixasForaDoPeriodo(from, to)}
              <XAxis dataKey="mes" {...eixoX} />
              <YAxis {...eixoY} width={64} domain={[kgT[0], kgT[kgT.length - 1]]} ticks={kgT} tickFormatter={(v) => `R$ ${nf(2).format(v)}`} />
              <ReferenceLine x={MONTHS[7].label} stroke={cor.warn} strokeDasharray="2 3" label={{ value: 'Diesel +9%', position: 'insideTopRight', fill: cor.warn }} />
              <Tooltip content={tt((v) => `R$ ${nf(2).format(v)} por kg`)} />
              <Area dataKey="kg" name="Frete por kg" stroke={cor.accent} strokeWidth={2.6} fill={cor.accent} fillOpacity={0.12} dot={{ r: 3.5, fill: cor.accent }} isAnimationActive={false} />
            </AreaChart>
          </Grafico>
        </Card>
        <Card titulo="Barato nem sempre compensa" sub="Cada bolha é uma transportadora: mais à direita, mais cara; mais acima, mais pontual. O tamanho é o volume de entregas.">
          <Legenda itens={[...cars.map((x) => ({ label: x.nome, cor: cor.serie[x.i] })), { label: 'Meta OTIF 95%', tipo: 'tracejado' as const }]} />
          <Grafico rotulo="Custo por kg e OTIF por transportadora" altura={270}>
            <ScatterChart margin={{ top: 16, right: 24, bottom: 14, left: 0 }}>
              <CartesianGrid strokeDasharray="0" />
              <XAxis type="number" dataKey="kg" name="Frete por kg" domain={[cxT[0], cxT[cxT.length - 1]]} ticks={cxT} tickFormatter={(v) => nf(2).format(v)} {...eixoX}
                label={{ value: 'Frete por kg (R$)', position: 'insideBottom', offset: -10 }} />
              <YAxis type="number" dataKey="otif" name="OTIF" domain={[cyMin, 100]} ticks={passos(cyMin, 100, 5)} tickFormatter={(v) => `${v}%`} {...eixoY} />
              <ZAxis type="number" dataKey="n" range={[160, 1100]} />
              <ReferenceLine y={95} stroke={cor['ink-2']} strokeDasharray="5 4" />
              <Tooltip cursor={false} content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const x = payload[0].payload as (typeof cars)[number];
                return <CaixaTt titulo={x.nome} linhas={[{ nome: 'Frete por kg', valor: `R$ ${nf(2).format(x.kg)}` }, { nome: 'OTIF', valor: `${nf(1).format(x.otif)}%` }, { nome: 'Entregas', valor: fN(x.n) }]} />;
              }} />
              <Scatter data={cars} isAnimationActive={false}>
                {cars.map((x) => <Cell key={x.nome} fill={cor.serie[x.i]} fillOpacity={0.85} stroke={cor.surface} strokeWidth={2} />)}
              </Scatter>
            </ScatterChart>
          </Grafico>
        </Card>
      </div>

      <Card titulo="Frete como % do valor da mercadoria, por região" sub="Em destaque, as regiões acima da meta de 3,5%.">
        <Legenda itens={[{ label: 'Dentro da meta', cor: cor.accent }, { label: 'Acima da meta', cor: cor.warn }, { label: 'Meta 3,5%', tipo: 'tracejado' }]} />
        <Grafico rotulo="Frete sobre o valor por região" altura={230}>
          <BarChart data={rs} margin={margem}>
            <CartesianGrid {...grade} />
            <XAxis dataKey="regiao" {...eixoX} interval={0} />
            <YAxis {...eixoY} tickFormatter={(v) => `${v}%`} />
            <ReferenceLine y={3.5} stroke={cor['ink-2']} strokeDasharray="5 4" />
            <Tooltip cursor={{ fill: cor['accent-soft'], opacity: 0.4 }} content={tt((v, _n, p) => `${nf(2).format(v)}% · R$ ${nf(2).format(Number(p.kg))}/kg`)} />
            <Bar dataKey="pct" name="Frete sobre o valor" radius={[5, 5, 0, 0]} maxBarSize={48} isAnimationActive={false}>
              {rs.map((x) => <Cell key={x.regiao} fill={x.pct > META.frete * 100 ? cor.warn : cor.accent} />)}
            </Bar>
          </BarChart>
        </Grafico>
      </Card>
    </>
  );
}
