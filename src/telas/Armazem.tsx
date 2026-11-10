import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { useFiltro } from '../App';
import { ACC, CDS, META, OCC, W, wAgg, wSel } from '../dados';
import { fN, fP, mean, nf, statusOf, STATUS_TXT } from '../kit/formato';
import { MONTHS, periodLabel, prevRange } from '../kit/meses';
import { Card, Delta, Kpis, Legenda, Manchete, Pill } from '../kit/ui';
import { eixoX, eixoY, faixasForaDoPeriodo, grade, Grafico, margem, opMes, passos, tt, useCores } from '../kit/graficos';

export default function Armazem() {
  const f = useFiltro();
  const cor = useCores();
  const { from, to } = f.periodo;
  const inR = (m: number) => m >= from && m <= to;
  const a = wAgg(wSel(f));
  const pr = prevRange(f.periodo);
  const b = pr ? wAgg(wSel(f, { from: pr[0], to: pr[1] })) : null;
  const cds = f.cd === 'all' ? [0, 1, 2] : [+f.cd];
  const occ = mean(cds.map((ci) => mean(OCC[ci].slice(from, to + 1)))), acc = mean(cds.map((ci) => mean(ACC[ci].slice(from, to + 1))));
  const per = [0, 1, 2].map((ci) => ({ ci, a: wAgg(W.filter((x) => x.cd === ci && inR(x.m))) }));
  const best = [...per].sort((x, y) => y.a.prod - x.a.prod)[0];
  const campPre = wAgg(W.filter((x) => x.cd === 1 && x.m >= 0 && x.m <= 3)), campPos = wAgg(W.filter((x) => x.cd === 1 && x.m >= 7));
  const quem = f.cd === 'all' ? 'Os CDs separaram' : `O CD ${CDS[+f.cd].nome} separou`;

  const porMes = MONTHS.map((mm) => {
    const o: Record<string, number | string> = { mes: mm.label, i: mm.i };
    cds.forEach((ci) => {
      const w = wAgg(W.filter((x) => x.m === mm.i && x.cd === ci));
      o[`prod_${ci}`] = +w.prod.toFixed(1);
      o[`err_${ci}`] = +w.errK.toFixed(2);
      o[`occ_${ci}`] = +(OCC[ci][mm.i] * 100).toFixed(1);
    });
    return o;
  });
  const sparkProd = MONTHS.map((mm) => wAgg(W.filter((x) => x.m === mm.i && cds.includes(x.cd))).prod);
  const sparkErr = MONTHS.map((mm) => wAgg(W.filter((x) => x.m === mm.i && cds.includes(x.cd))).errK);

  return (
    <>
      <Manchete
        status={statusOf(a.prod, META.prod, true, 0.05)}
        titulo={`${quem} ${fN(a.prod, 0)} linhas por hora ${periodLabel(f.periodo)}, com ${fN(a.errK, 1)} erros a cada mil linhas.`}
        texto={<>
          {f.cd === 'all' || f.cd === '1' ? <>Depois da troca do sistema de armazém (WMS) em março, Campinas caiu em abril e depois passou de {fN(campPre.prod, 0)} para <b>{fN(campPos.prod, 0)} linhas/hora</b> (+{fP(campPos.prod / campPre.prod - 1, 0)}). </> : null}
          {f.cd === 'all' ? <>O CD mais produtivo no período é <b>{CDS[best.ci].curto}</b>.</> : null}
        </>}
      />

      <Kpis itens={[
        { label: 'Produtividade', tip: 'Linhas de pedido separadas por hora trabalhada. Uma linha é um item do pedido, em qualquer quantidade.', value: fN(a.prod, 0), unit: ' linhas/h', target: 'Meta ≥ 95', status: statusOf(a.prod, META.prod, true, 0.05), delta: <Delta atual={a.prod} anterior={b?.prod} sobeBom fmt={(x) => nf(1).format(x)} />, spark: sparkProd },
        { label: 'Erros de separação', tip: 'Itens errados ou faltando encontrados na conferência, a cada mil linhas separadas.', value: fN(a.errK, 1), unit: ' ‰', target: 'Meta ≤ 3 por mil', status: statusOf(a.errK, META.erros, false, 0.15), delta: <Delta atual={a.errK} anterior={b?.errK} sobeBom={false} fmt={(x) => nf(1).format(x)} />, spark: sparkErr },
        { label: 'Ocupação', tip: 'Parte das posições de estoque em uso. Acima de 90% fica difícil guardar e separar com agilidade.', value: fN(occ * 100, 1), unit: '%', target: 'Meta ≤ 90%', status: statusOf(occ, META.occ, false, 0.03), spark: MONTHS.map((_, i) => mean(cds.map((ci) => OCC[ci][i]))) },
        { label: 'Acuracidade do estoque', tip: 'Posições em que o estoque físico bateu com o sistema no inventário cíclico.', value: fN(acc * 100, 1), unit: '%', target: 'Meta ≥ 98,5%', status: statusOf(acc, META.acc, true, 0.01), spark: MONTHS.map((_, i) => mean(cds.map((ci) => ACC[ci][i]))) },
      ]} />

      <div className="grade g-7-5">
        <Card titulo="Quantas linhas cada CD separa por hora?" sub="Produtividade mensal. A linha vertical marca a troca do WMS em Campinas.">
          <Legenda itens={[...cds.map((ci) => ({ label: CDS[ci].nome, cor: cor.serie[ci], tipo: 'linha' as const })), { label: 'Meta 95', tipo: 'tracejado' as const }]} />
          <Grafico rotulo="Produtividade mensal por CD" altura={290}>
            <LineChart data={porMes} margin={margem}>
              <CartesianGrid {...grade} />
              {faixasForaDoPeriodo(from, to)}
              <XAxis dataKey="mes" {...eixoX} />
              <YAxis {...eixoY} domain={[70, 130]} ticks={passos(70, 130, 10)} />
              <ReferenceLine y={95} stroke={cor['ink-2']} strokeDasharray="5 4" />
              {cds.includes(1) ? <ReferenceLine x={MONTHS[4].label} stroke={cor.warn} strokeDasharray="2 3" label={{ value: 'Novo WMS', position: 'insideTopLeft', fill: cor.warn }} /> : null}
              <Tooltip content={tt((v) => `${nf(0).format(v)} linhas/h`)} />
              {cds.map((ci) => <Line key={ci} dataKey={`prod_${ci}`} name={CDS[ci].curto} stroke={cor.serie[ci]} strokeWidth={2.4} dot={{ r: 3, fill: cor.serie[ci] }} isAnimationActive={false} />)}
            </LineChart>
          </Grafico>
        </Card>
        <Card titulo="Situação de cada CD" sub={`Resultado ${periodLabel(f.periodo)}. A situação é a do pior indicador.`}>
          <div className="tabela-wrap">
            <table>
              <thead><tr><th>CD</th><th className="n">Linhas/h</th><th className="n">Erros ‰</th><th className="n">Ocupação</th><th>Situação</th></tr></thead>
              <tbody>
                {per.map((x) => {
                  const o = mean(OCC[x.ci].slice(from, to + 1));
                  const s = [statusOf(x.a.prod, META.prod, true, 0.05), statusOf(x.a.errK, META.erros, false, 0.15), statusOf(o, META.occ, false, 0.03)];
                  const pior = s.includes('bad') ? 'bad' : s.includes('warn') ? 'warn' : 'ok';
                  return (
                    <tr key={x.ci}>
                      <td><b>{CDS[x.ci].nome}</b></td>
                      <td className="n">{fN(x.a.prod, 0)}</td>
                      <td className="n">{fN(x.a.errK, 1)}</td>
                      <td className="n">{fP(o, 0)}</td>
                      <td><Pill status={pior}>{STATUS_TXT[pior]}</Pill></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grade g2">
        <Card titulo="Erros de separação por mês" sub="Erros a cada mil linhas. Meta: até 3.">
          <Legenda itens={[...cds.map((ci) => ({ label: CDS[ci].curto, cor: cor.serie[ci] })), { label: 'Meta 3‰', tipo: 'tracejado' as const }]} />
          <Grafico rotulo="Erros de separação por mês" altura={260}>
            <BarChart data={porMes} margin={margem}>
              <CartesianGrid {...grade} />
              <XAxis dataKey="mes" {...eixoX} />
              <YAxis {...eixoY} />
              <ReferenceLine y={3} stroke={cor['ink-2']} strokeDasharray="5 4" />
              <Tooltip cursor={{ fill: cor['accent-soft'], opacity: 0.4 }} content={tt((v) => `${nf(1).format(v)} por mil`)} />
              {cds.map((ci) => (
                <Bar key={ci} dataKey={`err_${ci}`} name={CDS[ci].curto} fill={cor.serie[ci]} radius={[3, 3, 0, 0]} maxBarSize={14} isAnimationActive={false}>
                  {porMes.map((p) => <Cell key={String(p.mes)} fillOpacity={opMes(Number(p.i), from, to)} />)}
                </Bar>
              ))}
            </BarChart>
          </Grafico>
        </Card>
        <Card titulo="Ocupação do armazém" sub="Parte das posições em uso. Acima de 90%, separar e guardar fica lento.">
          <Legenda itens={[...cds.map((ci) => ({ label: CDS[ci].curto, cor: cor.serie[ci], tipo: 'linha' as const })), { label: 'Limite 90%', tipo: 'tracejado' as const }]} />
          <Grafico rotulo="Ocupação mensal por CD" altura={260}>
            <LineChart data={porMes} margin={margem}>
              <CartesianGrid {...grade} />
              {faixasForaDoPeriodo(from, to)}
              <XAxis dataKey="mes" {...eixoX} />
              <YAxis {...eixoY} domain={[70, 100]} ticks={[70, 80, 90, 100]} tickFormatter={(v) => `${v}%`} />
              <ReferenceLine y={90} stroke={cor.bad} strokeDasharray="5 4" />
              <Tooltip content={tt((v) => `${nf(1).format(v)}%`)} />
              {cds.map((ci) => <Line key={ci} dataKey={`occ_${ci}`} name={CDS[ci].curto} stroke={cor.serie[ci]} strokeWidth={2.2} dot={{ r: 2.5, fill: cor.serie[ci] }} isAnimationActive={false} />)}
            </LineChart>
          </Grafico>
        </Card>
      </div>
    </>
  );
}
