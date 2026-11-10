import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { useFiltro } from '../App';
import { agg, CAR, META, MOTIVOS_DO_CD, REG, sel } from '../dados';
import { fN, fP, fPP, mean, nf, statusOf, sum } from '../kit/formato';
import { periodLabel, prevRange } from '../kit/meses';
import { Card, Delta, Kpis, Legenda, Manchete, Pill } from '../kit/ui';
import { CaixaTt, eixoX, eixoY, grade, Grafico, margem, tt, useCores } from '../kit/graficos';

export default function Entregas() {
  const f = useFiltro();
  const cor = useCores();
  const rows = sel(f), a = agg(rows);
  const pr = prevRange(f.periodo);
  const b = pr ? agg(sel(f, { from: pr[0], to: pr[1] })) : null;
  const late = rows.filter((s) => !s.onTime);
  const cars = CAR.map((c, i) => ({ c, i, a: agg(rows.filter((s) => s.ca === i)) })).filter((x) => x.a.n >= 20);
  const worst = [...cars].sort((x, y) => x.a.otif - y.a.otif)[0], best = [...cars].sort((x, y) => y.a.otif - x.a.otif)[0];

  const cs = [...cars].sort((x, y) => y.a.otif - x.a.otif).map((x) => ({ nome: x.c.nome.replace('Transportadora ', ''), otif: +(x.a.otif * 100).toFixed(1), n: x.a.n, dmg: x.a.dmg }));

  const why: Record<string, number> = {};
  rows.forEach((s) => { if (!s.onTime) why[s.motivo!] = (why[s.motivo!] || 0) + 1; if (s.incMot) why[s.incMot] = (why[s.incMot] || 0) + 1; });
  const ws = Object.entries(why).sort((x, y) => y[1] - x[1]).map(([motivo, n]) => ({ motivo, n, cd: MOTIVOS_DO_CD.includes(motivo) }));
  const wt = sum(ws, (x) => x.n);

  const rg = REG.map((r, i) => ({ r, a: agg(rows.filter((s) => s.rg === i)) })).filter((x) => x.a.n >= 10)
    .map((x) => ({ regiao: x.r, Prometido: +x.a.prom.toFixed(2), Real: +x.a.lt.toFixed(2) }));
  const mat = CAR.map((c, ci) => ({ c, cells: REG.map((_, ri) => agg(rows.filter((s) => s.ca === ci && s.rg === ri))) }));

  return (
    <>
      <Manchete
        status={statusOf(a.onTime, META.otif, true, 0.03)}
        titulo={`${fP(a.onTime)} das entregas chegaram dentro do prazo prometido ${periodLabel(f.periodo)}.`}
        texto={worst && best && worst !== best
          ? <>A <b>{best.c.nome}</b> é a mais pontual ({fP(best.a.otif)} de OTIF) e a <b>{worst.c.nome}</b> a menos pontual ({fP(worst.a.otif)}). Em média, as atrasadas chegaram {fN(mean(late.map((s) => s.lt - s.prom)), 1)} dia depois do combinado.</>
          : undefined}
      />

      <Kpis itens={[
        { label: 'No prazo', tip: 'Entregas que chegaram até o dia prometido ao cliente, sem contar se vieram completas.', value: fN(a.onTime * 100, 1), unit: '%', target: 'Meta ≥ 95%', status: statusOf(a.onTime, 0.95, true, 0.03), delta: <Delta atual={a.onTime} anterior={b?.onTime} sobeBom fmt={(x) => fPP(x)} /> },
        { label: 'Completas', tip: 'Entregas com todos os itens do pedido. Falhas aqui vêm do armazém (erro de separação ou falta de estoque).', value: fN(a.inFull * 100, 1), unit: '%', target: 'Meta ≥ 98%', status: statusOf(a.inFull, 0.98, true, 0.01), delta: <Delta atual={a.inFull} anterior={b?.inFull} sobeBom fmt={(x) => fPP(x)} /> },
        { label: 'Entregas atrasadas', tip: 'Quantidade de entregas que passaram do prazo prometido.', value: fN(late.length), target: `${fP(late.length / Math.max(1, rows.length))} do total · meta ≤ 5%`, status: statusOf(late.length / Math.max(1, rows.length), 0.05, false, 0.3) },
        { label: 'Avarias', tip: 'Entregas com mercadoria danificada no transporte.', value: fN(a.dmg * 100, 2), unit: '%', target: 'Meta ≤ 0,5%', status: statusOf(a.dmg, META.avaria, false, 0.2), delta: <Delta atual={a.dmg} anterior={b?.dmg} sobeBom={false} fmt={(x) => `${nf(2).format(x * 100)} p.p.`} /> },
      ]} />

      <div className="grade g2">
        <Card titulo="Qual transportadora entrega melhor?" sub="OTIF de cada parceiro. Verde na meta, amarelo perto, vermelho abaixo de 90%.">
          <Grafico semDados={!cs.length} rotulo="OTIF por transportadora" altura={260}>
            <BarChart data={cs} layout="vertical" margin={{ top: 16, right: 24, bottom: 0, left: 8 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="nome" {...eixoY} width={96} tick={{ fontWeight: 600 }} />
              <ReferenceLine x={95} stroke={cor['ink-2']} strokeDasharray="5 4" label={{ value: 'Meta', position: 'top' }} />
              <Tooltip cursor={{ fill: cor['accent-soft'], opacity: 0.4 }} content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const x = payload[0].payload as (typeof cs)[number];
                return <CaixaTt titulo={x.nome} linhas={[{ nome: 'OTIF', valor: `${nf(1).format(x.otif)}%` }, { nome: 'Entregas', valor: fN(x.n) }, { nome: 'Avarias', valor: fP(x.dmg, 2) }]} />;
              }} />
              <Bar dataKey="otif" radius={[0, 5, 5, 0]} maxBarSize={26} isAnimationActive={false}>
                {cs.map((x) => <Cell key={x.nome} fill={x.otif < 95 ? (x.otif < 90 ? cor.bad : cor.warn) : cor.good} />)}
                <LabelList dataKey="otif" position="insideRight" formatter={(v: unknown) => `${nf(1).format(Number(v))}%`} fontSize={12} fontWeight={700} fill={cor.surface} />
              </Bar>
            </BarChart>
          </Grafico>
        </Card>
        <Card titulo="Por que as entregas falham?" sub="Atrasos e entregas incompletas por motivo. Em laranja, o que nasce dentro do CD.">
          <Legenda itens={[{ label: 'Transporte', cor: cor.c1 }, { label: 'Dentro do CD', cor: cor.c2 }]} />
          <Grafico semDados={!ws.length} vazio="Nenhuma falha de entrega neste recorte." rotulo="Motivos de falha" altura={Math.max(240, ws.length * 30 + 20)}>
            <BarChart data={ws} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="motivo" {...eixoY} width={176} interval={0} />
              <Tooltip cursor={{ fill: cor['accent-soft'], opacity: 0.4 }} content={tt((v, _n, p) => `${fN(v)} (${fP(v / wt, 0)}) · ${p.cd ? 'dentro do CD' : 'transporte'}`)} />
              <Bar dataKey="n" name="Ocorrências" radius={[0, 5, 5, 0]} maxBarSize={22} isAnimationActive={false}>
                {ws.map((x) => <Cell key={x.motivo} fill={x.cd ? cor.c2 : cor.c1} />)}
              </Bar>
            </BarChart>
          </Grafico>
        </Card>
      </div>

      <div className="grade g-5-7">
        <Card titulo="Prazo prometido × prazo real" sub="Média de dias por região de destino.">
          <Legenda itens={[{ label: 'Prometido', cor: cor['seq-3'] }, { label: 'Real', cor: cor['seq-6'] }]} />
          <Grafico semDados={!rg.length} rotulo="Prazo prometido e real por região" altura={260}>
            <BarChart data={rg} margin={margem}>
              <CartesianGrid {...grade} />
              <XAxis dataKey="regiao" {...eixoX} interval={0} />
              <YAxis {...eixoY} tickFormatter={(v) => `${v} d`} />
              <Tooltip cursor={{ fill: cor['accent-soft'], opacity: 0.4 }} content={tt((v) => `${nf(1).format(v)} dias`)} />
              <Bar dataKey="Prometido" fill={cor['seq-3']} radius={[5, 5, 0, 0]} maxBarSize={36} isAnimationActive={false} />
              <Bar dataKey="Real" fill={cor['seq-6']} radius={[5, 5, 0, 0]} maxBarSize={36} isAnimationActive={false} />
            </BarChart>
          </Grafico>
        </Card>
        <Card titulo="OTIF por transportadora e região" sub="Cada célula mostra o OTIF da combinação. Traço quando há menos de 10 entregas.">
          <div className="tabela-wrap">
            <table>
              <thead><tr><th>Transportadora</th>{REG.map((r) => <th key={r} className="n">{r}</th>)}</tr></thead>
              <tbody>
                {mat.map((x) => (
                  <tr key={x.c.nome}>
                    <td><b>{x.c.nome}</b></td>
                    {x.cells.map((c, i) => (
                      <td key={i} className="n">{c.n < 10 ? <span className="fraco">—</span> : <span title={`${fN(c.n)} entregas`}><Pill status={statusOf(c.otif, META.otif, true, 0.03)}>{fP(c.otif)}</Pill></span>}</td>
                    ))}
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
