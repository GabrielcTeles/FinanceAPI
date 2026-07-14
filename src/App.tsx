import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  TrendingUp, 
  PiggyBank, 
  Camera, 
  Shuffle, 
  Menu, 
  X,
  Sparkles,
  DollarSign,
  Database,
  LogOut,
  Apple
} from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import { AppData, MarketQuote, Transaction } from './types';
import { getStoredSupabaseConfig, inserirDados, deletarDados } from './utils/supabase';
import DashboardSummary from './components/DashboardSummary';
import ExpensesManager from './components/ExpensesManager';
import InvestmentsManager from './components/InvestmentsManager';
import FixedIncomeManager from './components/FixedIncomeManager';
import ReceiptScanner from './components/ReceiptScanner';
import OpenFinanceManager from './components/OpenFinanceManager';
import SupabaseManager from './components/SupabaseManager';
import IPhoneGuide from './components/IPhoneGuide';

const DEFAULT_FALLBACK_DATA: AppData = {
  profile: {
    name: "Gabriel Telles",
    email: "gabrielctelless@outlook.com",
    currency: "BRL" as const,
    theme: "light" as const,
  },
  transactions: [
    {
      id: "t-salary",
      date: "2026-07-01",
      amount: 75000.0,
      type: "receita" as const,
      category: "Salário",
      subcategory: "Mensal",
      description: "Salário mensal - Tech Corp",
      currency: "BRL" as const,
      tags: ["salario", "mensal"]
    },
    {
      id: "t1",
      date: "2026-07-01",
      amount: 120.50,
      type: "despesa" as const,
      category: "Alimentação",
      subcategory: "Restaurante",
      description: "Jantar - Pizzaria Camelo",
      currency: "BRL" as const,
      tags: ["lazer", "fim-de-semana"]
    }
  ],
  investments: [
    {
      id: "i1",
      ticker: "VALE3",
      name: "Vale S.A. ON",
      type: "Ações" as const,
      quantity: 50,
      purchasePrice: 62.4,
      purchaseDate: "2026-02-15",
      sector: "Materiais Básicos",
      currency: "BRL" as const
    },
    {
      id: "i2",
      ticker: "PETR4",
      name: "Petróleo Brasileiro S.A. PN",
      type: "Ações" as const,
      quantity: 100,
      purchasePrice: 35.8,
      purchaseDate: "2026-03-10",
      sector: "Petróleo & Gás",
      currency: "BRL" as const
    }
  ],
  fixedIncome: [
    {
      id: "fi1",
      type: "CDB" as const,
      value: 15000,
      rate: 110,
      applicationDate: "2026-01-02",
      maturityDate: "2028-01-02",
      indexation: "CDI" as const,
      liquidity: "Vencimento" as const
    }
  ],
  budgets: {
    "Alimentação": 1200,
    "Transporte": 400,
    "Saúde": 300,
    "Educação": 500,
    "Lazer": 600,
    "Utilities": 500,
    "Outros": 400
  },
  bankAccounts: []
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string; token: string } | null>(() => {
    try {
      const stored = localStorage.getItem("fin_session_v2");
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState<AppData | null>(null);
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [rates, setRates] = useState({ CDI: 14.15, SELIC: 14.25, IPCA: 4.64, Poupança: 6.17 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect real device mobile viewport
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load state from backend on mount or when user changes
  useEffect(() => {
    async function loadInitialData() {
      if (!currentUser) return;
      let loadedData: AppData | null = null;
      try {
        const sbConfig = getStoredSupabaseConfig();
        const headers: Record<string, string> = {
          "x-user-email": currentUser.email
        };
        if (sbConfig && sbConfig.url && sbConfig.apiKey) {
          headers["x-supabase-url"] = sbConfig.url;
          headers["x-supabase-key"] = sbConfig.apiKey;
        }

        const response = await fetch("/api/data", {
          headers
        });
        if (response.ok) {
          const text = await response.text();
          try {
            loadedData = JSON.parse(text);
          } catch (e) {
            console.warn("API returned invalid JSON, using fallback data:", e);
          }
        } else {
          console.warn(`API returned error status ${response.status}`);
        }
      } catch (e) {
        console.error("Error loading application data from backend:", e);
      }

      // Check local storage backup fallback if backend has issues
      if (!loadedData) {
        try {
          const backup = localStorage.getItem(`fin_data_${currentUser.email}`);
          if (backup) {
            loadedData = JSON.parse(backup);
            console.log("Restored user data from resilient browser backup.");
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (!loadedData) {
        console.log("Applying resilient client fallback data.");
        loadedData = {
          ...DEFAULT_FALLBACK_DATA,
          profile: {
            ...DEFAULT_FALLBACK_DATA.profile,
            name: currentUser.name,
            email: currentUser.email
          }
        };
      }
      setData(loadedData);

      // Fetch market quotes safely
      try {
        const quotesRes = await fetch("/api/market/quotes");
        if (quotesRes.ok) {
          const quotesJson = await quotesRes.json();
          setQuotes(quotesJson);
        } else {
          setQuotes([
            { ticker: "VALE3", price: 57.80, change24h: -0.8, name: "Vale S.A. ON", sector: "Materiais Básicos" },
            { ticker: "PETR4", price: 38.60, change24h: 1.2, name: "Petróleo Brasileiro S.A. PN", sector: "Petróleo & Gás" },
            { ticker: "AAPL", price: 220.50, change24h: 1.1, name: "Apple Inc.", sector: "Tecnologia" }
          ]);
        }
      } catch (e) {
        console.error("Error loading quotes:", e);
        setQuotes([
          { ticker: "VALE3", price: 57.80, change24h: -0.8, name: "Vale S.A. ON", sector: "Materiais Básicos" },
          { ticker: "PETR4", price: 38.60, change24h: 1.2, name: "Petróleo Brasileiro S.A. PN", sector: "Petróleo & Gás" },
          { ticker: "AAPL", price: 220.50, change24h: 1.1, name: "Apple Inc.", sector: "Tecnologia" }
        ]);
      }

      // Fetch fixed income reference rates safely
      try {
        const ratesRes = await fetch("/api/fixed-income/rates");
        if (ratesRes.ok) {
          const ratesJson = await ratesRes.json();
          setRates(ratesJson);
        }
      } catch (e) {
        console.error("Error loading reference rates:", e);
      }
    }
    loadInitialData();
  }, [currentUser]);

  // Update backend database and local state
  const handleUpdateData = (updater: (prev: AppData) => AppData) => {
    if (!data || !currentUser) return;
    
    const updated = updater(data);
    setData(updated);

    // Save to local backup immediately to be extremely resilient
    try {
      localStorage.setItem(`fin_data_${currentUser.email}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    
    // Post to backend asynchronously to persist local JSON db
    const sbConfig = getStoredSupabaseConfig();
    const headers: Record<string, string> = { 
      "Content-Type": "application/json",
      "x-user-email": currentUser.email
    };
    if (sbConfig && sbConfig.url && sbConfig.apiKey) {
      headers["x-supabase-url"] = sbConfig.url;
      headers["x-supabase-key"] = sbConfig.apiKey;
    }

    fetch("/api/data", {
      method: "POST",
      headers,
      body: JSON.stringify(updated)
    }).catch(err => console.error("Error persisting data:", err));

    // Supabase Auto-Sync integration
    try {
      const sbConfig = getStoredSupabaseConfig();
      if (sbConfig.autoSync) {
        const configForTable = (tableName: string) => ({
          url: sbConfig.url,
          apiKey: sbConfig.apiKey,
          tableName
        });

        // 1. Sync Transactions
        const prevTxs = data.transactions || [];
        const newTxs = updated.transactions || [];
        const addedTxs = newTxs.filter(nt => !prevTxs.some(pt => pt.id === nt.id));
        const deletedTxs = prevTxs.filter(pt => !newTxs.some(nt => nt.id === pt.id));

        addedTxs.forEach(tx => {
          inserirDados(tx, configForTable(sbConfig.transactionsTable), sbConfig.idFieldName)
            .then(() => console.log(`[Supabase Auto-Sync] Transação ${tx.id} inserida com sucesso.`))
            .catch(err => console.error(`[Supabase Auto-Sync] Erro ao inserir transação ${tx.id}:`, err));
        });

        deletedTxs.forEach(tx => {
          deletarDados(tx.id, configForTable(sbConfig.transactionsTable), sbConfig.idFieldName)
            .then(() => console.log(`[Supabase Auto-Sync] Transação ${tx.id} deletada com sucesso.`))
            .catch(err => console.error(`[Supabase Auto-Sync] Erro ao deletar transação ${tx.id}:`, err));
        });

        // 2. Sync Investments
        const prevInvs = data.investments || [];
        const newInvs = updated.investments || [];
        const addedInvs = newInvs.filter(ni => !prevInvs.some(pi => pi.id === ni.id));
        const deletedInvs = prevInvs.filter(pi => !newInvs.some(ni => ni.id === pi.id));

        addedInvs.forEach(inv => {
          inserirDados(inv, configForTable(sbConfig.investmentsTable), sbConfig.idFieldName)
            .then(() => console.log(`[Supabase Auto-Sync] Investimento ${inv.id} inserido com sucesso.`))
            .catch(err => console.error(`[Supabase Auto-Sync] Erro ao inserir investimento ${inv.id}:`, err));
        });

        deletedInvs.forEach(inv => {
          deletarDados(inv.id, configForTable(sbConfig.investmentsTable), sbConfig.idFieldName)
            .then(() => console.log(`[Supabase Auto-Sync] Investimento ${inv.id} deletado com sucesso.`))
            .catch(err => console.error(`[Supabase Auto-Sync] Erro ao deletar investimento ${inv.id}:`, err));
        });

        // 3. Sync Fixed Income
        const prevFi = data.fixedIncome || [];
        const newFi = updated.fixedIncome || [];
        const addedFi = newFi.filter(nf => !prevFi.some(pf => pf.id === nf.id));
        const deletedFi = prevFi.filter(pf => !newFi.some(nf => nf.id === pf.id));

        addedFi.forEach(fi => {
          inserirDados(fi, configForTable(sbConfig.fixedIncomeTable), sbConfig.idFieldName)
            .then(() => console.log(`[Supabase Auto-Sync] Renda Fixa ${fi.id} inserida com sucesso.`))
            .catch(err => console.error(`[Supabase Auto-Sync] Erro ao inserir renda fixa ${fi.id}:`, err));
        });

        deletedFi.forEach(fi => {
          deletarDados(fi.id, configForTable(sbConfig.fixedIncomeTable), sbConfig.idFieldName)
            .then(() => console.log(`[Supabase Auto-Sync] Renda Fixa ${fi.id} deletada com sucesso.`))
            .catch(err => console.error(`[Supabase Auto-Sync] Erro ao deletar renda fixa ${fi.id}:`, err));
        });
      }
    } catch (sbErr) {
      console.error("[Supabase Auto-Sync] Falha no motor de sincronização automática:", sbErr);
    }
  };

  // Triggers OpenFinance Porting Worker
  const handleSyncBank = async (bankName: string) => {
    if (!currentUser) return;
    try {
      const response = await fetch("/api/openfinance/sync", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": currentUser.email
        },
        body: JSON.stringify({ bankName })
      });
      const result = await response.json();
      
      if (result.success) {
        // Update local state bank balance and prepend any synced transactions
        setData(prev => {
          if (!prev) return null;
          const updated = {
            ...prev,
            bankAccounts: result.fullAccounts,
            transactions: [...result.addedTransactions, ...prev.transactions]
          };
          // Save to local backup as well
          localStorage.setItem(`fin_data_${currentUser.email}`, JSON.stringify(updated));
          return updated;
        });
      }
      return result;
    } catch (e) {
      console.error("Failed to sync bank via OpenFinance API:", e);
      throw e;
    }
  };

  // Fluctuates market quotes dynamically on demand
  const handleRefreshQuotes = async () => {
    try {
      const quotesRes = await fetch("/api/market/quotes");
      const quotesJson = await quotesRes.json();
      setQuotes(quotesJson);
    } catch (e) {
      console.error("Error refreshing quotes:", e);
    }
  };

  // Registers transaction scanned from AI Receipt Scan
  const handleAddScannedTransaction = (scannedTx: Partial<Transaction>) => {
    const fullTx: Transaction = {
      id: 'tx-' + Math.random().toString(36).substr(2, 9),
      date: scannedTx.date || new Date().toISOString().split('T')[0],
      amount: scannedTx.amount || 0.0,
      type: 'despesa',
      category: scannedTx.category || 'Outros',
      subcategory: scannedTx.subcategory || 'Simulado',
      description: scannedTx.description || 'Gasto por Foto',
      currency: 'BRL',
      tags: scannedTx.tags || ['IA-Scan'],
      confidence: scannedTx.confidence || 95,
      items: scannedTx.items || []
    };

    handleUpdateData(prev => ({
      ...prev,
      transactions: [fullTx, ...prev.transactions]
    }));
  };

  if (!currentUser) {
    const handleLoginSuccess = (email: string, token: string, name: string, userData: AppData) => {
      const session = { email, token, name };
      localStorage.setItem("fin_session_v2", JSON.stringify(session));
      localStorage.setItem(`fin_data_${email}`, JSON.stringify(userData));
      setCurrentUser(session);
      setData(userData);
    };

    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const handleLogout = () => {
    localStorage.removeItem("fin_session_v2");
    setCurrentUser(null);
    setData(null);
    setActiveTab('dashboard');
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-white font-sans">
        <div className="space-y-4 text-center">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-neutral-800 rounded-full" />
            <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />
          </div>
          <p className="text-neutral-400 text-xs font-semibold font-mono uppercase tracking-widest">Iniciando Finanças Inteligentes...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'expenses', label: 'Controle de Gastos', icon: CreditCard },
    { id: 'investments', label: 'Renda Variável', icon: TrendingUp },
    { id: 'fixedincome', label: 'Renda Fixa', icon: PiggyBank },
    { id: 'receiptscanner', label: 'Scanner de Recibos IA', icon: Camera, highlight: true },
    { id: 'openfinance', label: 'OpenFinance Sync', icon: Shuffle },
    { id: 'supabase', label: 'Conexão Supabase', icon: Database },
    { id: 'iosguide', label: 'Compilar App Store', icon: Apple, highlight: true },
  ];

  // Helper to render current active component
  const renderActiveContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardSummary data={data} quotes={quotes} rates={rates} onTabChange={setActiveTab} isMobile={isMobile} />;
      case 'expenses':
        return <ExpensesManager data={data} onUpdateData={handleUpdateData} isMobile={isMobile} />;
      case 'investments':
        return <InvestmentsManager data={data} quotes={quotes} onUpdateData={handleUpdateData} onRefreshQuotes={handleRefreshQuotes} isMobile={isMobile} />;
      case 'fixedincome':
        return <FixedIncomeManager data={data} rates={rates} onUpdateData={handleUpdateData} isMobile={isMobile} />;
      case 'receiptscanner':
        return <ReceiptScanner onAddScannedTransaction={handleAddScannedTransaction} isMobile={isMobile} />;
      case 'openfinance':
        return <OpenFinanceManager data={data} onUpdateData={handleUpdateData} onSyncBank={handleSyncBank} isMobile={isMobile} />;
      case 'supabase':
        return <SupabaseManager data={data} onUpdateData={handleUpdateData} isMobile={isMobile} />;
      case 'iosguide':
        return <IPhoneGuide />;
      default:
        return <DashboardSummary data={data} quotes={quotes} rates={rates} onTabChange={setActiveTab} isMobile={isMobile} />;
    }
  };



  // Classic Full Width / Desktop Web App Mode
  return (
    <div id="financas-root" className="min-h-screen bg-[#09090b] flex flex-col md:flex-row font-sans text-neutral-200">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0c0c0e] border-r border-neutral-800/80 text-white min-h-screen p-5 justify-between">
        <div className="space-y-8">
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5 pt-2">
            <div className="w-9 h-9 bg-linear-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center font-black text-black text-lg shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              FI
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight font-display leading-none text-white">Finanças</h1>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block mt-0.5 font-mono">Inteligentes</span>
            </div>
          </div>



          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'bg-neutral-800 text-emerald-400 border border-neutral-700/60 shadow-[0_2px_10px_rgba(0,0,0,0.2)]' 
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-neutral-400 group-hover:text-white'}`} />
                    {item.label}
                  </span>
                  {item.highlight && (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-sm text-[8px] font-extrabold uppercase tracking-widest animate-pulse">
                      IA
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer profile & Logout */}
        <div className="border-t border-neutral-800 pt-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-emerald-500 to-teal-600 text-black font-extrabold flex items-center justify-center rounded-full uppercase shadow-[0_0_10px_rgba(16,185,129,0.1)] text-sm shrink-0">
              {data.profile.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold truncate text-white leading-tight">{data.profile.name}</h4>
              <span className="text-[10px] text-neutral-400 font-medium truncate block mt-0.5">{data.profile.email}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 justify-center py-2 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800/80 hover:border-rose-500/35 hover:text-rose-400 text-neutral-400 font-bold text-[10px] tracking-wider uppercase rounded-xl transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair da Conta</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden bg-[#0c0c0e] border-b border-neutral-800/80 text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-linear-to-br from-emerald-500 to-teal-600 text-black font-black rounded-lg flex items-center justify-center text-sm">
            FI
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Finanças Inteligentes</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 text-neutral-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav className="md:hidden bg-[#0c0c0e] border-b border-neutral-800 text-white p-4 space-y-1 absolute top-[64px] left-0 right-0 z-40 shadow-2xl animate-fade-in">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-neutral-800 text-emerald-400 border border-neutral-700/60' 
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  {item.label}
                </span>
                {item.highlight && (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-sm text-[8px] font-extrabold uppercase">
                    IA
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={() => {
              handleLogout();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer transition-all mt-2 border border-dashed border-rose-500/20"
          >
            <span className="flex items-center gap-3">
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </span>
          </button>
        </nav>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
        {renderActiveContent()}
      </main>
    </div>
  );
}
