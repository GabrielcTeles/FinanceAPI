import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  Filter, 
  Tag, 
  Sliders, 
  Calendar, 
  DollarSign, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis 
} from 'recharts';
import { AppData, Transaction } from '../types';
import { formatCurrency, CATEGORY_COLORS, CATEGORY_TEXT_COLORS } from '../utils';

interface ExpensesManagerProps {
  data: AppData;
  onUpdateData: (updater: (prev: AppData) => AppData) => void;
  isMobile?: boolean;
}

const DEFAULT_CATEGORIES = ["Alimentação", "Transporte", "Saúde", "Educação", "Lazer", "Utilities", "Outros"];

const SUBCATEGORIES_MAP: Record<string, string[]> = {
  "Alimentação": ["Supermercado", "Restaurante", "Lanchonete", "Delivery", "Outros"],
  "Transporte": ["Uber/99", "Combustível", "Estacionamento", "Transporte Público", "Manutenção"],
  "Saúde": ["Farmácia", "Consulta Médica", "Exames", "Dentista", "Plano de Saúde"],
  "Educação": ["Mensalidade", "Cursos/Livros", "Material Escolar", "Outros"],
  "Lazer": ["Cinema/Teatros", "Viagens", "Streaming", "Shows/Eventos", "Bares/Festas"],
  "Utilities": ["Energia", "Água", "Internet/Telefone", "Gás", "Condomínio"],
  "Outros": ["Vestuário", "Presentes", "Cabeleireiro/Estética", "Diversos"]
};

export default function ExpensesManager({ data, onUpdateData, isMobile }: ExpensesManagerProps) {
  // Navigation tabs within Expenses: 'transactions' or 'budgets'
  const [subTab, setSubTab] = useState<'transactions' | 'budgets'>('transactions');

  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'receita' | 'despesa'>('despesa');
  const [category, setCategory] = useState('Alimentação');
  const [subcategory, setSubcategory] = useState('Supermercado');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState<'BRL' | 'USD' | 'EUR'>('BRL');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // Installment purchase State
  const [isInstallments, setIsInstallments] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState('3');
  const [installmentValueType, setInstallmentValueType] = useState<'total' | 'parcela'>('total');
  const [deletePromptTx, setDeletePromptTx] = useState<Transaction | null>(null);

  // Filter States
  const [periodFilter, setPeriodFilter] = useState<'all' | 'day' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');

  // Budget Edit States
  const [editingBudgets, setEditingBudgets] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    DEFAULT_CATEGORIES.forEach(cat => {
      initial[cat] = String(data.budgets[cat] || 0);
    });
    return initial;
  });

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim().toLowerCase())) {
        setTags([...tags, tagInput.trim().toLowerCase()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || Number(amount) <= 0) return;

    if (type === 'despesa' && isInstallments) {
      const installmentCountNum = Number(installmentsCount) || 1;
      const isTotalValue = installmentValueType === 'total';
      const txAmount = isTotalValue ? Number(amount) / installmentCountNum : Number(amount);
      const groupId = 'inst-' + Math.random().toString(36).substr(2, 9);

      const addMonths = (dateStr: string, months: number): string => {
        const parts = dateStr.split('-');
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        const d = new Date(year, month - 1 + months, day);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayFormatted = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dayFormatted}`;
      };

      const newTransactions: Transaction[] = [];
      for (let i = 0; i < installmentCountNum; i++) {
        const installmentDate = addMonths(date, i);
        const newTx: Transaction = {
          id: 'tx-' + Math.random().toString(36).substr(2, 9) + `-${i}`,
          date: installmentDate,
          amount: Number(txAmount.toFixed(2)),
          type: 'despesa',
          category,
          subcategory,
          description: `${description} (${i + 1}/${installmentCountNum})`,
          currency,
          tags,
          installmentsCount: installmentCountNum,
          installmentNumber: i + 1,
          installmentGroupId: groupId
        };
        newTransactions.push(newTx);
      }

      onUpdateData(prev => ({
        ...prev,
        transactions: [...newTransactions, ...prev.transactions]
      }));
    } else {
      const newTx: Transaction = {
        id: 'tx-' + Math.random().toString(36).substr(2, 9),
        date,
        amount: Number(amount),
        type,
        category: type === 'receita' ? 'Salário' : category,
        subcategory: type === 'receita' ? 'Renda' : subcategory,
        description,
        currency,
        tags
      };

      onUpdateData(prev => ({
        ...prev,
        transactions: [newTx, ...prev.transactions]
      }));
    }

    // Reset Form
    setDescription('');
    setAmount('');
    setTags([]);
    setIsInstallments(false);
  };

  const handleDeleteTransaction = (id: string) => {
    onUpdateData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }));
  };

  const handleDeleteTransactionClick = (tx: Transaction) => {
    if (tx.installmentGroupId) {
      setDeletePromptTx(tx);
    } else {
      handleDeleteTransaction(tx.id);
    }
  };

  const handleDeleteTransactionGroup = (groupId: string, onlyFuture: boolean, fromInstallmentNumber: number) => {
    onUpdateData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => {
        if (t.installmentGroupId !== groupId) return true;
        if (onlyFuture) {
          return (t.installmentNumber || 0) < fromInstallmentNumber;
        }
        return false;
      })
    }));
    setDeletePromptTx(null);
  };

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return data.transactions.filter(tx => {
      // 1. Category filter
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;

      // 2. Currency filter
      if (currencyFilter !== 'all' && tx.currency !== currencyFilter) return false;

      // 3. Period filter
      const txDate = new Date(tx.date);
      const today = new Date();
      
      if (periodFilter === 'day') {
        const todayStr = today.toISOString().split('T')[0];
        return tx.date === todayStr;
      } else if (periodFilter === 'week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0,0,0,0);
        return txDate >= startOfWeek;
      } else if (periodFilter === 'month') {
        return txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
      } else if (periodFilter === 'year') {
        return txDate.getFullYear() === today.getFullYear();
      } else if (periodFilter === 'custom') {
        if (customStart && tx.date < customStart) return false;
        if (customEnd && tx.date > customEnd) return false;
      }
      return true;
    });
  }, [data.transactions, periodFilter, categoryFilter, currencyFilter, customStart, customEnd]);

  // Totals calculations based on BRL reference rate (simulated)
  const stats = useMemo(() => {
    let income = 0;
    let expenses = 0;

    filteredTransactions.forEach(t => {
      const conv = t.currency === 'USD' ? 5.50 : t.currency === 'EUR' ? 6.00 : 1.0;
      if (t.type === 'receita') {
        income += t.amount * conv;
      } else {
        expenses += t.amount * conv;
      }
    });

    return { income, expenses, balance: income - expenses };
  }, [filteredTransactions]);

  // Chart Data preparation
  const chartData = useMemo(() => {
    const totals: Record<string, number> = {};
    DEFAULT_CATEGORIES.forEach(cat => { totals[cat] = 0; });

    filteredTransactions
      .filter(t => t.type === 'despesa')
      .forEach(t => {
        const conv = t.currency === 'USD' ? 5.50 : t.currency === 'EUR' ? 6.00 : 1.0;
        totals[t.category] = (totals[t.category] || 0) + (t.amount * conv);
      });

    return Object.keys(totals)
      .map(name => ({ name, value: Number(totals[name].toFixed(2)) }))
      .filter(item => item.value > 0);
  }, [filteredTransactions]);

  const COLORS = ['#10b981', '#3b82f6', '#ef4444', '#a855f7', '#f59e0b', '#0ea5e9', '#64748b'];

  const handleSaveBudgets = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateData(prev => {
      const updated: Record<string, number> = {};
      DEFAULT_CATEGORIES.forEach(cat => {
        updated[cat] = Number(editingBudgets[cat]) || 0;
      });
      return {
        ...prev,
        budgets: updated
      };
    });
    alert('Limites de orçamento atualizados com sucesso!');
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Data,Descricao,Valor,Moeda,Tipo,Categoria,Subcategoria,Tags\n";

    filteredTransactions.forEach(t => {
      const row = [
        t.id,
        t.date,
        `"${t.description.replace(/"/g, '""')}"`,
        t.amount,
        t.currency,
        t.type,
        t.category,
        t.subcategory,
        `"${t.tags.join(', ')}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `financas_transacoes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="expenses-manager" className="space-y-8 animate-fade-in text-neutral-200">
      {/* Sub Tabs Toggle */}
      <div className="flex border-b border-neutral-800">
        <button
          onClick={() => setSubTab('transactions')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            subTab === 'transactions' 
              ? 'border-emerald-500 text-emerald-400' 
              : 'border-transparent text-neutral-450 hover:text-white'
          }`}
        >
          Transações Diárias
        </button>
        <button
          onClick={() => setSubTab('budgets')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            subTab === 'budgets' 
              ? 'border-emerald-500 text-emerald-400' 
              : 'border-transparent text-neutral-450 hover:text-white'
          }`}
        >
          Limites de Orçamentos
        </button>
      </div>

      {subTab === 'transactions' ? (
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'grid-cols-1 lg:grid-cols-3 gap-8'}`}>
          {/* Left Side: Create / Input transaction */}
          <div className={`bg-neutral-900/40 ${isMobile ? 'p-4' : 'p-6'} rounded-2xl border border-neutral-800/80 h-fit space-y-6`}>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
              <Plus className="w-4 h-4 text-emerald-400" />
              Lançamento Manual
            </h2>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              {/* Type Switch */}
              <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setType('despesa')}
                  className={`py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    type === 'despesa' 
                      ? 'bg-neutral-800 text-rose-400 shadow-xs' 
                      : 'text-neutral-500 hover:text-neutral-350'
                  }`}
                >
                  Despesa (Gasto)
                </button>
                <button
                  type="button"
                  onClick={() => setType('receita')}
                  className={`py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    type === 'receita' 
                      ? 'bg-neutral-800 text-emerald-400 shadow-xs' 
                      : 'text-neutral-500 hover:text-neutral-350'
                  }`}
                >
                  Receita (Entrada)
                </button>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Descrição</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Almoço no shopping, Salário..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Value & Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-neutral-400">Valor</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-400">Moeda</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="BRL">BRL (R$)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              {type === 'despesa' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-400">Categoria</label>
                    <select
                      value={category}
                      onChange={e => {
                        setCategory(e.target.value);
                        setSubcategory(SUBCATEGORIES_MAP[e.target.value]?.[0] || 'Outros');
                      }}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    >
                      {DEFAULT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-400">Subcategoria</label>
                    <select
                      value={subcategory}
                      onChange={e => setSubcategory(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-500"
                    >
                      {(SUBCATEGORIES_MAP[category] || ["Outros"]).map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {type === 'despesa' && (
                <div className="bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/80 space-y-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInstallments}
                      onChange={e => setIsInstallments(e.target.checked)}
                      className="rounded border-neutral-800 text-emerald-500 focus:ring-emerald-500 bg-neutral-900 cursor-pointer"
                    />
                    <span>Compra Parcelada?</span>
                  </label>

                  {isInstallments && (
                    <div className="grid grid-cols-2 gap-3 pt-1 animate-fade-in">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-400">Parcelas</label>
                        <select
                          value={installmentsCount}
                          onChange={e => setInstallmentsCount(e.target.value)}
                          className="w-full px-2 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-emerald-500"
                        >
                          {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 18, 24, 36, 48, 60, 72].map(n => (
                            <option key={n} value={n}>{n}x</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-400">Tipo de Valor</label>
                        <select
                          value={installmentValueType}
                          onChange={e => setInstallmentValueType(e.target.value as any)}
                          className="w-full px-2 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-emerald-500"
                        >
                          <option value="total">Valor Total</option>
                          <option value="parcela">Valor por Parcela</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Date */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Data do Gasto</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-400 block">Tags (Aperte Enter)</label>
                <input
                  type="text"
                  placeholder="ex: viagem, presente..."
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-500"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((tg, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-xs font-medium"
                    >
                      {tg}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTag(idx)}
                        className="text-emerald-400 hover:text-white font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl text-sm font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 text-black" />
                Registrar Lançamento
              </button>
            </form>
          </div>

          {/* Right Side: Filters, Summary Charts, and Transaction List */}
          <div className={`${isMobile ? 'col-span-1' : 'lg:col-span-2'} space-y-6`}>
            {/* Filter Section */}
            <div className={`bg-neutral-900/40 ${isMobile ? 'p-4' : 'p-5'} rounded-2xl border border-neutral-800/80 shadow-xs space-y-4`}>
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-neutral-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Filtros & Exportação</h3>
                </div>
                <button
                  onClick={handleExportCSV}
                  disabled={filteredTransactions.length === 0}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-450 hover:text-emerald-300 disabled:opacity-30 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Period */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-400">Período</label>
                  <select
                    value={periodFilter}
                    onChange={e => setPeriodFilter(e.target.value as any)}
                    className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-hidden"
                  >
                    <option value="all">Todas as Datas</option>
                    <option value="day">Hoje</option>
                    <option value="week">Esta Semana</option>
                    <option value="month">Este Mês</option>
                    <option value="year">Este Ano</option>
                    <option value="custom">Personalizado...</option>
                  </select>
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-400">Categoria</label>
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-hidden"
                  >
                    <option value="all">Todas as Categorias</option>
                    <option value="Salário">Salário / Receita</option>
                    {DEFAULT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Currency */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-400">Moeda</label>
                  <select
                    value={currencyFilter}
                    onChange={e => setCurrencyFilter(e.target.value)}
                    className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-hidden"
                  >
                    <option value="all">Todas as Moedas</option>
                    <option value="BRL">Apenas BRL (R$)</option>
                    <option value="USD">Apenas USD ($)</option>
                    <option value="EUR">Apenas EUR (€)</option>
                  </select>
                </div>
              </div>

              {periodFilter === 'custom' && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <span className="text-xs text-neutral-400">De:</span>
                    <input 
                      type="date" 
                      value={customStart}
                      onChange={e => setCustomStart(e.target.value)}
                      className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white font-mono focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-neutral-400">Até:</span>
                    <input 
                      type="date" 
                      value={customEnd}
                      onChange={e => setCustomEnd(e.target.value)}
                      className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white font-mono focus:outline-hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Micro Charts Section */}
            {chartData.length > 0 && (
              <div className={`bg-neutral-900/40 ${isMobile ? 'p-4' : 'p-5'} rounded-2xl border border-neutral-800/80 shadow-xs grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-5 gap-6'} items-center`}>
                <div className={`${isMobile ? 'col-span-1' : 'md:col-span-2'} space-y-2`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">Composição de Gastos</h4>
                  <p className="text-[11px] text-neutral-400">Convertidos para BRL</p>
                  <div className="mt-4 space-y-1.5">
                    {chartData.map((item, index) => (
                      <div key={item.name} className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-1.5 text-neutral-350">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          {item.name}
                        </span>
                        <span className="font-mono text-white font-bold">{formatCurrency(item.value, 'BRL')}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`${isMobile ? 'col-span-1' : 'md:col-span-3'} h-48`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }}
                        formatter={(value) => [formatCurrency(Number(value), 'BRL'), 'Gasto']} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* List Section */}
            <div className={`bg-neutral-900/40 ${isMobile ? 'p-4' : 'p-5'} rounded-2xl border border-neutral-800/80 shadow-xs space-y-4`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center justify-between">
                <span>Transações Filtradas ({filteredTransactions.length})</span>
                <span className="text-xs font-semibold text-neutral-400">
                  Saldo: <span className={stats.balance >= 0 ? 'text-emerald-400' : 'text-rose-450'}>{formatCurrency(stats.balance, 'BRL')}</span>
                </span>
              </h3>

              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                  <p className="text-neutral-400 text-xs">Nenhum lançamento encontrado para os filtros selecionados.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {filteredTransactions.map(tx => (
                    <div 
                      key={tx.id} 
                      className="flex justify-between items-center p-3.5 bg-neutral-950/40 hover:bg-neutral-900/40 rounded-xl border border-neutral-850 transition-colors"
                    >
                      <div className="space-y-1 min-w-0 flex-1 pr-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white text-sm leading-tight truncate">{tx.description}</span>
                          {tx.bankAccount && (
                            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] px-1.5 py-0.2 rounded font-semibold font-mono">
                              {tx.bankAccount}
                            </span>
                          )}
                          {tx.installmentGroupId && (
                            <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] px-1.5 py-0.2 rounded font-semibold font-mono" title={`Parcela ${tx.installmentNumber} de ${tx.installmentsCount}`}>
                              Parc. {tx.installmentNumber}/{tx.installmentsCount}
                            </span>
                          )}
                          {tx.confidence && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-1.5 py-0.2 rounded font-semibold font-mono" title={`IA Confiança: ${tx.confidence}%`}>
                              IA {tx.confidence}%
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-neutral-450">
                          <span className="font-mono">{tx.date}</span>
                          <span>•</span>
                          <span className={`${CATEGORY_TEXT_COLORS[tx.category] || 'text-neutral-400'} font-semibold`}>
                            {tx.category} {tx.subcategory ? `/ ${tx.subcategory}` : ''}
                          </span>
                          {tx.tags.length > 0 && (
                            <>
                              <span>•</span>
                              <div className="flex flex-wrap items-center gap-1">
                                {tx.tags.map((tg, i) => (
                                  <span key={i} className="text-[10px] bg-neutral-800 text-neutral-355 px-1 rounded-sm">
                                    #{tg}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className={`font-mono text-sm font-bold ${tx.type === 'receita' ? 'text-emerald-400' : 'text-white'}`}>
                          {tx.type === 'receita' ? '+' : '-'} {formatCurrency(tx.amount, tx.currency)}
                        </span>
                        <button
                          onClick={() => handleDeleteTransactionClick(tx)}
                          className="p-1.5 text-neutral-600 hover:text-rose-450 hover:bg-neutral-800/40 rounded-md transition-colors cursor-pointer"
                          title="Excluir Lançamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Limits / Budget Configuration UI */
        <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/80 shadow-xs max-w-xl mx-auto space-y-6">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Limites de Orçamentos por Categoria
            </h2>
            <p className="text-neutral-400 text-xs mt-1">
              Configure o limite máximo de gastos mensais que gostaria de manter em cada categoria de consumo.
            </p>
          </div>

          <form onSubmit={handleSaveBudgets} className="space-y-5">
            <div className="space-y-4">
              {DEFAULT_CATEGORIES.map(category => (
                <div key={category} className="grid grid-cols-2 gap-4 items-center">
                  <span className="text-xs font-bold uppercase text-neutral-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[DEFAULT_CATEGORIES.indexOf(category)] }} />
                    {category}
                  </span>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-neutral-500 font-mono">R$</span>
                    <input
                      type="number"
                      value={editingBudgets[category]}
                      onChange={e => setEditingBudgets({ ...editingBudgets, [category]: e.target.value })}
                      className="w-full pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-right text-white font-mono focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl text-sm font-bold transition-all shadow-xs cursor-pointer"
            >
              Salvar Configuração de Limites
            </button>
          </form>
        </div>
      )}

      {/* Installment Delete Confirmation Modal */}
      {deletePromptTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-850 rounded-2xl p-6 space-y-6 shadow-2xl animate-fade-in text-neutral-200">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Lançamento Parcelado</h3>
              <p className="text-xs text-neutral-400 mt-2">
                A transação <strong className="text-neutral-200">"{deletePromptTx.description}"</strong> faz parte de uma compra parcelada em <strong className="text-white">{deletePromptTx.installmentsCount} parcelas</strong>.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  handleDeleteTransaction(deletePromptTx.id);
                  setDeletePromptTx(null);
                }}
                className="w-full py-2.5 px-4 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-bold rounded-xl transition-all cursor-pointer text-left flex justify-between items-center"
              >
                <span>Excluir apenas esta parcela</span>
                <span className="text-[10px] text-neutral-450 font-mono">Esta específica</span>
              </button>

              <button
                onClick={() => handleDeleteTransactionGroup(deletePromptTx.installmentGroupId!, true, deletePromptTx.installmentNumber || 0)}
                className="w-full py-2.5 px-4 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-xl transition-all cursor-pointer text-left flex justify-between items-center"
              >
                <span>Excluir esta e parcelas futuras</span>
                <span className="text-[10px] text-rose-450 font-mono">Daqui para frente</span>
              </button>

              <button
                onClick={() => handleDeleteTransactionGroup(deletePromptTx.installmentGroupId!, false, 0)}
                className="w-full py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-black text-xs font-bold rounded-xl transition-all cursor-pointer text-left flex justify-between items-center"
              >
                <span>Excluir TODAS as parcelas do grupo</span>
                <span className="text-[10px] text-rose-950 font-mono font-semibold">Todo o grupo</span>
              </button>
            </div>

            <div className="pt-2 border-t border-neutral-800/80 flex justify-end">
              <button
                type="button"
                onClick={() => setDeletePromptTx(null)}
                className="px-4 py-2 bg-neutral-950 hover:bg-neutral-850 text-neutral-450 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
