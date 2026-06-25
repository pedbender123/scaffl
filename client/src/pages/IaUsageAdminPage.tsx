import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  Coins, Sparkles, TrendingUp, Calendar, School, Users2,
  RefreshCw, AlertTriangle, ArrowRight, DollarSign, Activity
} from 'lucide-react';

interface IaUsageResponse {
  summary: {
    creditsChat: number;
    creditsLab: number;
    creditsTotal: number;
    reaisChat: number;
    reaisLab: number;
    reaisTotal: number;
    spendCap: number;
    externalInitialSpend: number;
    grandTotalReais: number;
  };
  institutions: Array<{
    id: string;
    name: string;
    chatCredits: number;
    labCredits: number;
    totalCredits: number;
    totalReais: number;
  }>;
  classrooms: Array<{
    id: string;
    name: string;
    chatCredits: number;
    labCredits: number;
    totalCredits: number;
    totalReais: number;
  }>;
  topUsers: Array<{
    id: string;
    name: string;
    email: string;
    chatCredits: number;
    labCredits: number;
    totalCredits: number;
    totalReais: number;
  }>;
  history: {
    h24: Array<{ period: string; chatCredits: number; labCredits: number; totalCredits: number; totalReais: number }>;
    d7: Array<{ period: string; chatCredits: number; labCredits: number; totalCredits: number; totalReais: number }>;
    d30: Array<{ period: string; chatCredits: number; labCredits: number; totalCredits: number; totalReais: number }>;
  };
}

export default function IaUsageAdminPage() {
  const [data, setData] = useState<IaUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'h24' | 'd7' | 'd30'>('d7');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; label: string; value: number } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<IaUsageResponse>('/api/admin/ia-usage');
      setData(res);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar dados de uso de IA do servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-4">
        <RefreshCw className="animate-spin text-primary" size={36} />
        <p className="text-slate-500 dark:text-slate-450 font-medium text-sm animate-pulse">Carregando métricas de IA de produção...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-6 rounded-3xl text-center space-y-3">
          <AlertTriangle className="mx-auto text-red-500" size={36} />
          <h3 className="text-lg font-black text-red-800 dark:text-red-300">Erro de Carregamento</h3>
          <p className="text-sm text-red-650 dark:text-red-400">{error || 'Dados indisponíveis no momento.'}</p>
          <button onClick={fetchData} className="px-5 py-2.5 bg-red-600 hover:bg-red-750 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const { summary, institutions, classrooms, topUsers, history } = data;
  const currentHistory = history[timeRange] || [];

  // Configuração do gráfico SVG
  const width = 800;
  const height = 240;
  const paddingX = 50;
  const paddingY = 30;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Encontrar valores máximos do histórico para normalizar o gráfico
  const maxVal = Math.max(...currentHistory.map(h => h.totalReais), 0.01) * 1.15; // 15% margem no topo

  const getCoordinates = () => {
    if (currentHistory.length === 0) return [];
    return currentHistory.map((item, index) => {
      const x = paddingX + (index / (currentHistory.length - 1 || 1)) * chartWidth;
      const y = paddingY + chartHeight - (item.totalReais / maxVal) * chartHeight;
      
      // Formatação legível da label de tempo
      let label = item.period;
      if (timeRange === 'h24') {
        const hour = new Date(item.period).getHours();
        label = `${hour}h`;
      } else {
        const parts = item.period.split('-');
        if (parts.length === 3) label = `${parts[2]}/${parts[1]}`;
      }

      return { x, y, label, value: item.totalReais, credits: item.totalCredits };
    });
  };

  const coords = getCoordinates();

  // Gerar o SVG Path da linha
  const getLinePath = () => {
    if (coords.length === 0) return '';
    return coords.reduce((acc, point, idx) => {
      return idx === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
    }, '');
  };

  // Gerar o SVG Path da área abaixo da linha (com gradiente)
  const getAreaPath = () => {
    if (coords.length === 0) return '';
    const linePath = getLinePath();
    const first = coords[0];
    const last = coords[coords.length - 1];
    const baselineY = paddingY + chartHeight;
    return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
  };

  const formatPeriodTitle = () => {
    if (timeRange === 'h24') return 'Últimas 24 Horas';
    if (timeRange === 'd7') return 'Últimos 7 Dias';
    return 'Últimos 30 Dias';
  };

  // Cálculo da porcentagem de progresso de uso
  const spendPercent = Math.min((summary.grandTotalReais / summary.spendCap) * 100, 100);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-fadeIn">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="text-primary" size={28} />
            Consumo e Custos de IA (Gemini)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Acompanhe em tempo real os custos em Reais (BRL) e créditos da API nos chats e laboratórios.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
        >
          <RefreshCw size={14} />
          Atualizar Dados
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card 1: Gasto Total Acumulado */}
        <div className="bg-gradient-to-br from-indigo-500 to-primary text-white p-6 rounded-3xl shadow-xl shadow-primary/20 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
            <DollarSign size={140} />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-xs font-black uppercase tracking-widest text-indigo-100">Gasto Total Acumulado</span>
            <div className="p-1.5 bg-white/10 rounded-lg text-white">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-3xl font-black tracking-tight">R$ {summary.grandTotalReais.toFixed(2)}</h2>
            <p className="text-xs text-indigo-100 mt-1 font-semibold">
              R$ {summary.reaisTotal.toFixed(2)} (API) + R$ {summary.externalInitialSpend.toFixed(2)} (Fixo)
            </p>
          </div>
        </div>

        {/* Card 2: Consumo da API */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">Uso no Servidor (BD)</span>
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100">R$ {summary.reaisTotal.toFixed(2)}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-450 mt-1">
              {(summary.creditsTotal / 1000).toLocaleString('pt-BR')}k créditos consumidos
            </p>
          </div>
        </div>

        {/* Card 3: Chat vs Lab */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">Chats vs Simuladores</span>
            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500">
              <Activity size={16} />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-650 dark:text-slate-350">
              <span>Monitorias Chat:</span>
              <span>R$ {summary.reaisChat.toFixed(3)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-650 dark:text-slate-350">
              <span>Laboratório:</span>
              <span>R$ {summary.reaisLab.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Limite Mensal */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">Teto Financeiro</span>
            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex justify-between items-end mb-1">
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">R$ {summary.spendCap.toFixed(2)}</h2>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-0.5">{spendPercent.toFixed(0)}%</span>
            </div>
            {/* Barra de Progresso */}
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-550"
                style={{ width: `${spendPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seção Gráfica e Histórico */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Curva de Consumo — {formatPeriodTitle()}
            </h3>
            <p className="text-xs text-slate-450 mt-0.5">Valores acumulados em Reais (BRL)</p>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 self-start">
            {(['h24', 'd7', 'd30'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  timeRange === range
                    ? 'bg-white dark:bg-slate-850 shadow text-primary dark:text-white'
                    : 'text-slate-500 dark:text-slate-450 hover:text-slate-750'
                }`}
              >
                {range === 'h24' ? '24h' : range === 'd7' ? '7 dias' : '30 dias'}
              </button>
            ))}
          </div>
        </div>

        {/* Gráfico SVG Customizado */}
        {currentHistory.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-slate-400">
            <span className="text-xs font-semibold">Sem registros no período selecionado.</span>
          </div>
        ) : (
          <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
              <defs>
                <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary, #6366f1)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--color-primary, #6366f1)" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="chartLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>

              {/* Grid Lines Horizontais */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = paddingY + chartHeight * ratio;
                const value = maxVal * (1 - ratio);
                return (
                  <g key={idx} className="opacity-45 dark:opacity-20">
                    <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" />
                    <text x={paddingX - 10} y={y + 4} textAnchor="end" className="text-[10px] font-black fill-slate-400">
                      R$ {value.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Gráfico preenchido e linha */}
              <path d={getAreaPath()} fill="url(#chartAreaGradient)" className="transition-all duration-350" />
              <path d={getLinePath()} fill="none" stroke="url(#chartLineGradient)" strokeWidth="3.5" strokeLinecap="round" className="transition-all duration-350" />

              {/* Grid de Eixo X */}
              {coords.map((c, idx) => {
                const isFirstOrLast = idx === 0 || idx === coords.length - 1;
                const skipOdd = coords.length > 15 && idx % 2 !== 0; // Evita sobreposição se houver muitos dias
                if (skipOdd && !isFirstOrLast) return null;
                return (
                  <text key={idx} x={c.x} y={height - 5} textAnchor="middle" className="text-[9px] font-bold fill-slate-400 dark:fill-slate-500">
                    {c.label}
                  </text>
                );
              })}

              {/* Pontos de interatividade */}
              {coords.map((c, idx) => (
                <circle
                  key={idx}
                  cx={c.x}
                  cy={c.y}
                  r="4"
                  className="fill-white stroke-primary dark:stroke-indigo-400 cursor-pointer transition-all duration-150 hover:r-6"
                  strokeWidth="2.5"
                  onMouseEnter={() => setHoveredPoint({ x: c.x, y: c.y, label: c.label, value: c.value })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </svg>

            {/* Tooltip flutuante */}
            {hoveredPoint && (
              <div 
                className="absolute bg-slate-900 text-white dark:bg-white dark:text-slate-950 p-2.5 rounded-xl shadow-xl text-xs font-black space-y-0.5 border border-slate-800 dark:border-slate-100 pointer-events-none transition-all duration-100"
                style={{ left: `${hoveredPoint.x}px`, top: `${hoveredPoint.y - 65}px`, transform: 'translateX(-50%)' }}
              >
                <div className="text-[9px] text-slate-450 dark:text-slate-500 uppercase tracking-widest">{hoveredPoint.label}</div>
                <div className="text-[13px] tracking-tight">R$ {hoveredPoint.value.toFixed(4)}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabelas de Divisão de Custo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Custos por Instituição */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <School size={16} className="text-primary" />
            Custos por Instituição
          </h3>
          <div className="space-y-4">
            {institutions.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">Sem registros de instituições.</p>
            ) : (
              institutions.map(inst => {
                const percent = Math.min((inst.totalReais / Math.max(...institutions.map(i => i.totalReais), 0.01)) * 100, 100);
                return (
                  <div key={inst.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-800 dark:text-slate-100">{inst.name}</span>
                      <span className="text-slate-650 dark:text-slate-350">
                        R$ {inst.totalReais.toFixed(2)} <span className="text-[10px] text-slate-400">({(inst.totalCredits / 1000).toFixed(0)}k cr)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Custos por Sala de Aula */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <Users2 size={16} className="text-primary" />
            Custos por Sala de Aula
          </h3>
          <div className="space-y-4">
            {classrooms.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">Sem registros de salas de aula.</p>
            ) : (
              classrooms.map(cls => {
                const percent = Math.min((cls.totalReais / Math.max(...classrooms.map(c => c.totalReais), 0.01)) * 100, 100);
                return (
                  <div key={cls.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-800 dark:text-slate-100">{cls.name}</span>
                      <span className="text-slate-650 dark:text-slate-350">
                        R$ {cls.totalReais.toFixed(2)} <span className="text-[10px] text-slate-400">({(cls.totalCredits / 1000).toFixed(0)}k cr)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Tabela dos Alunos Maiores Consumidores */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Ranking de Alunos (Maiores Consumidores)
          </h3>
          <p className="text-xs text-slate-450 mt-0.5">Top 30 usuários com maior volume de requisições de IA.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-medium text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950/50 uppercase tracking-widest text-[9px] font-black text-slate-450 dark:text-slate-550 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">E-mail</th>
                <th className="px-6 py-4 text-center">Chat (cr)</th>
                <th className="px-6 py-4 text-center">Simulador (cr)</th>
                <th className="px-6 py-4 text-center">Consumo Total</th>
                <th className="px-6 py-4 text-right">Custo em BRL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {topUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-450">Nenhum registro de uso computado.</td>
                </tr>
              ) : (
                topUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-150">{u.name}</td>
                    <td className="px-6 py-4 font-mono text-[10px] text-slate-500 dark:text-slate-450">{u.email}</td>
                    <td className="px-6 py-4 text-center">{(u.chatCredits).toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 text-center">{(u.labCredits).toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 text-center font-bold">{(u.totalCredits).toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 text-right font-black text-slate-950 dark:text-white">R$ {u.totalReais.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
