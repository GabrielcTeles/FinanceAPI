import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Bell, 
  BarChart4, 
  Globe, 
  ChevronRight, 
  DollarSign 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Legend, 
  LineChart, 
  Line 
} from 'recharts';
import { AppData, Investment, MarketQuote } from '../types';
import { formatCurrency } from '../utils';

interface InvestmentsManagerProps {
  data: AppData;
  quotes: MarketQuote[];
  onUpdateData: (updater: (prev: AppData) => AppData) => void;
  onRefreshQuotes: () => void;
  isMobile?: boolean;
}

interface PriceAlert {
  id: string;
  ticker: string;
  type: 'max' | 'min';
  targetPrice: number;
  triggered: boolean;
}

export default function InvestmentsManager({ data, quotes, onUpdateData, onRefreshQuotes, isMobile }: InvestmentsManagerProps) {
  // Tabs: 'portfolio', 'add', 'alerts', 'compare'
  const [activeTab, setActiveTab] = useState<'portfolio' | 'add' | 'alerts' | 'compare'>('portfolio');

  // New Investment Form State
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'Ações' | 'ETFs' | 'Cripto'>('Ações');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [sector, setSector] = useState('Tecnologia');
  const [currency, setCurrency] = useState<'BRL' | 'USD' | 'EUR'>('BRL');

  // Price Alerts State
  const [alerts, setAlerts] = useState<PriceAlert[]>([
    { id: 'al-1', ticker: 'PETR4', type: 'max', targetPrice: 42.00, triggered: false },
    { id: 'al-2', ticker: 'BTC', type: 'min', targetPrice: 310000.00, triggered: false },
  ]);
  const [alertTicker, setAlertTicker] = useState('PETR4');
  const [alertType, setAlertType] = useState<'max' | 'min'>('max');
  const [alertValue, setAlertValue] = useState('');

  // Auto-refresh quotes every 6 seconds to show active real-time data
  useEffect(() => {
    const timer = setInterval(() => {
      onRefreshQuotes();
    }, 6000);
    return () => clearInterval(timer);
  }, [onRefreshQuotes]);

  // Handle triggered alerts dynamically
  const activeAlertNotifications = useMemo(() => {
    const triggered: string[] = [];
    alerts.forEach(al => {
      const q = quotes.find(quote => quote.ticker.toUpperCase() === al.ticker.toUpperCase());
      if (q) {
        if (al.type === 'max' && q.price >= al.targetPrice && !al.triggered) {
          triggered.push(`Alerta: ${al.ticker} subiu acima de R$ ${al.targetPrice.toFixed(2)}! Preço Atual: R$ ${q.price.toFixed(2)}.`);
        } else if (al.type === 'min' && q.price <= al.targetPrice && !al.triggered) {
          triggered.push(`Alerta: ${al.ticker} caiu abaixo de R$ ${al.targetPrice.toFixed(2)}! Preço Atual: R$ ${q.price.toFixed(2)}.`);
        }
      }
    });
    return triggered;
  }, [alerts, quotes]);

  // Currency Conversions reference (BRL to USD ~ 5.50, EUR ~ 6.00)
  const CONVERSIONS = { BRL: 1.0, USD: 5.50, EUR: 6.00 };

  // Calculate detailed investment list with real-time profits
  const detailedInvestments = useMemo(() => {
    return data.investments.map(inv => {
      const liveQuote = quotes.find(q => q.ticker.toUpperCase() === inv.ticker.toUpperCase());
      const currentPrice = liveQuote ? liveQuote.price : inv.purchasePrice;
      const change24h = liveQuote ? liveQuote.change24h : 0;
      
      const conv = CONVERSIONS[inv.currency] || 1.0;
      const investedBRL = inv.quantity * inv.purchasePrice * conv;
      const currentValueBRL = inv.quantity * currentPrice * conv;
      const gainBRL = currentValueBRL - investedBRL;
      const gainPct = investedBRL > 0 ? (gainBRL / investedBRL) * 100 : 0;

      return {
        ...inv,
        currentPrice,
        change24h,
        investedBRL,
        currentValueBRL,
        gainBRL,
        gainPct
      };
    });
  }, [data.investments, quotes]);

  const totalInvestedBRL = useMemo(() => {
    return detailedInvestments.reduce((sum, item) => sum + item.investedBRL, 0);
  }, [detailedInvestments]);

  const totalValueBRL = useMemo(() => {
    return detailedInvestments.reduce((sum, item) => sum + item.currentValueBRL, 0);
  }, [detailedInvestments]);

  const totalGainBRL = totalValueBRL - totalInvestedBRL;
  const totalGainPct = totalInvestedBRL > 0 ? (totalGainBRL / totalInvestedBRL) * 100 : 0;

  // Pie Chart allocation
  const allocationData = useMemo(() => {
    return detailedInvestments.map(item => ({
      name: item.ticker,
      value: Number(item.currentValueBRL.toFixed(2))
    })).filter(item => item.value > 0);
  }, [detailedInvestments]);

  // Bar Chart Sector Allocation
  const sectorData = useMemo(() => {
    const sectors: Record<string, number> = {};
    detailedInvestments.forEach(item => {
      sectors[item.sector] = (sectors[item.sector] || 0) + item.currentValueBRL;
    });
    return Object.keys(sectors).map(name => ({
      name,
      valor: Number(sectors[name].toFixed(2))
    }));
  }, [detailedInvestments]);

  // Comparison Benchmarks Series
  const comparisonData = [
    { name: 'Mês 1', Carteira: 100, Ibovespa: 100, SP500: 100 },
    { name: 'Mês 2', Carteira: 105, Ibovespa: 102, SP500: 101 },
    { name: 'Mês 3', Carteira: 108, Ibovespa: 99,  SP500: 104 },
    { name: 'Mês 4', Carteira: 114, Ibovespa: 103, SP500: 108 },
    { name: 'Mês 5', Carteira: 122, Ibovespa: 105, SP500: 112 },
    { name: 'Mês 6', Carteira: Number((122 * (1 + (totalGainPct / 100))).toFixed(1)) || 128, Ibovespa: 107, SP500: 115 },
  ];

  const handleAddInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !quantity || !purchasePrice) return;

    const newInv: Investment = {
      id: 'inv-' + Math.random().toString(36).substr(2, 9),
      ticker: ticker.toUpperCase().trim(),
      name: name.trim() || ticker.toUpperCase().trim(),
      type,
      quantity: Number(quantity),
      purchasePrice: Number(purchasePrice),
      purchaseDate,
      sector,
      currency
    };

    onUpdateData(prev => ({
      ...prev,
      investments: [...prev.investments, newInv]
    }));

    // Reset Form
    setTicker('');
    setName('');
    setQuantity('');
    setPurchasePrice('');
    setActiveTab('portfolio');
  };

  const handleDeleteInvestment = (id: string) => {
    onUpdateData(prev => ({
      ...prev,
      investments: prev.investments.filter(item => item.id !== id)
    }));
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertValue) return;

    const newAlert: PriceAlert = {
      id: 'al-' + Math.random().toString(36).substr(2, 9),
      ticker: alertTicker,
      type: alertType,
      targetPrice: Number(alertValue),
      triggered: false
    };

    setAlerts([...alerts, newAlert]);
    setAlertValue('');
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter(al => al.id !== id));
  };

  const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#a855f7', '#f59e0b', '#0ea5e9', '#06b6d4'];

  return (
    <div id="investments-manager" className={`${isMobile ? 'space-y-5' : 'space-y-8'} animate-fade-in text-neutral-200`}>
      {/* Alert Banner for live triggers */}
      {activeAlertNotifications.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl space-y-2 animate-pulse">
          {activeAlertNotifications.map((notif, index) => (
            <p key={index} className="text-xs text-amber-400 font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              {notif}
            </p>
          ))}
        </div>
      )}

      {/* Main Stats Header */}
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-3 gap-6'}`}>
        <div className={`bg-neutral-900/40 ${isMobile ? 'p-4' : 'p-6'} rounded-2xl border border-neutral-800/80`}>
          <span className="text-xs text-neutral-450 font-bold uppercase tracking-wider">Investimento Total (Custo)</span>
          <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mt-1.5 font-mono tracking-tight`}>
            {formatCurrency(totalInvestedBRL, 'BRL')}
          </h3>
          <p className="text-neutral-500 text-[11px] mt-1">Soma do preço médio de compra</p>
        </div>

        <div className={`bg-neutral-900/40 ${isMobile ? 'p-4' : 'p-6'} rounded-2xl border border-neutral-800/80`}>
          <span className="text-xs text-neutral-450 font-bold uppercase tracking-wider">Valor de Mercado Atual</span>
          <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mt-1.5 font-mono tracking-tight`}>
            {formatCurrency(totalValueBRL, 'BRL')}
          </h3>
          <p className="text-neutral-500 text-[11px] mt-1">Atualizado com cotações em tempo real</p>
        </div>

        <div className={`bg-neutral-900/40 ${isMobile ? 'p-4' : 'p-6'} rounded-2xl border border-neutral-800/80`}>
          <span className="text-xs text-neutral-450 font-bold uppercase tracking-wider">Rentabilidade Acumulada</span>
          <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold mt-1.5 font-mono flex items-center gap-1.5 ${totalGainBRL >= 0 ? 'text-emerald-450' : 'text-rose-450'}`}>
            {totalGainBRL >= 0 ? <TrendingUp className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-emerald-450`} /> : <TrendingDown className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-rose-450`} />}
            {formatCurrency(totalGainBRL, 'BRL')} 
            <span className="text-xs font-bold">({totalGainPct >= 0 ? '+' : ''}{totalGainPct.toFixed(2)}%)</span>
          </h3>
          <p className="text-neutral-500 text-[11px] mt-1">Diferença de valorização da carteira</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className={`flex ${isMobile ? 'overflow-x-auto whitespace-nowrap scrollbar-none border-b border-neutral-800 gap-0.5' : 'flex-wrap border-b border-neutral-800 gap-1'}`}>
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${isMobile ? 'px-3 py-2.5 text-[10px]' : 'px-4 py-3 text-xs'} ${
            activeTab === 'portfolio' 
              ? 'border-emerald-500 text-emerald-400' 
              : 'border-transparent text-neutral-450 hover:text-white'
          }`}
        >
          Minha Carteira
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${isMobile ? 'px-3 py-2.5 text-[10px]' : 'px-4 py-3 text-xs'} ${
            activeTab === 'add' 
              ? 'border-emerald-500 text-emerald-400' 
              : 'border-transparent text-neutral-450 hover:text-white'
          }`}
        >
          + Comprar Ativo
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${isMobile ? 'px-3 py-2.5 text-[10px]' : 'px-4 py-3 text-xs'} ${
            activeTab === 'alerts' 
              ? 'border-emerald-500 text-emerald-400' 
              : 'border-transparent text-neutral-450 hover:text-white'
          }`}
        >
          Alertas de Preço
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${isMobile ? 'px-3 py-2.5 text-[10px]' : 'px-4 py-3 text-xs'} ${
            activeTab === 'compare' 
              ? 'border-emerald-500 text-emerald-400' 
              : 'border-transparent text-neutral-450 hover:text-white'
          }`}
        >
          Comparar com Índices
        </button>
      </div>

      {/* Content Rendering based on Tab */}
      {activeTab === 'portfolio' && (
        <div className={isMobile ? 'space-y-5' : 'space-y-8'}>
          {/* Charts Allocation Grid */}
          {allocationData.length > 0 && (
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-6 p-4' : 'grid-cols-1 md:grid-cols-2 gap-6 p-6'} bg-neutral-900/40 rounded-2xl border border-neutral-800/80`}>
              {/* Pie Allocation */}
              <div className="space-y-1.5 text-center md:text-left">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Alocação por Ativo</h4>
                <p className="text-[11px] text-neutral-400">Distribuição total das posições compradas</p>
                <div className={`${isMobile ? 'h-40 mt-3' : 'h-48 mt-4'}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={isMobile ? 38 : 45}
                        outerRadius={isMobile ? 60 : 70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {allocationData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }}
                        formatter={(v) => [formatCurrency(Number(v), 'BRL'), 'Patrimônio']} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Sectors */}
              <div className="space-y-1.5 text-center md:text-left">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Alocação por Setor</h4>
                <p className="text-[11px] text-neutral-400">Exposição em setores de mercado</p>
                <div className={`${isMobile ? 'h-40 mt-3' : 'h-48 mt-4'}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectorData}>
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#a3a3a3' }} />
                      <YAxis tick={{ fontSize: 9, fill: '#a3a3a3' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }}
                        formatter={(v) => [formatCurrency(Number(v), 'BRL'), 'Valor']} 
                      />
                      <Bar dataKey="valor" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Table list */}
          <div className={`${isMobile ? 'p-4' : 'p-6'} bg-neutral-900/40 rounded-2xl border border-neutral-800/80 shadow-xs overflow-hidden`}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4 flex items-center justify-between">
              <span>Posições Compradas</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-sm animate-pulse">
                Cotações flutuam a cada 6s
              </span>
            </h4>

            {detailedInvestments.length === 0 ? (
              <p className="text-neutral-500 text-xs py-10 text-center">Nenhum ativo em carteira. Clique em "+ Comprar Ativo" para adicionar!</p>
            ) : isMobile ? (
              /* Mobile Card List */
              <div className="space-y-3">
                {detailedInvestments.map(item => (
                  <div key={item.id} className="p-3.5 bg-neutral-950/60 border border-neutral-850 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-white text-sm">{item.ticker}</span>
                        <span className="text-[10px] text-neutral-500 block">{item.name} • {item.sector}</span>
                      </div>
                      <span className={`text-[11px] font-mono font-bold ${item.gainBRL >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                        {item.gainBRL >= 0 ? '▲' : '▼'} {item.gainPct >= 0 ? '+' : ''}{item.gainPct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-neutral-900 pt-2 text-[11px] font-mono">
                      <div>
                        <span className="text-neutral-500 text-[9px] block uppercase tracking-wider font-semibold">Qtd • Preço Médio</span>
                        <span className="text-neutral-300">{item.quantity} × {formatCurrency(item.purchasePrice, item.currency)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-neutral-500 text-[9px] block uppercase tracking-wider font-semibold">Cotação Atual</span>
                        <span className="text-neutral-300">
                          {formatCurrency(item.currentPrice, item.currency)}
                          <span className={`ml-1 font-bold ${item.change24h >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                            ({item.change24h >= 0 ? '+' : ''}{item.change24h}%)
                          </span>
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 text-[9px] block uppercase tracking-wider font-semibold">Total Investido</span>
                        <span className="text-neutral-300">{formatCurrency(item.investedBRL, 'BRL')}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-neutral-500 text-[9px] block uppercase tracking-wider font-semibold">Valor Atual</span>
                        <span className="text-white font-bold">{formatCurrency(item.currentValueBRL, 'BRL')}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t border-neutral-900 pt-2">
                      <span className={`text-[11px] font-mono font-bold ${item.gainBRL >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                        Resultado: {item.gainBRL >= 0 ? '+' : ''}{formatCurrency(item.gainBRL, 'BRL')}
                      </span>
                      <button
                        onClick={() => handleDeleteInvestment(item.id)}
                        className="p-1.5 text-neutral-600 hover:text-rose-450 hover:bg-neutral-800/40 rounded-md transition-colors cursor-pointer"
                        title="Remover investimento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Desktop Table View */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-450 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-2">Ativo</th>
                      <th className="py-3 px-2">Qtd</th>
                      <th className="py-3 px-2">Preço Médio</th>
                      <th className="py-3 px-2">Cotação Atual</th>
                      <th className="py-3 px-2">Total Investido</th>
                      <th className="py-3 px-2">Valor Atual</th>
                      <th className="py-3 px-2 text-right">Resultado</th>
                      <th className="py-3 px-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850">
                    {detailedInvestments.map(item => (
                      <tr key={item.id} className="text-sm text-neutral-300 hover:bg-neutral-900/20 transition-colors">
                        <td className="py-3.5 px-2 font-bold text-white">
                          {item.ticker}
                          <span className="block text-[10px] text-neutral-500 font-medium mt-0.5">{item.name} • {item.sector}</span>
                        </td>
                        <td className="py-3.5 px-2 font-mono font-medium">{item.quantity}</td>
                        <td className="py-3.5 px-2 font-mono">{formatCurrency(item.purchasePrice, item.currency)}</td>
                        <td className="py-3.5 px-2 font-mono">
                          {formatCurrency(item.currentPrice, item.currency)}
                          <span className={`block text-[10px] font-bold mt-0.5 ${item.change24h >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                            {item.change24h >= 0 ? '▲' : '▼'} {item.change24h}%
                          </span>
                        </td>
                        <td className="py-3.5 px-2 font-mono">{formatCurrency(item.investedBRL, 'BRL')}</td>
                        <td className="py-3.5 px-2 font-mono font-bold text-white">{formatCurrency(item.currentValueBRL, 'BRL')}</td>
                        <td className={`py-3.5 px-2 font-mono font-bold text-right ${item.gainBRL >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                          {item.gainBRL >= 0 ? '+' : ''}{formatCurrency(item.gainBRL, 'BRL')}
                          <span className="block text-[10px] mt-0.5">({item.gainPct >= 0 ? '+' : ''}{item.gainPct.toFixed(1)}%)</span>
                        </td>
                        <td className="py-3.5 px-2 text-right">
                          <button
                            onClick={() => handleDeleteInvestment(item.id)}
                            className="p-1.5 text-neutral-600 hover:text-rose-450 hover:bg-neutral-800/40 rounded-md transition-colors cursor-pointer"
                            title="Remover investimento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'add' && (
        <div className={`bg-neutral-900/40 ${isMobile ? 'p-4' : 'p-6'} rounded-2xl border border-neutral-800/80 shadow-xs max-w-xl mx-auto space-y-6`}>
          <div>
            <h2 className={`${isMobile ? 'text-xs' : 'text-sm'} font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display`}>
              <Plus className="w-4 h-4 text-emerald-400" />
              Adicionar Novo Ativo à Carteira
            </h2>
            <p className="text-neutral-450 text-xs mt-1">Registre compras de ações, ETFs e criptomoedas para acompanhar a valorização diária.</p>
          </div>

          <form onSubmit={handleAddInvestment} className="space-y-4">
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'}`}>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Ticker do Ativo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PETR4, AAPL, BTC..."
                  value={ticker}
                  onChange={e => setTicker(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white font-bold uppercase focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Nome da Empresa/Ativo</label>
                <input
                  type="text"
                  placeholder="Ex: Petrobras PN"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'}`}>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Tipo de Ativo</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="Ações">Ações (B3, NYSE, NASDAQ)</option>
                  <option value="ETFs">ETFs</option>
                  <option value="Cripto">Criptomoedas</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Setor Comercial</label>
                <select
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="Tecnologia">Tecnologia</option>
                  <option value="Petróleo & Gás">Petróleo & Gás</option>
                  <option value="Materiais Básicos">Materiais Básicos</option>
                  <option value="Bens Industriais">Bens Industriais</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="Criptomoedas">Criptomoedas</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>

            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-3'}`}>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Quantidade</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  placeholder="0.0"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white font-mono focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Preço Unitário</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={purchasePrice}
                  onChange={e => setPurchasePrice(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white font-mono focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Moeda da Compra</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value as any)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-hidden"
                >
                  <option value="BRL">BRL (R$)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-400">Data de Liquidação (Compra)</label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white font-mono focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl text-sm font-bold transition-all shadow-xs cursor-pointer"
            >
              Comprar Ativo
            </button>
          </form>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'grid-cols-1 md:grid-cols-2 gap-8'}`}>
          {/* Create Alert */}
          <div className={`bg-neutral-900/40 ${isMobile ? 'p-4' : 'p-6'} rounded-2xl border border-neutral-800/80 shadow-xs space-y-6 h-fit`}>
            <div>
              <h2 className={`${isMobile ? 'text-xs' : 'text-sm'} font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display`}>
                <Bell className="w-4 h-4 text-emerald-450" />
                Criar Alerta de Preço
              </h2>
              <p className="text-neutral-450 text-xs mt-1">Configure alertas para receber notificações quando um ativo atingir um determinado preço-alvo.</p>
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'}`}>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-400">Ativo</label>
                  <select
                    value={alertTicker}
                    onChange={e => setAlertTicker(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white font-bold focus:outline-hidden"
                  >
                    {quotes.map(q => (
                      <option key={q.ticker} value={q.ticker}>{q.ticker} ({q.name})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-400">Direção</label>
                  <select
                    value={alertType}
                    onChange={e => setAlertType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-hidden"
                  >
                    <option value="max">Subir acima de</option>
                    <option value="min">Cair abaixo de</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Preço Alvo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={alertValue}
                  onChange={e => setAlertValue(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white font-mono focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Ativar Monitoramento
              </button>
            </form>
          </div>

          {/* Alert List */}
          <div className={`bg-neutral-900/40 ${isMobile ? 'p-4' : 'p-6'} rounded-2xl border border-neutral-800/80 shadow-xs space-y-4`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-neutral-800 pb-2">Alertas Ativos</h3>

            {alerts.length === 0 ? (
              <p className="text-neutral-550 text-xs py-8 text-center">Nenhum alerta de preço configurado.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {alerts.map(al => {
                  const q = quotes.find(quote => quote.ticker.toUpperCase() === al.ticker.toUpperCase());
                  return (
                    <div key={al.id} className="flex justify-between items-center p-3 bg-neutral-950 border border-neutral-850 rounded-xl">
                      <div className="text-xs">
                        <span className="font-bold text-white text-sm mr-2">{al.ticker}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-xs ${al.type === 'max' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'}`}>
                          {al.type === 'max' ? 'Preço Máximo' : 'Preço Mínimo'}
                        </span>
                        <p className="text-neutral-500 mt-1.5 font-mono">Disparar em: R$ {al.targetPrice.toFixed(2)} • Atual: R$ {q?.price.toFixed(2) || '---'}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteAlert(al.id)}
                        className="p-1 text-neutral-600 hover:text-rose-450 hover:bg-neutral-800/40 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'compare' && (
        <div className={`bg-neutral-900/40 ${isMobile ? 'p-4' : 'p-6'} rounded-2xl border border-neutral-800/80 shadow-xs space-y-6`}>
          <div>
            <h2 className={`${isMobile ? 'text-xs' : 'text-sm'} font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display`}>
              <BarChart4 className="w-4 h-4 text-emerald-450" />
              Comparativo de Rentabilidade vs Índices
            </h2>
            <p className="text-neutral-450 text-xs mt-1">
              Avalie como a rentabilidade da sua carteira de investimentos se comporta frente aos principais índices de referência nacional e internacional (Ibovespa e S&P 500).
            </p>
          </div>

          <div className={isMobile ? 'h-52' : 'h-64'}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a3a3a3' }} />
                <YAxis tick={{ fontSize: 10, fill: '#a3a3a3' }} />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Carteira" stroke="#10b981" strokeWidth={3} name="Minha Carteira (%)" />
                <Line type="monotone" dataKey="Ibovespa" stroke="#f59e0b" name="Ibovespa (%)" />
                <Line type="monotone" dataKey="SP500" stroke="#3b82f6" name="S&P 500 (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className={`p-4 bg-neutral-950 rounded-xl flex ${isMobile ? 'flex-col gap-2 items-start' : 'items-center justify-between'} text-xs`}>
            <span className="text-neutral-450">Desempenho histórico simulado baseado no preço médio de compra vs atual.</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1 cursor-pointer">
              Ibovespa Benchmark
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
