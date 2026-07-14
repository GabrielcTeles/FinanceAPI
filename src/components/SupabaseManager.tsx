import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  Plus, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink, 
  Code, 
  Copy,
  Info,
  ToggleLeft,
  ToggleRight,
  ArrowUpRight,
  ArrowDownLeft,
  HelpCircle,
  FileText
} from 'lucide-react';
import { 
  buscarDados, 
  inserirDados, 
  deletarDados,
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  SupabaseGlobalConfig,
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_KEY
} from '../utils/supabase';
import { AppData, Transaction, Investment, FixedIncome } from '../types';

interface SupabaseManagerProps {
  data: AppData;
  onUpdateData: (updater: (prev: AppData) => AppData) => void;
  isMobile?: boolean;
}

export default function SupabaseManager({ data, onUpdateData, isMobile }: SupabaseManagerProps) {
  // Config state
  const [config, setConfig] = useState<SupabaseGlobalConfig>(() => getStoredSupabaseConfig());
  
  // UI Tabs: 'config' | 'playground' | 'schemas'
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'playground' | 'schemas'>('config');

  // Generic Playground states
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Playground Test JSON State
  const [newRecordJson, setNewRecordJson] = useState(
    JSON.stringify({
      descricao: "Almoço de Teste",
      valor: 45.90,
      categoria: "Alimentação",
      tags: ["supabase", "teste"]
    }, null, 2)
  );
  const [deleteId, setDeleteId] = useState("");
  const [lastJsonResponse, setLastJsonResponse] = useState<any>(null);

  // Load configuration on mount
  useEffect(() => {
    setConfig(getStoredSupabaseConfig());
  }, []);

  // Update a single config key and save
  const handleUpdateConfig = <K extends keyof SupabaseGlobalConfig>(key: K, value: SupabaseGlobalConfig[K]) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    saveStoredSupabaseConfig(newConfig);
  };

  // Get localized credentials for fetch operations
  const getFetchConfig = (customTable?: string) => ({
    url: config.url,
    apiKey: config.apiKey,
    tableName: customTable || config.transactionsTable
  });

  // Test fetch (GET) for Playground
  const handleFetchPlayground = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await buscarDados({
        url: config.url,
        apiKey: config.apiKey,
        tableName: config.transactionsTable // default playground target
      });
      setRecords(Array.isArray(result) ? result : [result]);
      setLastJsonResponse(result);
      setSuccess(`Busca realizada com sucesso! Retornados ${Array.isArray(result) ? result.length : 1} registros.`);
    } catch (err: any) {
      setError(err.message || "Erro inesperado ao buscar dados.");
      setLastJsonResponse(null);
    } finally {
      setLoading(false);
    }
  };

  // Test insert (POST) for Playground
  const handleInsertPlayground = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      let parsedData;
      try {
        parsedData = JSON.parse(newRecordJson);
      } catch (jsonErr) {
        throw new Error("O JSON inserido é inválido. Por favor, corrija a sintaxe.");
      }

      const result = await inserirDados(parsedData, {
        url: config.url,
        apiKey: config.apiKey,
        tableName: config.transactionsTable
      }, config.idFieldName);
      
      setLastJsonResponse(result);
      setSuccess("Registro inserido com sucesso!");
      handleFetchPlayground();
    } catch (err: any) {
      setError(err.message || "Erro inesperado ao inserir dados.");
    } finally {
      setLoading(false);
    }
  };

  // Test delete (DELETE) for Playground
  const handleDeletePlayground = async (idToDelete?: string | number) => {
    const targetId = idToDelete !== undefined ? idToDelete : deleteId;
    if (!targetId) {
      setError("Por favor, forneça um ID para exclusão.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await deletarDados(targetId, {
        url: config.url,
        apiKey: config.apiKey,
        tableName: config.transactionsTable
      }, config.idFieldName);
      
      setLastJsonResponse(result);
      setSuccess(`Registro ID "${targetId}" excluído com sucesso!`);
      if (idToDelete === undefined) {
        setDeleteId("");
      }
      handleFetchPlayground();
    } catch (err: any) {
      setError(err.message || "Erro inesperado ao deletar.");
    } finally {
      setLoading(false);
    }
  };

  // --- BULK ACTION HANDLERS ---

  // 1. Export local records to Supabase (Upload)
  const handleBulkExport = async (type: 'transactions' | 'investments' | 'fixedIncome') => {
    const keyLabel = type === 'transactions' ? 'Gastos' : type === 'investments' ? 'Investimentos' : 'Renda Fixa';
    const tableName = type === 'transactions' 
      ? config.transactionsTable 
      : type === 'investments' 
        ? config.investmentsTable 
        : config.fixedIncomeTable;

    const localList = type === 'transactions' 
      ? data.transactions 
      : type === 'investments' 
        ? data.investments 
        : data.fixedIncome;

    if (!localList || localList.length === 0) {
      setError(`Nenhum item local de ${keyLabel} encontrado para exportar.`);
      return;
    }

    setBulkLoading(prev => ({ ...prev, [type]: true }));
    setError(null);
    setSuccess(null);

    try {
      let count = 0;
      // We upload each item to Supabase REST API
      for (const item of localList) {
        await inserirDados(item, {
          url: config.url,
          apiKey: config.apiKey,
          tableName
        }, config.idFieldName);
        count++;
      }
      
      setSuccess(`Exportação concluída! ${count} registros de ${keyLabel} foram enviados para a tabela "${tableName}" no Supabase.`);
    } catch (err: any) {
      setError(`Erro na exportação em lote de ${keyLabel}: ${err.message || "Verifique se a tabela correspondente existe no seu banco de dados."}`);
    } finally {
      setBulkLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  // 2. Import records from Supabase into local state (Download & Merge)
  const handleBulkImport = async (type: 'transactions' | 'investments' | 'fixedIncome') => {
    const keyLabel = type === 'transactions' ? 'Gastos' : type === 'investments' ? 'Investimentos' : 'Renda Fixa';
    const tableName = type === 'transactions' 
      ? config.transactionsTable 
      : type === 'investments' 
        ? config.investmentsTable 
        : config.fixedIncomeTable;

    setBulkLoading(prev => ({ ...prev, [type]: true }));
    setError(null);
    setSuccess(null);

    try {
      const fetchedData = await buscarDados({
        url: config.url,
        apiKey: config.apiKey,
        tableName
      });

      if (!fetchedData || !Array.isArray(fetchedData)) {
        throw new Error("O Supabase retornou uma resposta inválida ou vazia.");
      }

      onUpdateData(prev => {
        if (type === 'transactions') {
          // Merge by ID to avoid duplicates
          const existingIds = new Set(prev.transactions.map(t => t.id));
          const newTxs: Transaction[] = fetchedData.map((row: any) => ({
            id: String(row[config.idFieldName] || row.id || 'tx-' + Math.random().toString(36).substr(2, 5)),
            date: row.date || new Date().toISOString().split('T')[0],
            amount: Number(row.amount || row.valor || 0),
            type: row.type || 'despesa',
            category: row.category || row.categoria || 'Outros',
            subcategory: row.subcategory || row.subcategoria || 'Outros',
            description: row.description || row.descricao || 'Importado Supabase',
            currency: row.currency || 'BRL',
            tags: Array.isArray(row.tags) ? row.tags : []
          }));
          const filteredNew = newTxs.filter(tx => !existingIds.has(tx.id));
          return {
            ...prev,
            transactions: [...filteredNew, ...prev.transactions]
          };
        } else if (type === 'investments') {
          const existingIds = new Set(prev.investments.map(i => i.id));
          const newInvs: Investment[] = fetchedData.map((row: any) => ({
            id: String(row[config.idFieldName] || row.id || 'inv-' + Math.random().toString(36).substr(2, 5)),
            ticker: row.ticker || 'ATIVO',
            name: row.name || row.nome || row.ticker || 'Ativo Importado',
            type: row.type || 'Ações',
            quantity: Number(row.quantity || row.quantidade || 0),
            purchasePrice: Number(row.purchasePrice || row.valor_compra || row.purchase_price || 0),
            purchaseDate: row.purchaseDate || row.data_compra || row.purchase_date || new Date().toISOString().split('T')[0],
            sector: row.sector || row.setor || 'Geral',
            currency: row.currency || 'BRL'
          }));
          const filteredNew = newInvs.filter(inv => !existingIds.has(inv.id));
          return {
            ...prev,
            investments: [...prev.investments, ...filteredNew]
          };
        } else {
          const existingIds = new Set(prev.fixedIncome.map(f => f.id));
          const newFi: FixedIncome[] = fetchedData.map((row: any) => ({
            id: String(row[config.idFieldName] || row.id || 'fi-' + Math.random().toString(36).substr(2, 5)),
            type: row.type || 'CDB',
            value: Number(row.value || row.valor || 0),
            rate: Number(row.rate || row.taxa || 0),
            indexation: row.indexation || row.indexador || 'CDI',
            applicationDate: row.applicationDate || row.data_aplicacao || row.application_date || new Date().toISOString().split('T')[0],
            maturityDate: row.maturityDate || row.data_vencimento || row.maturity_date || new Date().toISOString().split('T')[0],
            liquidity: row.liquidity || row.liquidez || 'Vencimento'
          }));
          const filteredNew = newFi.filter(fi => !existingIds.has(fi.id));
          return {
            ...prev,
            fixedIncome: [...prev.fixedIncome, ...filteredNew]
          };
        }
      });

      setSuccess(`Importação concluída! Carregados ${fetchedData.length} itens da tabela "${tableName}" para o aplicativo local.`);
    } catch (err: any) {
      setError(`Erro na importação de ${keyLabel}: ${err.message || "Tabela inexistente ou colunas incompatíveis."}`);
    } finally {
      setBulkLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert("Código SQL copiado!");
  };

  // SQL Schemas definitions for the user to run on Supabase
  const transactionsSql = `CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL, -- 'receita' ou 'despesa'
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  currency TEXT DEFAULT 'BRL',
  tags TEXT[]
);

-- Liberar acesso (Escolha uma das opções abaixo):
-- Opção 1: Desativar Segurança (Mais simples para testes)
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Opção 2: Criar política pública (Recomendado para produção simples)
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Permitir tudo para anon" ON transactions FOR ALL USING (true) WITH CHECK (true);`;

  const investmentsSql = `CREATE TABLE investments (
  id TEXT PRIMARY KEY,
  ticker TEXT NOT NULL,
  name TEXT,
  type TEXT NOT NULL, -- 'Ações', 'ETFs' ou 'Cripto'
  quantity NUMERIC NOT NULL,
  "purchasePrice" NUMERIC NOT NULL,
  "purchaseDate" TEXT,
  sector TEXT,
  currency TEXT DEFAULT 'BRL'
);

-- Liberar acesso (Escolha uma das opções abaixo):
-- Opção 1: Desativar Segurança (Mais simples para testes)
ALTER TABLE investments DISABLE ROW LEVEL SECURITY;

-- Opção 2: Criar política pública (Recomendado para produção simples)
-- ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Permitir tudo para anon" ON investments FOR ALL USING (true) WITH CHECK (true);`;

  const fixedIncomeSql = `CREATE TABLE fixed_income (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'CDB', 'LCI', 'LCA', 'Poupança', 'Tesouro Direto', etc.
  value NUMERIC NOT NULL,
  rate NUMERIC NOT NULL,
  indexation TEXT NOT NULL, -- 'CDI', 'SELIC', 'IPCA', 'Pré'
  "applicationDate" TEXT,
  "maturityDate" TEXT,
  liquidity TEXT
);

-- Liberar acesso (Escolha uma das opções abaixo):
-- Opção 1: Desativar Segurança (Mais simples para testes)
ALTER TABLE fixed_income DISABLE ROW LEVEL SECURITY;

-- Opção 2: Criar política pública (Recomendado para produção simples)
-- ALTER TABLE fixed_income ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Permitir tudo para anon" ON fixed_income FOR ALL USING (true) WITH CHECK (true);`;

  const userAccountsSql = `CREATE TABLE user_accounts (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  currency TEXT DEFAULT 'BRL',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Liberar acesso para testes rápidos e desenvolvimento
ALTER TABLE user_accounts DISABLE ROW LEVEL SECURITY;`;

  const userProfilesSql = `CREATE TABLE user_profiles (
  email TEXT PRIMARY KEY REFERENCES user_accounts(email) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Liberar acesso para testes rápidos e desenvolvimento
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;`;

  const codeExampleJs = `import { buscarDados, inserirDados } from './utils/supabase';

// Sempre que você adiciona ou deleta no app, o motor dispara as chamadas automatizadas:
const novoGasto = await inserirDados({
  descricao: "Supermercado",
  valor: 150.30,
  categoria: "Alimentação"
}, {
  url: "${config.url}",
  apiKey: "${config.apiKey.substring(0, 15)}...",
  tableName: "${config.transactionsTable}"
});`;

  return (
    <div id="supabase-manager-view" className="space-y-8 animate-fade-in text-neutral-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-widest mb-1.5">
            <Database className="w-3.5 h-3.5" />
            <span>Sincronização em Nuvem</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight font-display">
            Conexão & Sincronização Supabase
          </h2>
          <p className="text-neutral-400 text-xs mt-1">
            Conecte suas tabelas reais do Supabase para enviar e receber gastos, investimentos e CDBs de forma instantânea ou em lote.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a 
            href="https://supabase.com" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold border border-neutral-700 transition"
          >
            <span>Ir para o Painel Supabase</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-neutral-800 pb-px gap-2">
        <button
          onClick={() => { setActiveSubTab('config'); setError(null); setSuccess(null); }}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 rounded-t-lg ${
            activeSubTab === 'config'
              ? 'text-emerald-400 border-emerald-500 bg-emerald-500/5'
              : 'text-neutral-400 border-transparent hover:text-white'
          }`}
        >
          Configuração & Sincronização
        </button>
        <button
          onClick={() => { setActiveSubTab('schemas'); setError(null); setSuccess(null); }}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 rounded-t-lg ${
            activeSubTab === 'schemas'
              ? 'text-emerald-400 border-emerald-500 bg-emerald-500/5'
              : 'text-neutral-400 border-transparent hover:text-white'
          }`}
        >
          Estrutura das Tabelas (SQL)
        </button>
        <button
          onClick={() => { setActiveSubTab('playground'); setError(null); setSuccess(null); }}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 rounded-t-lg ${
            activeSubTab === 'playground'
              ? 'text-emerald-400 border-emerald-500 bg-emerald-500/5'
              : 'text-neutral-400 border-transparent hover:text-white'
          }`}
        >
          Playground de Testes
        </button>
      </div>

      {/* Errors & Success Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 animate-shake">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-red-400">Falha de Conexão ou Validação</h4>
            <p className="text-[11px] text-neutral-300 mt-0.5 leading-relaxed">{error}</p>
            <p className="text-[10px] text-neutral-500 mt-1 font-mono">
              Solução comum: Verifique as credenciais, desative o RLS (ou crie políticas de acesso públicas) e confira se criou as tabelas corretas na aba "Estrutura das Tabelas".
            </p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-emerald-400">Sucesso na Operação</h4>
            <p className="text-[11px] text-neutral-300 mt-0.5 leading-relaxed">{success}</p>
          </div>
        </div>
      )}

      {/* --- TAB 1: CONFIGURATION AND BULK SYNC --- */}
      {activeSubTab === 'config' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Credentials Card */}
            <div className="lg:col-span-2 bg-[#0c0c0e] border border-neutral-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Credenciais de Autenticação Supabase
                </h3>
                
                {/* Auto Sync Toggle */}
                <button
                  onClick={() => handleUpdateConfig('autoSync', !config.autoSync)}
                  className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 px-3 py-1.5 rounded-xl transition"
                >
                  <span className="text-[10px] font-mono font-bold uppercase text-neutral-400">Sinc Automática</span>
                  {config.autoSync ? (
                    <ToggleRight className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-neutral-600" />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
                    SUPABASE_URL
                  </label>
                  <input
                    type="text"
                    value={config.url}
                    onChange={(e) => handleUpdateConfig('url', e.target.value)}
                    placeholder="https://seu-projeto.supabase.co"
                    className="w-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-200 focus:outline-hidden transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
                    SUPABASE_ANON_KEY
                  </label>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => handleUpdateConfig('apiKey', e.target.value)}
                    placeholder="sua-anon-key-aqui"
                    className="w-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-200 focus:outline-hidden transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
                    Tabela de Transações / Gastos
                  </label>
                  <input
                    type="text"
                    value={config.transactionsTable}
                    onChange={(e) => handleUpdateConfig('transactionsTable', e.target.value)}
                    placeholder="transactions"
                    className="w-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-200 focus:outline-hidden transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
                    Tabela de Investimentos (Ações/Cripto)
                  </label>
                  <input
                    type="text"
                    value={config.investmentsTable}
                    onChange={(e) => handleUpdateConfig('investmentsTable', e.target.value)}
                    placeholder="investments"
                    className="w-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-200 focus:outline-hidden transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
                    Tabela de Renda Fixa (CDBs)
                  </label>
                  <input
                    type="text"
                    value={config.fixedIncomeTable}
                    onChange={(e) => handleUpdateConfig('fixedIncomeTable', e.target.value)}
                    placeholder="fixed_income"
                    className="w-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-200 focus:outline-hidden transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
                    Chave Primária da Tabela (ID Field)
                  </label>
                  <input
                    type="text"
                    value={config.idFieldName}
                    onChange={(e) => handleUpdateConfig('idFieldName', e.target.value)}
                    placeholder="id"
                    className="w-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-200 focus:outline-hidden transition"
                  />
                </div>
              </div>

              <div className="flex gap-2 items-center bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl text-xs text-neutral-400">
                <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {config.autoSync 
                    ? "✨ Sincronização em tempo real ATIVA: Qualquer inserção ou exclusão que você fizer nas abas do aplicativo será imediatamente sincronizada com o Supabase!" 
                    : "Sincronização manual: Suas alterações ficam salvas apenas localmente até você utilizar os botões de envio/importação em lote ou ativar a Sincronização Automática acima."
                  }
                </span>
              </div>
            </div>

            {/* Sandbox Simulation indicator */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Modo Sandbox vs. Real</h4>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Para facilitar seus testes imediatos, o aplicativo detecta se você está usando as credenciais padrão do Supabase.
                </p>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Se você manter os valores <code className="text-emerald-400 bg-black/40 px-1 py-0.5 rounded text-[10px]">seu-projeto</code>, o sistema ativa um **Sandbox Simulado** que persiste seus dados localmente, permitindo testar tudo com segurança antes de usar as chaves reais!
                </p>
              </div>

              <div className="border-t border-neutral-800 pt-3 mt-3">
                <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider font-mono">Status da Conexão</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${config.url.includes("seu-projeto") ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                  <span className="text-xs font-bold text-white font-mono">
                    {config.url.includes("seu-projeto") ? "Simulação Sandbox Ativa" : "Conectado à API Externa"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Sync Section */}
          <div className="bg-[#0c0c0e] border border-neutral-800 rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Gerenciamento de Sincronização em Lote (Bulk Sync)
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Envie dados que você já registrou no aplicativo de uma vez só ou baixe os dados salvos anteriormente no Supabase para mesclar localmente.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Transactions Bulk Card */}
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Gastos e Receitas</h4>
                    <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">Tabela: "{config.transactionsTable}"</span>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold">
                    {data.transactions.length} itens locais
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => handleBulkExport('transactions')}
                    disabled={bulkLoading['transactions']}
                    className="flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-950 border border-neutral-700 hover:border-neutral-600 text-white disabled:text-neutral-600 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Enviar</span>
                  </button>
                  <button
                    onClick={() => handleBulkImport('transactions')}
                    disabled={bulkLoading['transactions']}
                    className="flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-950 border border-neutral-700 hover:border-neutral-600 text-white disabled:text-neutral-600 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-amber-400" />
                    <span>Baixar</span>
                  </button>
                </div>
              </div>

              {/* Investments Bulk Card */}
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Investimentos RV</h4>
                    <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">Tabela: "{config.investmentsTable}"</span>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold">
                    {data.investments.length} itens locais
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => handleBulkExport('investments')}
                    disabled={bulkLoading['investments']}
                    className="flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-950 border border-neutral-700 hover:border-neutral-600 text-white disabled:text-neutral-600 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Enviar</span>
                  </button>
                  <button
                    onClick={() => handleBulkImport('investments')}
                    disabled={bulkLoading['investments']}
                    className="flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-950 border border-neutral-700 hover:border-neutral-600 text-white disabled:text-neutral-600 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-amber-400" />
                    <span>Baixar</span>
                  </button>
                </div>
              </div>

              {/* Fixed Income Bulk Card */}
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">CDBs e Renda Fixa</h4>
                    <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">Tabela: "{config.fixedIncomeTable}"</span>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold">
                    {data.fixedIncome.length} CDBs locais
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => handleBulkExport('fixedIncome')}
                    disabled={bulkLoading['fixedIncome']}
                    className="flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-950 border border-neutral-700 hover:border-neutral-600 text-white disabled:text-neutral-600 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Enviar</span>
                  </button>
                  <button
                    onClick={() => handleBulkImport('fixedIncome')}
                    disabled={bulkLoading['fixedIncome']}
                    className="flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-950 border border-neutral-700 hover:border-neutral-600 text-white disabled:text-neutral-600 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-amber-400" />
                    <span>Baixar</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: SQL SCHEMAS --- */}
      {activeSubTab === 'schemas' && (
        <div className="space-y-6">
          <div className="bg-neutral-900/40 border border-neutral-800 p-6 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Sintaxes SQL para criar as tabelas no Supabase
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Para que a sincronização funcione perfeitamente com seu banco de dados real do Supabase, você precisa criar as tabelas com os nomes de colunas correspondentes. Copie os códigos SQL abaixo e cole-os no painel <strong className="text-white">SQL Editor</strong> do seu projeto Supabase.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* User Accounts SQL */}
            <div className="bg-[#0c0c0e] border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">1. Contas de Usuários</h4>
                  <button 
                    onClick={() => handleCopyCode(userAccountsSql)}
                    className="text-emerald-400 hover:text-emerald-300 text-[11px] flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar SQL
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 mb-3">
                  Tabela para armazenar contas de usuários registradas (Autenticação multi-usuário).
                </p>
                <pre className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-[10px] text-emerald-400 font-mono overflow-x-auto leading-relaxed max-h-[180px]">
                  {userAccountsSql}
                </pre>
              </div>
            </div>

            {/* User Profiles SQL */}
            <div className="bg-[#0c0c0e] border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">2. Perfis e Finanças</h4>
                  <button 
                    onClick={() => handleCopyCode(userProfilesSql)}
                    className="text-emerald-400 hover:text-emerald-300 text-[11px] flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar SQL
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 mb-3">
                  Tabela para salvar as carteiras completas, orçamentos e perfil de cada usuário.
                </p>
                <pre className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-[10px] text-emerald-400 font-mono overflow-x-auto leading-relaxed max-h-[180px]">
                  {userProfilesSql}
                </pre>
              </div>
            </div>

            {/* Transactions SQL */}
            <div className="bg-[#0c0c0e] border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">3. Tabela de Transações</h4>
                  <button 
                    onClick={() => handleCopyCode(transactionsSql)}
                    className="text-emerald-400 hover:text-emerald-300 text-[11px] flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar SQL
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 mb-3">
                  Tabela para sincronização estruturada (em lote/automática) de gastos e receitas.
                </p>
                <pre className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-[10px] text-emerald-400 font-mono overflow-x-auto leading-relaxed max-h-[180px]">
                  {transactionsSql}
                </pre>
              </div>
            </div>

            {/* Investments SQL */}
            <div className="bg-[#0c0c0e] border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">4. Tabela de Investimentos</h4>
                  <button 
                    onClick={() => handleCopyCode(investmentsSql)}
                    className="text-emerald-400 hover:text-emerald-300 text-[11px] flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar SQL
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 mb-3">
                  Tabela para sincronizar ações, criptomoedas e ETFs da sua carteira.
                </p>
                <pre className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-[10px] text-emerald-400 font-mono overflow-x-auto leading-relaxed max-h-[180px]">
                  {investmentsSql}
                </pre>
              </div>
            </div>

            {/* Fixed Income SQL */}
            <div className="bg-[#0c0c0e] border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">5. Tabela de Renda Fixa</h4>
                  <button 
                    onClick={() => handleCopyCode(fixedIncomeSql)}
                    className="text-emerald-400 hover:text-emerald-300 text-[11px] flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar SQL
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 mb-3">
                  Tabela para armazenar seus títulos de CDBs, LCIs, LCAs e Tesouro.
                </p>
                <pre className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-[10px] text-emerald-400 font-mono overflow-x-auto leading-relaxed max-h-[180px]">
                  {fixedIncomeSql}
                </pre>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB 3: PLAYGROUND / REST TESTING --- */}
      {activeSubTab === 'playground' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Insert Playroom */}
            <div className="bg-[#0c0c0e] border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  Inserir Dados Manuais (POST)
                </h3>
                <span className="bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400 px-2.5 py-0.5 rounded-md font-mono">
                  JSON Representação
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono text-neutral-400 block">
                  Conteúdo do Registro em JSON
                </label>
                <textarea
                  rows={5}
                  value={newRecordJson}
                  onChange={(e) => setNewRecordJson(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 focus:border-emerald-500 rounded-xl p-3.5 text-xs font-mono text-neutral-200 focus:outline-hidden transition resize-y"
                />
              </div>

              <button
                onClick={handleInsertPlayground}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 disabled:bg-neutral-900 text-white disabled:text-neutral-500 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                Executar Inserção
              </button>
            </div>

            {/* Delete Playroom */}
            <div className="bg-[#0c0c0e] border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2 mb-3">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  Deletar Registro Manual (DELETE)
                </h3>

                <div className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-neutral-400 block">
                      Valor da Chave Primária ({config.idFieldName})
                    </label>
                    <input
                      type="text"
                      value={deleteId}
                      onChange={(e) => setDeleteId(e.target.value)}
                      placeholder="Ex: t1 ou inv-89asd"
                      className="w-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-200 focus:outline-hidden transition"
                    />
                    <span className="text-[10px] text-neutral-500 block">
                      Query Rest correspondente: <code className="text-red-400 font-mono text-[9px]">?{config.idFieldName}=eq.{deleteId || "VALOR"}</code>
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeletePlayground()}
                disabled={loading || !deleteId}
                className="w-full flex items-center justify-center gap-2 bg-red-900/10 hover:bg-red-900/20 border border-red-500/20 hover:border-red-500/30 disabled:bg-neutral-950 text-red-400 disabled:text-neutral-500 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Executar Exclusão
              </button>
            </div>

          </div>

          {/* Table list and Console Response in Playground */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sandbox Data List */}
            <div className="lg:col-span-2 bg-[#0c0c0e] border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center justify-between">
                <span>Últimos registros baixados ({records.length})</span>
                <button 
                  onClick={handleFetchPlayground}
                  className="p-1 text-neutral-400 hover:text-white transition rounded-md hover:bg-neutral-800"
                  title="Recarregar"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </h3>

              {records.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-neutral-800 rounded-xl space-y-2">
                  <Database className="w-8 h-8 text-neutral-600 mx-auto" />
                  <p className="text-xs text-neutral-400 font-medium">Nenhum dado retornado do Supabase ainda.</p>
                  <p className="text-[10px] text-neutral-500">Clique no botão "Recarregar" acima para puxar os dados de teste da sua tabela de transações.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800 text-neutral-400 font-mono uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-2 font-bold">Chave ID ({config.idFieldName})</th>
                        <th className="py-3 px-2 font-bold">Campos / Dados</th>
                        <th className="py-3 px-2 font-bold text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((rec, i) => {
                        const rowId = rec[config.idFieldName] || rec.id || rec.ID || `Linha-${i}`;
                        const rowSummary = Object.entries(rec)
                          .filter(([k]) => k !== config.idFieldName)
                          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                          .join(' | ');

                        return (
                          <tr key={i} className="border-b border-neutral-800 hover:bg-neutral-900/40 transition">
                            <td className="py-3 px-2 font-mono text-emerald-400 font-semibold max-w-[120px] truncate">
                              {String(rowId)}
                            </td>
                            <td className="py-3 px-2 text-neutral-300 max-w-[280px] truncate font-mono text-[11px]" title={rowSummary}>
                              {rowSummary}
                            </td>
                            <td className="py-3 px-2 text-right">
                              <button
                                onClick={() => handleDeletePlayground(rowId)}
                                className="p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition cursor-pointer"
                                title="Deletar este registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Live response JSON Console */}
            <div className="bg-[#0c0c0e] border border-neutral-800 rounded-2xl p-6 space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2 mb-3">
                  <Code className="w-4 h-4 text-emerald-400" />
                  Terminal de Respostas
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Inspecione o JSON bruto retornado pelas chamadas da REST API do Supabase.
                </p>
              </div>

              <div className="flex-1 min-h-[220px] max-h-[350px] bg-neutral-950 rounded-xl border border-neutral-800 p-4 font-mono text-[10px] text-emerald-400 overflow-y-auto mt-3">
                {lastJsonResponse ? (
                  <pre className="whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(lastJsonResponse, null, 2)}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-neutral-600 text-center">
                    <span>Console aguardando requisições...</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
