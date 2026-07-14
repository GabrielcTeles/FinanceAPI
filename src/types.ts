/**
 * Types definition for Finanças Inteligentes
 */

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'receita' | 'despesa';
  category: string;
  subcategory: string;
  description: string;
  currency: 'BRL' | 'USD' | 'EUR';
  tags: string[];
  imageUrl?: string;
  bankAccount?: string; // e.g., "Itaú", "Nubank", etc.
  confidence?: number;  // OCR AI categorization confidence %
  items?: string[];     // specific items scanned from receipt
  installmentsCount?: number;
  installmentNumber?: number;
  installmentGroupId?: string;
  cnpj?: string;
  time?: string;
  paymentMethod?: string;
}

export interface Investment {
  id: string;
  ticker: string;
  name: string;
  type: 'Ações' | 'ETFs' | 'Cripto';
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  sector: string;
  currency: 'BRL' | 'USD' | 'EUR';
}

export interface FixedIncome {
  id: string;
  type: 'CDB' | 'LCI' | 'LCA' | 'Tesouro Direto' | 'Poupança' | 'Letras de Crédito';
  value: number;
  rate: number; // e.g., 12.5 (prefixado a.a.) or 110 (% do CDI)
  applicationDate: string;
  maturityDate: string;
  indexation: 'CDI' | 'SELIC' | 'IPCA' | 'Prefixado';
  liquidity: 'Vencimento' | 'Imediata';
  actualBalance?: number;
}

export interface Budget {
  categoryId: string;
  limit: number;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: 'Corrente' | 'Poupança' | 'Investimentos';
  balance: number;
  status: 'connected' | 'syncing' | 'failed';
  lastSync?: string;
}

export interface MarketQuote {
  ticker: string;
  price: number;
  change24h: number;
  name: string;
  sector: string;
}

export interface AppData {
  profile: {
    name: string;
    email: string;
    currency: 'BRL' | 'USD' | 'EUR';
    theme: 'light' | 'dark';
  };
  transactions: Transaction[];
  investments: Investment[];
  fixedIncome: FixedIncome[];
  budgets: Record<string, number>;
  bankAccounts: BankAccount[];
}
