import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Calculator, 
  Clock, 
  ShieldAlert, 
  Percent, 
  TrendingUp, 
  HelpCircle,
  PiggyBank
} from 'lucide-react';
import { AppData, FixedIncome } from '../types';
import { formatCurrency, calculateFixedIncomeYield } from '../utils';

interface FixedIncomeManagerProps {
  data: AppData;
  rates: { CDI: number; SELIC: number; IPCA: number; Poupança: number };
  onUpdateData: (updater: (prev: AppData) => AppData) => void;
  isMobile?: boolean;
}

export default function FixedIncomeManager({ data, rates, onUpdateData, isMobile }: FixedIncomeManagerProps) {
  // Navigation: 'portfolio', 'add', 'simulate', 'compare'
  const [activeTab, setActiveTab] = useState<'portfolio' | 'add' | 'simulate' | 'compare'>('portfolio');

  // Form State
  const [type, setType] = useState<FixedIncome['type']>('CDB');
  const [value, setValue] = useState('');
  const [rate, setRate] = useState('');
  const [indexation, setIndexation] = useState<FixedIncome['indexation']>('CDI');
  const [appDate, setAppDate] = useState(new Date().toISOString().split('T')[0]);
  const [maturityDate, setMaturityDate] = useState(() => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 2); // default 2 years
    return nextYear.toISOString().split('T')[0];
  });
  const [liquidity, setLiquidity] = useState<FixedIncome['liquidity']>('Vencimento');
  const [actualBalanceInput, setActualBalanceInput] = useState('');

  // Inline editing state for portfolio items
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Simulator Widget State
  const [simPrincipal, setSimPrincipal] = useState('10000');
  const [simRate, setSimRate] = useState('110');
  const [simIndexation, setSimIndexation] = useState<FixedIncome['indexation']>('CDI');
  const [simDays, setSimDays] = useState('365');

  // Calculate accrued values for list
  const calculatedItems = useMemo(() => {
    return data.fixedIncome.map(inv => {
      // Is LCI or LCA? If so, tax-exempt in Brazil
      const isTaxExempt = inv.type === 'LCI' || inv.type === 'LCA' || inv.type === 'Poupança';
      
      const calculation = calculateFixedIncomeYield(
        inv.value,
        inv.rate,
        inv.indexation,
        inv.applicationDate,
        new Date(),
        rates
      );

      const realTaxRate = isTaxExempt ? 0 : calculation.taxRate;
      const realTaxAmount = isTaxExempt ? 0 : calculation.taxAmount;
      
      const hasOverride = inv.actualBalance !== undefined && inv.actualBalance !== null && inv.actualBalance > 0;
      const realNetValue = hasOverride ? inv.actualBalance! : (
        isTaxExempt 
          ? inv.value + calculation.grossInterest 
          : inv.value + (calculation.grossInterest - calculation.taxAmount)
      );

      const realGrossInterest = hasOverride
        ? Math.max(0, realNetValue - inv.value)
        : calculation.grossInterest;

      const realTaxAmountAdjusted = isTaxExempt ? 0 : realGrossInterest * (realTaxRate / 100);

      return {
        ...inv,
        ...calculation,
        grossInterest: realGrossInterest,
        taxRate: realTaxRate,
        taxAmount: realTaxAmountAdjusted,
        netValue: realNetValue,
        isTaxExempt,
        hasOverride,
        originalCalculation: calculation
      };
    });
  }, [data.fixedIncome, rates]);

  // Totals
  const totalApplied = useMemo(() => data.fixedIncome.reduce((sum, item) => sum + item.value, 0), [data.fixedIncome]);
  const totalNetValue = useMemo(() => calculatedItems.reduce((sum, item) => sum + item.netValue, 0), [calculatedItems]);
  const totalEarned = totalNetValue - totalApplied;

  const handleSaveActualBalance = (id: string) => {
    const numericVal = Number(editingValue);
    if (isNaN(numericVal) || !editingValue || numericVal <= 0) {
      onUpdateData(prev => ({
        ...prev,
        fixedIncome: prev.fixedIncome.map(item => 
          item.id === id ? { ...item, actualBalance: undefined } : item
        )
      }));
    } else {
      onUpdateData(prev => ({
        ...prev,
        fixedIncome: prev.fixedIncome.map(item => 
          item.id === id ? { ...item, actualBalance: numericVal } : item
        )
      }));
    }
    setEditingId(null);
  };

  const handleAddFixedIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || !rate) return;

    const newItem: FixedIncome = {
      id: 'fi-' + Math.random().toString(36).substr(2, 9),
      type,
      value: Number(value),
      rate: Number(rate),
      indexation,
      applicationDate: appDate,
      maturityDate: maturityDate,
      liquidity,
      actualBalance: actualBalanceInput ? Number(actualBalanceInput) : undefined
    };

    onUpdateData(prev => ({
      ...prev,
      fixedIncome: [...prev.fixedIncome, newItem]
    }));

    // Reset
    setValue('');
    setRate('');
    setActualBalanceInput('');
    setActiveTab('portfolio');
  };

  const handleDeleteFixedIncome = (id: string) => {
    onUpdateData(prev => ({
      ...prev,
      fixedIncome: prev.fixedIncome.filter(item => item.id !== id)
    }));
  };

  // Simulator Calculation
  const simulationResult = useMemo(() => {
    const principal = Number(simPrincipal) || 0;
    const ratePct = Number(simRate) || 0;
    const days = Number(simDays) || 0;

    // Is CDB taxable (standard)
    const calculation = calculateFixedIncomeYield(
      principal,
      ratePct,
      simIndexation,
      new Date(Date.now() - (days * 24 * 3600 * 1000)).toISOString().split('T')[0],
      new Date(),
      rates
    );

    return calculation;
  }, [simPrincipal, simRate, simIndexation, simDays, rates]);

  // Comparison CDB vs LCI/LCA simulator
  const comparisonResults = useMemo(() => {
    // Standard CDB (Taxable) at 110% CDI vs LCI (Tax-exempt) at 92% CDI
    const principal = 10000;
    const days = 365;

    const cdbCalc = calculateFixedIncomeYield(
      principal,
      110, // 110% CDI
      'CDI',
      new Date(Date.now() - (days * 24 * 3600 * 1000)).toISOString().split('T')[0],
      new Date(),
      rates
    );

    const lciCalc = calculateFixedIncomeYield(
      principal,
      92, // 92% CDI
      'CDI',
      new Date(Date.now() - (days * 24 * 3600 * 1000)).toISOString().split('T')[0],
      new Date(),
      rates
    );

    // LCI is exempt
    const lciNetValue = principal + lciCalc.grossInterest;

    return {
      cdb: { ...cdbCalc },
      lci: { ...lciCalc, netValue: lciNetValue, taxAmount: 0 }
    };
  }, [rates]);  return (
    <div id="fixed-income-manager" className={`${isMobile ? 'space-y-5' : 'space-y-8'} animate-fade-in text-neutral-200`}>
      {/* Overview Cards */}
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-3 gap-6'}`}>
        <div className={`bg-neutral-900/40 ${isMobile ? 'p-4' : 'p-6'} rounded-2xl border border-neutral-800/80`}>
          <span className="text-xs text-neutral-450 font-bold uppercase tracking-wider">Total Aplicado</span>
          <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mt-2 font-mono tracking-tight`}>
            {formatCurrency(totalApplied, 'BRL')}
          </h3>
          <p className="text-neutral-500 text-[11px] mt-1">Capital inicial depositado</p>
        </div>

        <div className={`bg-neutral-900/40 ${isMobile ? 'p-4' : 'p-6'} rounded-2xl border border-neutral-800/80`}>
          <span className="text-xs text-neutral-450 font-bold uppercase tracking-wider">Valor Líquido Atual</span>
          <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mt-2 font-mono tracking-tight`}>
            {formatCurrency(totalNetValue, 'BRL')}
          </h3>
          <p className="text-neutral-500 text-[11px] mt-1">Líquido descontando IR (se houver)</p>
        </div>

        <div className={`bg-neutral-900/40 ${isMobile ? 'p-4' : 'p-6'} rounded-2xl border border-neutral-800/80`}>
          <span className="text-xs text-neutral-450 font-bold uppercase tracking-wider">Juros Líquidos Ganhos</span>
          <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-emerald-400 mt-2 font-mono flex items-center gap-1.5 tracking-tight`}>
            <TrendingUp className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-emerald-450`} />
            {formatCurrency(totalEarned, 'BRL')}
          </h3>
          <p className="text-neutral-500 text-[11px] mt-1">Rendimento acumulado em carteira</p>
        </div>
      </div>

      {/* Indexation Rates Bar */}
      <div className="bg-neutral-950 border border-neutral-800/80 text-neutral-300 p-4 rounded-xl flex flex-wrap justify-around items-center gap-4 text-xs font-mono">
        <span className="text-neutral-450 uppercase tracking-wider font-bold">Taxas Econômicas Referência:</span>
        <span>CDI: <strong className="text-emerald-400">{rates.CDI.toFixed(2)}% a.a.</strong></span>
        <span>SELIC: <strong className="text-emerald-400">{rates.SELIC.toFixed(2)}% a.a.</strong></span>
        <span>IPCA: <strong className="text-emerald-400">{rates.IPCA.toFixed(2)}% a.a.</strong></span>
        <span>Poupança: <strong className="text-emerald-400">{rates.Poupança.toFixed(2)}% a.a.</strong></span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-neutral-800 gap-1">
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'portfolio' 
              ? 'border-emerald-500 text-emerald-400' 
              : 'border-transparent text-neutral-450 hover:text-white'
          }`}
        >
          Minhas Aplicações
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'add' 
              ? 'border-emerald-500 text-emerald-400' 
              : 'border-transparent text-neutral-450 hover:text-white'
          }`}
        >
          + Nova Aplicação
        </button>
        <button
          onClick={() => setActiveTab('simulate')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'simulate' 
              ? 'border-emerald-500 text-emerald-400' 
              : 'border-transparent text-neutral-450 hover:text-white'
          }`}
        >
          Simulador Inteligente
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'compare' 
              ? 'border-emerald-500 text-emerald-400' 
              : 'border-transparent text-neutral-450 hover:text-white'
          }`}
        >
          CDB vs LCI (Comparativo)
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          {calculatedItems.length === 0 ? (
            <div className="bg-neutral-900/40 p-8 rounded-2xl border border-neutral-800/80 text-center py-12">
              <PiggyBank className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-500 text-sm">Nenhuma aplicação de Renda Fixa registrada.</p>
              <button 
                onClick={() => setActiveTab('add')}
                className="mt-4 text-xs bg-emerald-500 text-black font-bold px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors cursor-pointer"
              >
                + Registrar Primeiro CDB/Tesouro
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {calculatedItems.map(item => {
                // Determine timeline completion percentage
                const appTime = new Date(item.applicationDate).getTime();
                const matTime = new Date(item.maturityDate).getTime();
                const nowTime = Date.now();
                
                const totalSpan = matTime - appTime;
                const elapsedSpan = nowTime - appTime;
                const elapsedPct = totalSpan > 0 ? Math.min(100, Math.max(0, (elapsedSpan / totalSpan) * 100)) : 0;

                const daysRemaining = Math.max(0, Math.floor((matTime - nowTime) / (1000 * 3600 * 24)));

                return (
                  <div key={item.id} className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/80 grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                    {/* Column 1: Asset Metadata */}
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider">
                        {item.type}
                      </span>
                      <h4 className="text-base font-bold text-white pt-1">
                        {item.type} {item.indexation === 'Prefixado' ? `${item.rate}% a.a.` : `${item.rate}% do ${item.indexation}`}
                      </h4>
                      <p className="text-neutral-450 text-[11px]">Aplicado em: {item.applicationDate}</p>
                      <p className="text-neutral-450 text-[11px]">Vencimento: {item.maturityDate} ({daysRemaining} dias restantes)</p>
                    </div>

                    {/* Column 2: Applied vs Current Yields */}
                    <div className="space-y-1 font-mono text-neutral-300">
                      <p className="text-xs text-neutral-450 font-sans">Valores da Aplicação</p>
                      <p className="text-sm">Aplicado: {formatCurrency(item.value, 'BRL')}</p>
                      <p className="text-sm text-emerald-400">Rendimento Bruto: +{formatCurrency(item.grossInterest, 'BRL')}</p>
                      <p className="text-xs text-neutral-500">Imposto Retido (IR): -{formatCurrency(item.taxAmount, 'BRL')} ({item.taxRate.toFixed(1)}%)</p>
                    </div>

                    {/* Column 3: Timeline Visuelle */}
                    <div className="space-y-2">
                      <span className="text-xs text-neutral-400 font-medium flex items-center justify-between">
                        <span>Progresso do Vencimento</span>
                        <span>{elapsedPct.toFixed(0)}%</span>
                      </span>
                      <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${elapsedPct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-neutral-550 font-mono">
                        <span>{item.applicationDate}</span>
                        <span>{item.maturityDate}</span>
                      </div>
                    </div>

                    {/* Column 4: Consolidated Net Total & Edit Balance */}
                    <div className="flex flex-col lg:items-end gap-3 border-t lg:border-t-0 border-neutral-800/60 pt-3 lg:pt-0">
                      <div className="flex justify-between lg:justify-end items-center gap-6 w-full">
                        <div className="text-left lg:text-right">
                          <span className="text-xs text-neutral-450 font-bold uppercase tracking-wider flex items-center gap-1.5 justify-start lg:justify-end">
                            Saldo Líquido
                            {item.hasOverride && (
                              <span className="inline-flex items-center bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] px-1 py-0.2 rounded-sm font-normal">
                                Ajustado (Resgatado)
                              </span>
                            )}
                          </span>
                          
                          {editingId === item.id ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-neutral-400 text-sm font-mono">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                className="w-28 px-2 py-0.5 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500"
                                value={editingValue}
                                onChange={e => setEditingValue(e.target.value)}
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveActualBalance(item.id);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                              />
                              <button
                                onClick={() => handleSaveActualBalance(item.id)}
                                className="px-1.5 py-0.5 bg-emerald-500 text-black rounded-lg text-[10px] font-bold hover:bg-emerald-600 transition-colors cursor-pointer"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-1.5 py-0.5 bg-neutral-800 text-neutral-400 rounded-lg text-[10px] hover:bg-neutral-700 transition-colors cursor-pointer"
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <strong className="text-xl font-bold text-white font-mono block mt-0.5">
                              {formatCurrency(item.netValue, 'BRL')}
                            </strong>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {editingId !== item.id && (
                            <button
                              onClick={() => {
                                setEditingId(item.id);
                                setEditingValue(item.netValue.toFixed(2));
                              }}
                              className="p-1.5 text-neutral-450 hover:text-emerald-450 hover:bg-neutral-800/40 rounded-md transition-colors cursor-pointer"
                              title="Ajustar saldo atual"
                            >
                              <Percent className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteFixedIncome(item.id)}
                            className="p-1.5 text-neutral-600 hover:text-rose-450 hover:bg-neutral-800/40 rounded-md transition-colors cursor-pointer"
                            title="Remover Aplicação"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Sub-label helper if edited */}
                      {item.hasOverride && editingId !== item.id && (
                        <div className="text-[10px] text-neutral-500 lg:text-right">
                          Previsão original: {formatCurrency(item.value + (item.isTaxExempt ? item.originalCalculation.grossInterest : (item.originalCalculation.grossInterest - item.originalCalculation.taxAmount)), 'BRL')}
                          <button 
                            onClick={() => {
                              onUpdateData(prev => ({
                                ...prev,
                                fixedIncome: prev.fixedIncome.map(fi => 
                                  fi.id === item.id ? { ...fi, actualBalance: undefined } : fi
                                )
                              }));
                            }}
                            className="text-emerald-450 hover:underline ml-1.5 cursor-pointer font-semibold"
                          >
                            Restaurar cálculo
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'add' && (
        <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/80 shadow-xs max-w-xl mx-auto space-y-6">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
              <Plus className="w-4 h-4 text-emerald-450" />
              Adicionar Investimento Renda Fixa
            </h2>
            <p className="text-neutral-450 text-xs mt-1">Insira os termos de sua aplicação em CDB, LCI, LCA ou Tesouro Direto para iniciar as estimativas de rendimentos diários e retenção regressiva de IR.</p>
          </div>

          <form onSubmit={handleAddFixedIncome} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Tipo de Investimento</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="CDB">CDB (Certificado de Depósito Bancário)</option>
                  <option value="LCI">LCI (Letra de Crédito Imobiliário)</option>
                  <option value="LCA">LCA (Letra de Crédito do Agronegócio)</option>
                  <option value="Tesouro Direto">Tesouro Direto (LFT, LTN, NTN-B)</option>
                  <option value="Poupança">Poupança</option>
                  <option value="Letras de Crédito">Letras de Crédito</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Tipo de Indexador</label>
                <select
                  value={indexation}
                  onChange={e => setIndexation(e.target.value as any)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="CDI">Pós-fixado (CDI)</option>
                  <option value="SELIC">Pós-fixado (SELIC)</option>
                  <option value="Prefixado">Prefixado (Juros Fixo)</option>
                  <option value="IPCA">Híbrido (IPCA + Juros)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Valor Inicial Aplicado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ex: 5000.00"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white font-mono focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">
                  Taxa Contratada ({indexation === 'CDI' || indexation === 'SELIC' ? '% do Indexador' : '% a.a.'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder={indexation === 'CDI' ? 'Ex: 110 (para 110% CDI)' : 'Ex: 12.5 (para 12.5% a.a.)'}
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white font-mono focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Data de Aplicação</label>
                <input
                  type="date"
                  required
                  value={appDate}
                  onChange={e => setAppDate(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white font-mono focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Data de Vencimento</label>
                <input
                  type="date"
                  required
                  value={maturityDate}
                  onChange={e => setMaturityDate(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white font-mono focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Tipo de Liquidez / Resgate</label>
                <select
                  value={liquidity}
                  onChange={e => setLiquidity(e.target.value as any)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-hidden"
                >
                  <option value="Vencimento">Resgate Apenas no Vencimento</option>
                  <option value="Imediata">Liquidez Diária (Resgate Imediato)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Saldo Atual (Opcional - Sobrescreve cálculo)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 68018.02"
                  value={actualBalanceInput}
                  onChange={e => setActualBalanceInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white font-mono focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl text-sm font-bold transition-all shadow-xs cursor-pointer"
            >
              Registrar Investimento Renda Fixa
            </button>
          </form>
        </div>
      )}

      {activeTab === 'simulate' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Simulator Form */}
          <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/80 shadow-xs space-y-6">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
                <Calculator className="w-4 h-4 text-emerald-450" />
                "Quanto terei em X dias?"
              </h2>
              <p className="text-neutral-450 text-xs mt-1">Calcule juros acumulados, desconto automático de Imposto de Renda e valor final líquido para qualquer prazo de aplicação fictício.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Valor a Aplicar (R$)</label>
                <input
                  type="number"
                  value={simPrincipal}
                  onChange={e => setSimPrincipal(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white font-mono focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-400">Indexador</label>
                  <select
                    value={simIndexation}
                    onChange={e => setSimIndexation(e.target.value as any)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-hidden"
                  >
                    <option value="CDI">Pós-fixado (CDI)</option>
                    <option value="SELIC">Pós-fixado (SELIC)</option>
                    <option value="Prefixado">Prefixado</option>
                    <option value="IPCA">Híbrido (IPCA + Juros)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-400">Taxa (%)</label>
                  <input
                    type="number"
                    value={simRate}
                    onChange={e => setSimRate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white font-mono focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Prazo de Simulação (Dias)</label>
                <input
                  type="number"
                  value={simDays}
                  onChange={e => setSimDays(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white font-mono focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/80 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-neutral-800 pb-2">Resultado da Simulação</h3>
              
              <div className="space-y-3 font-mono text-sm text-neutral-300">
                <div className="flex justify-between border-b border-neutral-850 pb-2">
                  <span className="font-sans text-neutral-450">Capital Inicial:</span>
                  <strong className="text-white">{formatCurrency(Number(simPrincipal) || 0, 'BRL')}</strong>
                </div>
                <div className="flex justify-between border-b border-neutral-850 pb-2 text-emerald-400 font-bold">
                  <span className="font-sans text-neutral-450 font-medium text-neutral-300">Juros Brutos (+):</span>
                  <span>+{formatCurrency(simulationResult.grossInterest, 'BRL')}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-850 pb-2 text-rose-400">
                  <span className="font-sans text-neutral-450 font-medium text-neutral-300">Imposto de Renda (-):</span>
                  <span>-{formatCurrency(simulationResult.taxAmount, 'BRL')} ({simulationResult.taxRate.toFixed(1)}%)</span>
                </div>
                <div className="flex justify-between font-sans text-xs text-neutral-500">
                  <span>Alíquota progressiva correspondente a {simDays} dias corridos.</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-800 text-center">
              <span className="text-xs text-neutral-450 uppercase tracking-widest font-bold block">Valor Líquido Resgatável</span>
              <strong className="text-3xl font-bold text-emerald-400 font-mono tracking-tight block mt-1">
                {formatCurrency(simulationResult.netValue, 'BRL')}
              </strong>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/80 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
              <Percent className="w-4 h-4 text-emerald-450" />
              Comparativo de Alíquotas: CDB (Tributado) vs LCI/LCA (Isento)
            </h2>
            <p className="text-neutral-450 text-xs mt-1">
              No Brasil, LCIs e LCAs são **isentos** de Imposto de Renda para pessoa física, enquanto CDBs sofrem tributação regressiva (22.5% a 15%). 
              Por isso, um CDB precisa render uma taxa maior para bater uma LCI. Veja a simulação de R$ 10.000 em 365 dias:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="p-5 border border-neutral-800/80 rounded-xl space-y-3 bg-neutral-950/40">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm">CDB - 110% do CDI</span>
              <div className="font-mono space-y-1.5 text-xs text-neutral-300 pt-2">
                <p>Bruto Acumulado: +{formatCurrency(comparisonResults.cdb.grossInterest, 'BRL')}</p>
                <p className="text-rose-450">Imposto de Renda (17.5%): -{formatCurrency(comparisonResults.cdb.taxAmount, 'BRL')}</p>
                <p className="text-sm font-bold text-white border-t border-neutral-800 pt-1.5 mt-2">Líquido Final: {formatCurrency(comparisonResults.cdb.netValue, 'BRL')}</p>
              </div>
            </div>

            <div className="p-5 border border-neutral-800/80 rounded-xl space-y-3 bg-neutral-950/40">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm">LCI / LCA - 92% do CDI</span>
              <div className="font-mono space-y-1.5 text-xs text-neutral-300 pt-2">
                <p>Bruto Acumulado: +{formatCurrency(comparisonResults.lci.grossInterest, 'BRL')}</p>
                <p className="text-emerald-400 font-bold">Imposto de Renda: Isento (R$ 0,00)</p>
                <p className="text-sm font-bold text-white border-t border-neutral-800 pt-1.5 mt-2">Líquido Final: {formatCurrency(comparisonResults.lci.netValue, 'BRL')}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-500/5 text-emerald-300 border border-emerald-500/20 rounded-xl text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-emerald-400 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              Análise de Retorno Real:
            </p>
            <p className="leading-relaxed mt-1">
              {comparisonResults.lci.netValue > comparisonResults.cdb.netValue
                ? `Para este cenário, a LCI de 92% do CDI é MAIS rentável que o CDB de 110% do CDI, proporcionando um rendimento líquido superior de ${formatCurrency(comparisonResults.lci.netValue - comparisonResults.cdb.netValue, 'BRL')}!`
                : `Para este cenário, o CDB de 110% do CDI supera a LCI de 92% do CDI em rentabilidade líquida final, mesmo pagando imposto de renda!`
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
