import { S } from '../dados';
import { fN } from '../kit/formato';
import { Card } from '../kit/ui';

export default function Sobre() {
  return (
    <>
      <div className="grade g2">
        <Card titulo="A empresa e os dados">
          <div className="prosa">
            <p>A <b>Rotalume Logística</b> é fictícia. Ela distribui mercadorias para lojas de todo o Brasil a partir de três centros de distribuição: <b>Campos dos Goytacazes (RJ)</b>, <b>Campinas (SP)</b> e <b>Recife (PE)</b>.</p>
            <p>Os dados são gerados no navegador com semente fixa: <b>{fN(S.length)}</b> entregas entre nov/2025 e out/2026, com peso, valor, transportadora, prazos, motivos de falha e custo de frete, além dos registros diários de cada CD.</p>
            <p>Eventos colocados de propósito para a análise encontrar:</p>
            <ul>
              <li><b>Black Friday (nov/2025):</b> volume 70% maior e atrasos na expedição.</li>
              <li><b>Transportadora Gama:</b> é a mais barata do Norte e Nordeste, mas atrasa e avaria mais.</li>
              <li><b>Novo WMS em Campinas (mar/2026):</b> a produtividade cai em abril e depois supera a anterior.</li>
              <li><b>Diesel mais caro (jun/2026):</b> o frete por kg sobe cerca de 9%.</li>
              <li><b>Chuvas de verão (jan–fev/2026):</b> mais atrasos no Sudeste.</li>
            </ul>
          </div>
        </Card>
        <Card titulo="Metas usadas no painel">
          <div className="prosa">
            <ul>
              <li>OTIF ≥ 95% · Avarias ≤ 0,5% · Frete ≤ 3,5% do valor · Prazo dentro do prometido</li>
              <li>Produtividade ≥ 95 linhas/hora · Erros ≤ 3 por mil linhas · Ocupação ≤ 90% · Acuracidade ≥ 98,5%</li>
            </ul>
            <p>As metas são referências comuns de mercado, usadas aqui como exemplo.</p>
            <p><b>Como foi construído:</b> React + TypeScript com Vite, gráficos em Recharts com as cores do tema, filtros que ficam salvos no navegador e identidade visual compartilhada com os outros painéis da Rotalume.</p>
          </div>
        </Card>
      </div>
      <Card titulo="Como cada indicador é calculado">
        <div className="defs">
          <div className="def"><b>OTIF</b><code>no prazo E completas ÷ entregas</code><span>No prazo: dias reais ≤ dias prometidos. Completa: todos os itens do pedido entregues.</span></div>
          <div className="def"><b>Lead time</b><code>dias entre a saída do CD e a entrega</code><span>Comparado com o prazo prometido para a região.</span></div>
          <div className="def"><b>Avaria</b><code>entregas com dano ÷ entregas</code><span>Mercadoria danificada no transporte.</span></div>
          <div className="def"><b>Frete %</b><code>custo do frete ÷ valor da nota fiscal</code><span>Peso do frete na margem.</span></div>
          <div className="def"><b>Frete por kg</b><code>custo do frete ÷ peso transportado</code><span>Compara transportadoras e regiões.</span></div>
          <div className="def"><b>Produtividade</b><code>linhas separadas ÷ horas trabalhadas</code><span>Uma linha é um item do pedido.</span></div>
          <div className="def"><b>Erros de separação</b><code>linhas com erro ÷ linhas × 1.000</code><span>Encontrados na conferência.</span></div>
          <div className="def"><b>Acuracidade</b><code>posições sem divergência ÷ posições contadas</code><span>Inventário cíclico.</span></div>
        </div>
      </Card>
    </>
  );
}
