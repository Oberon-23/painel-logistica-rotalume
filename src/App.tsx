import { Navigate, Route, Routes } from 'react-router-dom';
import { BookOpen, House, Truck, Warehouse, Wallet } from 'lucide-react';
import { FiltrosProvider, useFiltros, type DefFiltro } from './kit/filtros';
import { Moldura, type Visao } from './kit/ui';
import { CDS, REG, type Filtro } from './dados';
import Resumo from './telas/Resumo';
import Entregas from './telas/Entregas';
import Armazem from './telas/Armazem';
import Custos from './telas/Custos';
import Sobre from './telas/Sobre';

const FILTROS: DefFiltro[] = [
  { id: 'cd', label: 'Centro de distribuição', options: [['all', 'Todos'], ...CDS.map((c, i) => [String(i), c.nome] as [string, string])] },
  { id: 'rg', label: 'Região', options: [['all', 'Todas'], ...REG.map((r, i) => [String(i), r] as [string, string])] },
];

const VISOES: Visao[] = [
  { path: '/', label: 'Visão geral', icon: <House />, heading: 'Visão geral da logística', sub: 'Entregas, prazo, custo e avarias' },
  { path: '/entregas', label: 'Entregas', icon: <Truck />, heading: 'Entregas e transportadoras', sub: 'Quem entrega no prazo e por que falhamos' },
  { path: '/armazem', label: 'Armazém', icon: <Warehouse />, heading: 'Centros de distribuição', sub: 'Separação, erros, ocupação e inventário', filtros: ['cd'] },
  { path: '/custos', label: 'Custos', icon: <Wallet />, heading: 'Custos de frete', sub: 'Quanto custa entregar e onde economizar' },
  { path: '/sobre', label: 'Sobre os dados', icon: <BookOpen />, heading: 'Sobre os dados', sub: 'Como o painel foi construído', filtros: 'nenhum' },
];

export function useFiltro(): Filtro {
  const { periodo, valor } = useFiltros();
  return { periodo, cd: valor('cd'), rg: valor('rg') };
}

export default function App() {
  return (
    <FiltrosProvider chave="rotalume-log" defs={FILTROS}>
      <Routes>
        <Route element={<Moldura produto="Logística" icone={<Truck size={18} />} visoes={VISOES} asOf="31/10/2026"
          rodape={<>Projeto de portfólio de <a href="https://github.com/Oberon-23">Breno Silva</a> · Rotalume é uma empresa fictícia e todos os dados são simulados.</>} />}>
          <Route index element={<Resumo />} />
          <Route path="entregas" element={<Entregas />} />
          <Route path="armazem" element={<Armazem />} />
          <Route path="custos" element={<Custos />} />
          <Route path="sobre" element={<Sobre />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </FiltrosProvider>
  );
}
