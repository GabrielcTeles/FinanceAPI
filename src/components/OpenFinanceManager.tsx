import React, { useState } from 'react';
import { 
  Lock, 
  RefreshCw, 
  Plus, 
  Check, 
  HelpCircle, 
  Link2, 
  ShieldCheck, 
  CreditCard,
  X,
  ChevronRight,
  Info
} from 'lucide-react';
import { AppData, BankAccount } from '../types';
import { formatCurrency } from '../utils';

interface OpenFinanceManagerProps {
  data: AppData;
  onUpdateData: (updater: (prev: AppData) => AppData) => void;
  onSyncBank: (bankName: string) => Promise<any>;
  isMobile?: boolean;
}

const SUPPORTED_BANKS = [
  { name: "Nubank", logo: "🟣", color: "bg-purple-600", text: "text-purple-600" },
  { name: "Itaú Unibanco", logo: "🏦", color: "bg-orange-500", text: "text-orange-500" },
  { name: "Banco do Brasil", logo: "🟡", color: "bg-yellow-400", text: "text-yellow-600" },
  { name: "Bradesco", logo: "🔴", color: "bg-red-600", text: "text-red-600" },
  { name: "Santander", logo: "🟥", color: "bg-red-500", text: "text-red-500" },
  { name: "Inter", logo: "🟠", color: "bg-orange-600", text: "text-orange-600" },
  { name: "BTG Pactual", logo: "🔵", color: "bg-blue-800", text: "text-blue-800" },
  { name: "XP Investimentos", logo: "🪙", color: "bg-neutral-800", text: "text-neutral-300" },
  { name: "Caixa Econômica", logo: "🔷", color: "bg-blue-600", text: "text-blue-600" }
];

export default function OpenFinanceManager({ data, onUpdateData, onSyncBank, isMobile }: OpenFinanceManagerProps) {
  const [syncingBank, setSyncingBank] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  // OpenFinance integration flow (standard simulation portal)
  const [showBacenModal, setShowBacenModal] = useState(false);
  const [selectedBacenBank, setSelectedBacenBank] = useState<any>(SUPPORTED_BANKS[0]);
  const [bacenStep, setBacenStep] = useState<'select' | 'credentials' | 'authorize' | 'success'>('select');
  const [bacenUser, setBacenUser] = useState('');
  const [bacenPass, setBacenPass] = useState('');

  const handleSync = async (bankName: string) => {
    setSyncingBank(bankName);
    try {
      const result = await onSyncBank(bankName);
      if (result.success && result.addedCount > 0) {
        const txNames = result.addedTransactions.map((t: any) => `${t.description} (${formatCurrency(t.amount, 'BRL')})`).join(', ');
        setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Sincronizado ${bankName}: Adicionado ${result.addedCount} despesas (${txNames})`, ...prev]);
      } else {
        setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Sincronizado ${bankName}: Nenhum novo lançamento pendente.`, ...prev]);
      }
    } catch (e) {
      console.error(e);
      setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Falha ao sincronizar ${bankName}. Tente novamente.`, ...prev]);
    } finally {
      setSyncingBank(null);
    }
  };

  const handleStartBacenConnect = () => {
    setSelectedBacenBank(SUPPORTED_BANKS[0]);
    setBacenUser('');
    setBacenPass('');
    setBacenStep('select');
    setShowBacenModal(true);
  };

  const handleCompleteBacenConnection = () => {
    const exists = data.bankAccounts.some(acc => acc.bankName === selectedBacenBank.name);
    if (exists) {
      setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] O banco ${selectedBacenBank.name} já está conectado.`, ...prev]);
      setShowBacenModal(false);
      return;
    }

    const newAccount: BankAccount = {
      id: 'acc-' + Math.random().toString(36).substr(2, 9),
      bankName: selectedBacenBank.name,
      accountType: 'Corrente',
      balance: Math.floor(Math.random() * 4000) + 1000,
      status: 'connected',
      lastSync: new Date().toISOString()
    };

    onUpdateData(prev => ({
      ...prev,
      bankAccounts: [...prev.bankAccounts, newAccount]
    }));

    setBacenStep('success');
    setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Banco ${selectedBacenBank.name} integrado com sucesso via OpenFinance.`, ...prev]);
  };

  const handleDisconnect = (id: string, bankName: string) => {
    onUpdateData(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter(acc => acc.id !== id)
    }));
    setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Conexão desfeita com ${bankName}.`, ...prev]);
  };

  return (
    <div id="openfinance-manager" className="space-y-8 animate-fade-in text-neutral-200">
      {/* Top security panel */}
      <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/80 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">
              <ShieldCheck className="w-3 h-3" /> Sandbox Ativo
            </span>
            <span className="flex items-center gap-1 bg-neutral-800 text-neutral-300 border border-neutral-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Open Finance
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight font-display">Conectar Conta Bancária</h2>
          <p className="text-neutral-400 text-xs leading-relaxed max-w-xl">
            Sincronize transações de suas contas bancárias através de conexões simuladas do **Open Finance**. Nosso sistema de sandbox simula com fidelidade fluxos reais de portabilidade de extratos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleStartBacenConnect}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Conectar Nova Conta
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Connected banks and Sync triggers */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-neutral-800/60 pb-2">Suas Contas Integradas</h3>

            {data.bankAccounts.length === 0 ? (
              <div className="text-center py-10">
                <Link2 className="w-12 h-12 text-neutral-800 mx-auto mb-3 animate-pulse" />
                <p className="text-neutral-500 text-sm">Nenhuma conta bancária sincronizada.</p>
                <div className="mt-4 flex justify-center">
                  <button 
                    onClick={handleStartBacenConnect}
                    className="text-xs bg-emerald-500 text-black font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-600 cursor-pointer shadow-md"
                  >
                    Integrar Conta Open Finance
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {data.bankAccounts.map(acc => {
                  const bMeta = SUPPORTED_BANKS.find(b => acc.bankName.includes(b.name)) || { logo: "🏦", color: "bg-neutral-800", text: "text-neutral-450" };
                  return (
                    <div 
                      key={acc.id} 
                      className="p-4 border border-neutral-800 hover:border-neutral-700 bg-neutral-950/20 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${bMeta.color} text-white`}>
                          {bMeta.logo}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{acc.bankName}</h4>
                          <span className="text-[10px] text-neutral-400 font-medium">Conta {acc.accountType} • Ativa</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 border-neutral-800 pt-3 sm:pt-0">
                        <div className="text-left sm:text-right font-mono">
                          <span className="text-[10px] text-neutral-450 uppercase tracking-wider block">Saldo Consolidado</span>
                          <strong className="text-white text-base font-bold">{formatCurrency(acc.balance, 'BRL')}</strong>
                          <span className="text-[9px] text-neutral-500 block font-sans">
                            Sinc: {acc.lastSync ? new Date(acc.lastSync).toLocaleTimeString() : '---'}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSync(acc.bankName)}
                            disabled={syncingBank !== null}
                            className="p-2 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingBank === acc.bankName ? 'animate-spin text-emerald-400' : ''}`} />
                            Sync
                          </button>
                          <button
                            onClick={() => handleDisconnect(acc.id, acc.bankName)}
                            className="text-xs text-rose-450 hover:text-rose-400 font-bold px-2 py-1 cursor-pointer"
                          >
                            Desconectar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Logs and porting advice */}
        <div className="space-y-6">
          <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-neutral-800/60 pb-2 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              Histórico de Sincronizações
            </h3>

            {syncLogs.length === 0 ? (
              <p className="text-neutral-500 text-xs py-8 text-center leading-relaxed">Nenhuma sincronização recente efetuada. Conecte sua conta via Open Finance para simular e testar a automação de faturas e saldos.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {syncLogs.map((log, idx) => (
                  <div key={idx} className="p-2.5 bg-neutral-950/60 border border-neutral-800 rounded-lg text-[11px] font-mono text-neutral-400 leading-normal animate-fade-in">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/80 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Como Funciona</h4>
            <div className="space-y-2.5 text-xs text-neutral-400 leading-normal">
              <p>O ecossistema do Open Finance brasileiro permite a transferência rápida e simplificada de dados cadastrais e financeiros entre instituições sob anuência e comando do próprio usuário.</p>
              
              <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 text-[11px] space-y-2">
                <div className="flex items-center gap-1 text-white font-medium">
                  <Info className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ambiente de Demonstração</span>
                </div>
                <p className="text-neutral-500 leading-normal">
                  Todas as credenciais informadas nas telas de login são virtuais. Sinta-se à vontade para simular conexões comNubank, Itaú, Bradesco ou qualquer banco parceiro!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Traditional Basic Bacen Connection Modal */}
      {showBacenModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#121214] w-full max-w-md rounded-2xl border border-neutral-800 overflow-hidden shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="bg-neutral-950 text-white p-5 flex justify-between items-center border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 font-mono">Open Finance Hub</span>
              </div>
              <button 
                onClick={() => setShowBacenModal(false)}
                className="text-neutral-400 hover:text-white font-bold cursor-pointer bg-transparent border-0 outline-none text-lg p-1"
              >
                ×
              </button>
            </div>

            {/* Steps Container */}
            <div className="p-6 space-y-6">
              {bacenStep === 'select' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Selecione sua Instituição</h3>
                    <p className="text-neutral-450 text-xs mt-1 font-sans">Escolha o banco parceiro homologado para iniciar o consentimento.</p>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {SUPPORTED_BANKS.map(bank => (
                      <div 
                        key={bank.name}
                        onClick={() => setSelectedBacenBank(bank)}
                        className={`p-3 border rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
                          selectedBacenBank.name === bank.name 
                            ? 'border-emerald-500 bg-emerald-500/5' 
                            : 'border-neutral-800 bg-neutral-950/25 hover:border-neutral-750'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bank.color} text-white`}>
                          {bank.logo}
                        </div>
                        <span className="font-bold text-white text-xs">{bank.name}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setBacenStep('credentials')}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                  >
                    Prosseguir para Login Seguro
                  </button>
                </div>
              )}

              {bacenStep === 'credentials' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                    <span className="text-lg">{selectedBacenBank.logo}</span>
                    <h3 className="text-sm font-bold text-white">Acessar {selectedBacenBank.name}</h3>
                  </div>

                  <p className="text-neutral-400 text-xs">Simule o login seguro com suas credenciais bancárias padrão. Os dados não serão reais ou enviados para servidores externos.</p>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-bold">Identificação / Conta (Simulado)</label>
                      <input
                        type="text"
                        placeholder="Ex: CPF ou Conta Bancária"
                        value={bacenUser}
                        onChange={e => setBacenUser(e.target.value)}
                        className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-bold">Senha Eletrônica (Simulado)</label>
                      <input
                        type="password"
                        placeholder="••••••"
                        value={bacenPass}
                        onChange={e => setBacenPass(e.target.value)}
                        className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={() => setBacenStep('select')}
                      className="flex-1 py-2.5 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => setBacenStep('authorize')}
                      disabled={!bacenUser || !bacenPass}
                      className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black rounded-xl text-xs font-bold cursor-pointer shadow-md"
                    >
                      Conectar Conta
                    </button>
                  </div>
                </div>
              )}

              {bacenStep === 'authorize' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Autorizar Compartilhamento de Dados</h3>
                    <p className="text-neutral-400 text-xs mt-1">Ao consentir, você autoriza o Finanças Inteligentes a ler os seguintes dados do {selectedBacenBank.name} por 12 meses:</p>
                  </div>

                  <div className="p-3 bg-neutral-950 rounded-xl space-y-2 text-xs text-neutral-300 font-medium border border-neutral-800">
                    <p className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" /> Saldos diários de conta corrente.
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" /> Extrato completo de despesas do cartão.
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" /> Resumo consolidado de investimentos ativos.
                    </p>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={() => setBacenStep('credentials')}
                      className="flex-1 py-2.5 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleCompleteBacenConnection}
                      className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl text-xs font-bold cursor-pointer shadow-md"
                    >
                      Autorizar Consentimento
                    </button>
                  </div>
                </div>
              )}

              {bacenStep === 'success' && (
                <div className="text-center space-y-4 py-4 animate-fade-in">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Portabilidade Realizada!</h3>
                    <p className="text-neutral-450 text-xs mt-1">Suas contas do {selectedBacenBank.name} foram sincronizadas com sucesso via portais seguros do Open Finance.</p>
                  </div>
                  <button
                    onClick={() => setShowBacenModal(false)}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl text-xs font-bold cursor-pointer shadow-md"
                  >
                    Ir para meu Painel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
