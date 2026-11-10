import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { useFiltro } from '../App';
import { agg, byMonth, CAR, META, REG, sel, selAll } from '../dados';
import { fBRL, fN, fP, fPP, mean, nf, statusOf } from '../kit/formato';
import { MONTHS, periodLabel, prevRange } from '../kit/meses';
import { Card, Delta, Kpis, Legenda, Manchete, Pill, type Achado } from '../kit/ui';
import { eixoX, eixoY, faixasForaDoPeriodo, grade, Grafico, margem, opMes, passos, tt, useCores } from '../kit/graficos';

export default function Resumo() {
  const f = useFiltro();
  const cor = useCores();
  const { from, to } = f.periodo;
  const rows = sel(f), a = agg(rows);
  const pr = prevRange(f.periodo);
  const b = pr ? agg(sel(f, { from: pr[0], to: pr[1] })) : null;
  const mAll = byMonth(selAll(f), agg);
  const regs = REG.map((r, i) => ({ r, i, a: agg(rows.filter((s) => s.rg === i)) })).filter((x) => x.a.n >= 20).sort((x, y) => x.a.otif - y.a.otif);
  const st = statusOf(a.otif, META.otif, true, 0.03);
  const worst = regs[0];

  const serie = MONTHS.map((mm, i) => ({ mes: mm.label, i, OTIF: +(mAll[i].otif * 100).toFixed(1), 'No prazo': +(mAll[i].onTime * 100).toFixed(1), Completas: +(mAll[i].inFull * 100).toFixed(1), n: mAll[i].n }));
  const ys = serie.flatMap((s) => [s.OTIF, s['No prazo']]).filter(Number.isFinite);
  const yMin = Math.floor(Math.min(...ys) / 5) * 5;

  // achados
  const achados: Achado[] = [];
  const cars = CAR.map((c, i) => ({ c, a: agg(rows.filter((s) => s.ca === i)) })).filter((x) => x.a.n >= 30).sort((x, y) => x.a.otif - y.a.otif);
  const why: Record<string, number> = {};
  rows.filter((s) => !s.otif).forEach((s) => { const k = (s.motivo || s.incMot)!; why[k] = (why[k] || 0) + 1; });
  const topWhy = Object.entries(why).sort((x, y) => y[1] - x[1])[0];
  const inR = mAll.map((x, i) => ({ x, i })).filter((o) => o.i >= from && o.i <= to);
  const peak = inR.reduce((p, o) => (o.x.n > p.x.n ? o : p), inR[0]).i;
  if (cars.length > 1) achados.push({ s: cars[0].a.otif < 0.9 ? 'bad' : 'warn', titulo: <><b>{cars[0].c.nome}</b> tem o pior OTIF: {fP(cars[0].a.otif)}.</>, texto: `Também tem ${fP(cars[0].a.dmg, 2)} de avarias. Vale renegociar ou dividir o volume.` });
  if (topWhy) achados.push({ s: 'warn', titulo: <>Principal motivo de falha: <b>{topWhy[0].toLowerCase()}</b>.</>, texto: `${fN(topWhy[1])} entregas (${fP(topWhy[1] / Math.max(1, rows.filter((s) => !s.otif).length), 0)} das falhas).` });
  if (inR.length > 1) achados.push({ s: 'info', titulo: <>Pico de volume em <b>{MONTHS[peak].long}</b>.</>, texto: `${fN(mAll[peak].n)} entregas, ${fP(mAll[peak].n / mean(inR.map((o) => o.x.n)) - 1, 0)} acima da média do período.` });
  else achados.push({ s: 'info', titulo: <>{fN(a.n)} entregas em <b>{MONTHS[from].long}</b>.</>, texto: `Média de ${fN(a.n / Math.max(1, new Set(rows.map((s) => s.t)).size))} por dia útil.` });

  return (
    <>
      <Manchete
        status={st}
        titulo={`${fP(a.otif)} das entregas chegaram no prazo e completas ${periodLabel(f.periodo)}${st === 'ok' ? ', dentro da meta de 95%.' : ', abaixo da meta de 95%.'}`}
        texto={worst && regs.length > 1
          ? <>A região com pior resultado é o <b>{worst.r}</b>, com OTIF de {fP(worst.a.otif)}. Foram {fN(a.n)} entregas, com custo de frete de {fBRL(a.frete)} ({fP(a.fretePct)} do valor transportado).</>
          : `Foram ${fN(a.n)} entregas no período.`}
        achados={achados}
      />

      <Kpis itens={[
        { label: 'OTIF', tip: 'On Time In Full: entregas que chegaram no prazo prometido e com todos os itens. É o principal indicador de nível de serviço da logística.', value: fN(a.otif * 100, 1), unit: '%', target: 'Meta ≥ 95%', status: st, delta: <Delta atual={a.otif} anterior={b?.otif} sobeBom fmt={(x) => fPP(x)} />, spark: mAll.map((x) => x.otif) },
        { label: 'Prazo médio de entrega', tip: 'Lead time: média de dias entre a saída do CD e a entrega ao cliente, comparada com o prazo prometido.', value: fN(a.lt, 1), unit: ' dias', target: `Prometido: ${fN(a.prom, 1)} dias`, delta: <Delta atual={a.lt} anterior={b?.lt} sobeBom={false} fmt={(x) => `${nf(1).format(x)} dia`} />, spark: mAll.map((x) => x.lt) },
        { label: 'Frete sobre o valor', tip: 'Quanto o frete representa do valor da mercadoria transportada. Quanto menor, melhor para a margem.', value: fN(a.fretePct * 100, 2), unit: '%', target: 'Meta ≤ 3,5%', status: statusOf(a.fretePct, META.frete, false, 0.05), delta: <Delta atual={a.fretePct} anterior={b?.fretePct} sobeBom={false} fmt={(x) => `${nf(2).format(x * 100)} p.p.`} />, spark: mAll.map((x) => x.fretePct) },
        { label: 'Avarias', tip: 'Entregas em que alguma mercadoria chegou danificada.', value: fN(a.dmg * 100, 2), unit: '%', target: 'Meta ≤ 0,5%', status: statusOf(a.dmg, META.avaria, false, 0.2), delta: <Delta atual={a.dmg} anterior={b?.dmg} sobeBom={false} fmt={(x) => `${nf(2).format(x * 100)} p.p.`} />, spark: mAll.map((x) => x.dmg) },
      ]} />

      <Card titulo="As entregas chegam no prazo e completas?" sub="OTIF é a combinação dos dois: só conta a entrega que chegou no prazo e com todos os itens.">
        <Legenda itens={[{ label: 'OTIF', cor: cor.accent, tipo: 'linha' }, { label: 'No prazo', cor: cor.c2, tipo: 'linha' }, { label: 'Completas', cor: cor.c3, tipo: 'linha' }, { label: 'Meta 95%', tipo: 'tracejado' }]} />
        <Grafico rotulo="OTIF, no prazo e completas por mês" altura={300}>
          <LineChart data={serie} margin={margem}>
            <CartesianGrid {...grade} />
            {faixasForaDoPeriodo(from, to)}
            <XAxis dataKey="mes" {...eixoX} />
            <YAxis {...eixoY} domain={[yMin, 100]} ticks={passos(yMin, 100, 5)} tickFormatter={(v) => `${v}%`} />
            <ReferenceLine y={95} stroke={cor['ink-2']} strokeDasharray="5 4" />
            <Tooltip content={tt((v) => `${nf(1).format(v)}%`)} />
            <Line dataKey="OTIF" stroke={cor.accent} strokeWidth={3} dot={{ r: 4, fill: cor.accent }} isAnimationActive={false} />
            <Line dataKey="No prazo" stroke={cor.c2} strokeWidth={1.8} dot={{ r: 2.5, fill: cor.c2 }} isAnimationActive={false} />
            <Line dataKey="Completas" stroke={cor.c3} strokeWidth={1.8} dot={{ r: 2.5, fill: cor.c3 }} isAnimationActive={false} />
          </LineChart>
        </Grafico>
      </Card>

      <div className="grade g-5-7">
        <Card titulo="Quantas entregas fizemos por mês?" sub="Novembro e dezembro concentram a Black Friday e o Natal.">
          <Grafico rotulo="Entregas por mês" altura={260}>
            <BarChart data={serie} margin={margem}>
              <CartesianGrid {...grade} />
              <XAxis dataKey="mes" {...eixoX} />
              <YAxis {...eixoY} tickFormatter={(v) => fN(v)} />
              <Tooltip cursor={{ fill: cor['accent-soft'], opacity: 0.4 }} content={tt((v) => `${fN(v)}`)} />
              <Bar dataKey="n" name="Entregas" fill={cor.accent} radius={[5, 5, 0, 0]} maxBarSize={34} isAnimationActive={false}>
                {serie.map((s) => <Cell key={s.mes} fillOpacity={opMes(s.i, from, to)} />)}
              </Bar>
            </BarChart>
          </Grafico>
        </Card>
        <Card titulo="Como cada região está sendo atendida?" sub="Da pior para a melhor em OTIF, no período escolhido.">
          <div className="tabela-wrap">
            <table>
              <thead><tr><th>Região</th><th className="n">Entregas</th><th className="n">OTIF</th><th className="n">Prazo médio</th><th className="n">Frete</th></tr></thead>
              <tbody>
                {regs.map((x) => (
                  <tr key={x.r}>
                    <td><b>{x.r}</b></td>
                    <td className="n">{fN(x.a.n)}</td>
                    <td className="n"><Pill status={statusOf(x.a.otif, META.otif, true, 0.03)}>{fP(x.a.otif)}</Pill></td>
                    <td className="n">{fN(x.a.lt, 1)} de {fN(x.a.prom, 1)} dias</td>
                    <td className="n"><Pill status={statusOf(x.a.fretePct, META.frete, false, 0.1)}>{fP(x.a.fretePct)}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
