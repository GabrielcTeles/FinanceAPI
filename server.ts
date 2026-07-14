import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;
const DB_PATH = process.env.VERCEL === "1" ? "/tmp/db.json" : path.join(process.cwd(), "db.json");

app.use(express.json({ limit: "50mb" }));

// Sanitizes the GEMINI_API_KEY environment variable
function getSanitizedApiKey(): string | undefined {
  const rawKey = process.env.GEMINI_API_KEY;
  if (!rawKey) return undefined;
  let cleaned = rawKey.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned || undefined;
}

// Lazy initialization of the Gemini Client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = getSanitizedApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não foi encontrada ou está vazia nas variáveis de ambiente.");
  }
  if (!aiInstance) {
    try {
      aiInstance = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      console.log("GoogleGenAI Client inicializado com sucesso.");
    } catch (error) {
      console.error("Falha ao instanciar o cliente GoogleGenAI:", error);
      throw error;
    }
  }
  return aiInstance;
}

// Seeding Default Mock Data if db.json doesn't exist
const initialData = {
  profile: {
    name: "Gabriel Telles",
    email: "gabrielctelless@outlook.com",
    currency: "BRL" as const,
    theme: "light" as const,
  },
  transactions: [
    {
      id: "t1",
      date: "2026-07-01",
      amount: 120.50,
      type: "despesa" as const,
      category: "Alimentação",
      subcategory: "Restaurante",
      description: "Jantar - Pizzaria Camelo",
      currency: "BRL" as const,
      tags: ["lazer", "fim-de-semana"],
    },
    {
      id: "t2",
      date: "2026-07-02",
      amount: 85.00,
      type: "despesa" as const,
      category: "Transporte",
      subcategory: "Uber",
      description: "Uber Ida/Volta Escritório",
      currency: "BRL" as const,
      tags: ["trabalho"],
    },
    {
      id: "t3",
      date: "2026-07-03",
      amount: 7200.00,
      type: "receita" as const,
      category: "Salário",
      subcategory: "CLT",
      description: "Salário Mensal TechCorp",
      currency: "BRL" as const,
      tags: ["renda-principal"],
    },
    {
      id: "t4",
      date: "2026-07-04",
      amount: 45.90,
      type: "despesa" as const,
      category: "Saúde",
      subcategory: "Farmácia",
      description: "Medicamentos - Droga Raia",
      currency: "BRL" as const,
      tags: ["essenciais"],
    },
    {
      id: "t5",
      date: "2026-07-05",
      amount: 320.00,
      type: "despesa" as const,
      category: "Utilities",
      subcategory: "Energia",
      description: "Conta de Luz - Enel",
      currency: "BRL" as const,
      tags: ["casa"],
    },
    {
      id: "t6",
      date: "2026-07-05",
      amount: 150.00,
      type: "despesa" as const,
      category: "Lazer",
      subcategory: "Cinema",
      description: "Cinema + Pipoca Shopping",
      currency: "BRL" as const,
      tags: ["entretenimento"],
    }
  ],
  investments: [
    {
      id: "i1",
      ticker: "VALE3",
      name: "Vale S.A. ON",
      type: "Ações" as const,
      quantity: 50,
      purchasePrice: 62.40,
      purchaseDate: "2026-02-15",
      sector: "Materiais Básicos",
      currency: "BRL" as const,
    },
    {
      id: "i2",
      ticker: "PETR4",
      name: "Petróleo Brasileiro S.A. PN",
      type: "Ações" as const,
      quantity: 100,
      purchasePrice: 35.80,
      purchaseDate: "2026-03-10",
      sector: "Petróleo & Gás",
      currency: "BRL" as const,
    },
    {
      id: "i3",
      ticker: "AAPL",
      name: "Apple Inc.",
      type: "Ações" as const,
      quantity: 5,
      purchasePrice: 172.50,
      purchaseDate: "2026-01-20",
      sector: "Tecnologia",
      currency: "USD" as const,
    },
    {
      id: "i4",
      ticker: "BTC",
      name: "Bitcoin",
      type: "Cripto" as const,
      quantity: 0.045,
      purchasePrice: 310000.00,
      purchaseDate: "2026-04-05",
      sector: "Criptomoedas",
      currency: "BRL" as const,
    }
  ],
  fixedIncome: [
    {
      id: "fi1",
      type: "CDB" as const,
      value: 15000.00,
      rate: 110.0, // 110% do CDI
      applicationDate: "2026-01-02",
      maturityDate: "2028-01-02",
      indexation: "CDI" as const,
      liquidity: "Vencimento" as const,
    },
    {
      id: "fi2",
      type: "Tesouro Direto" as const,
      value: 8000.00,
      rate: 12.5, // 12.5% prefixado a.a.
      applicationDate: "2026-03-01",
      maturityDate: "2029-03-01",
      indexation: "Prefixado" as const,
      liquidity: "Vencimento" as const,
    },
    {
      id: "fi3",
      type: "LCI" as const,
      value: 5000.00,
      rate: 92.0, // 92% do CDI (Isento IR)
      applicationDate: "2026-04-10",
      maturityDate: "2027-04-10",
      indexation: "CDI" as const,
      liquidity: "Vencimento" as const,
    }
  ],
  budgets: {
    "Alimentação": 1200,
    "Transporte": 400,
    "Saúde": 300,
    "Educação": 500,
    "Lazer": 600,
    "Utilities": 500,
    "Outros": 400,
  },
  bankAccounts: [
    {
      id: "b1",
      bankName: "Itaú Unibanco",
      accountType: "Corrente" as const,
      balance: 1450.80,
      status: "connected" as const,
      lastSync: "2026-07-06T10:00:00Z"
    },
    {
      id: "b2",
      bankName: "Nubank",
      accountType: "Corrente" as const,
      balance: 3204.15,
      status: "connected" as const,
      lastSync: "2026-07-06T11:00:00Z"
    },
    {
      id: "b3",
      bankName: "Banco do Brasil",
      accountType: "Poupança" as const,
      balance: 7500.00,
      status: "connected" as const,
      lastSync: "2026-07-06T09:30:00Z"
    }
  ]
};

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const defaultDb = {
        users: {
          "gabrielctelless@outlook.com": {
            name: "Gabriel Telles",
            password: "admin",
            data: initialData
          }
        }
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), "utf8");
      return defaultDb;
    }
    const data = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(data);
    if (!parsed || !parsed.users) {
      // Migrate old format to multi-user format
      const migrated = {
        users: {
          "gabrielctelless@outlook.com": {
            name: parsed?.profile?.name || "Gabriel Telles",
            password: "admin",
            data: parsed || initialData
          }
        }
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(migrated, null, 2), "utf8");
      return migrated;
    }
    return parsed;
  } catch (error) {
    console.error("Error reading database:", error);
    return {
      users: {
        "gabrielctelless@outlook.com": {
          name: "Gabriel Telles",
          password: "admin",
          data: initialData
        }
      }
    };
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing database:", error);
  }
}

function getUserEmail(req: express.Request): string {
  const rawEmail = req.headers["x-user-email"] || req.query.email || req.body.email || "gabrielctelless@outlook.com";
  return String(rawEmail).toLowerCase().trim();
}

function readUserDb(email: string) {
  const db = readDb();
  const user = db.users[email];
  if (user) {
    return user.data;
  }
  // Safe seed if user requested but didn't exist in master DB (e.g. registered via local fallback first)
  const userData = {
    ...initialData,
    profile: {
      ...initialData.profile,
      email: email,
      name: email.split("@")[0].replace(/[._-]/g, " ")
    }
  };
  db.users[email] = {
    name: userData.profile.name,
    password: "admin", // default fallback
    data: userData
  };
  writeDb(db);
  return userData;
}

function writeUserDb(email: string, userData: any) {
  const db = readDb();
  if (!db.users[email]) {
    db.users[email] = {
      name: userData.profile?.name || email.split("@")[0],
      password: "admin",
      data: userData
    };
  } else {
    db.users[email].data = userData;
  }
  writeDb(db);
}

// Simulated real-time quotes with slight fluctuations (random walk)
const defaultBaseQuotes = [
  // Ações Brasileiras (B3)
  { ticker: "VALE3", price: 57.80, change24h: -0.8, name: "Vale S.A. ON", sector: "Materiais Básicos" },
  { ticker: "PETR4", price: 38.60, change24h: 1.2, name: "Petróleo Brasileiro S.A. PN", sector: "Petróleo & Gás" },
  { ticker: "WEGE3", price: 51.50, change24h: 0.6, name: "WEG S.A. ON", sector: "Bens Industriais" },
  { ticker: "ITUB4", price: 33.20, change24h: 0.4, name: "Itaú Unibanco S.A. PN", sector: "Financeiro" },
  { ticker: "BBDC4", price: 13.50, change24h: -0.2, name: "Banco Bradesco S.A. PN", sector: "Financeiro" },
  { ticker: "BBAS3", price: 27.40, change24h: 0.9, name: "Banco do Brasil S.A. ON", sector: "Financeiro" },
  { ticker: "ITSA4", price: 9.80, change24h: 0.1, name: "Itaúsa S.A. PN", sector: "Financeiro" },
  { ticker: "ABEV3", price: 11.90, change24h: -0.5, name: "Ambev S.A. ON", sector: "Consumo Não Cíclico" },
  { ticker: "MGLU3", price: 12.40, change24h: -2.1, name: "Magazine Luiza S.A. ON", sector: "Consumo Cíclico" },
  { ticker: "BHIA3", price: 6.20, change24h: -1.8, name: "Casas Bahia S.A. ON", sector: "Consumo Cíclico" },
  { ticker: "LREN3", price: 16.30, change24h: 0.3, name: "Lojas Renner S.A. ON", sector: "Consumo Cíclico" },
  { ticker: "ELET3", price: 38.50, change24h: 0.7, name: "Eletrobras S.A. ON", sector: "Utilidade Pública" },
  { ticker: "GGBR4", price: 18.20, change24h: -0.3, name: "Gerdau S.A. PN", sector: "Materiais Básicos" },
  { ticker: "USIM5", price: 6.80, change24h: -0.9, name: "Usiminas S.A. PNA", sector: "Materiais Básicos" },
  { ticker: "CSNA3", price: 11.20, change24h: 1.1, name: "Siderúrgica Nacional S.A. ON", sector: "Materiais Básicos" },
  { ticker: "PRIO3", price: 44.50, change24h: 2.3, name: "PetroRio S.A. ON", sector: "Petróleo & Gás" },
  { ticker: "RENT3", price: 42.10, change24h: -0.4, name: "Localiza S.A. ON", sector: "Consumo Cíclico" },
  { ticker: "EQTL3", price: 31.80, change24h: 0.2, name: "Equatorial S.A. ON", sector: "Utilidade Pública" },
  { ticker: "RADL3", price: 25.45, change24h: 0.5, name: "Raia Drogasil S.A. ON", sector: "Saúde" },
  { ticker: "CPLE6", price: 9.40, change24h: 0.3, name: "Copel S.A. PNB", sector: "Utilidade Pública" },
  { ticker: "SANB11", price: 28.10, change24h: -0.1, name: "Banco Santander Brasil Unit", sector: "Financeiro" },
  { ticker: "BBSE3", price: 33.40, change24h: 0.8, name: "BB Seguridade S.A. ON", sector: "Financeiro" },
  { ticker: "CXSE3", price: 14.80, change24h: 1.2, name: "Caixa Seguridade S.A. ON", sector: "Financeiro" },
  { ticker: "TAEE11", price: 34.20, change24h: -0.2, name: "Taesa S.A. Unit", sector: "Utilidade Pública" },
  { ticker: "TRPL4", price: 24.60, change24h: 0.1, name: "ISA CTEEP S.A. PN", sector: "Utilidade Pública" },
  { ticker: "EGIE3", price: 41.30, change24h: 0.4, name: "Engie Brasil S.A. ON", sector: "Utilidade Pública" },
  { ticker: "EMBR3", price: 39.50, change24h: 3.1, name: "Embraer S.A. ON", sector: "Bens Industriais" },
  { ticker: "COGN3", price: 1.95, change24h: -1.2, name: "Cogna Educação S.A. ON", sector: "Consumo Cíclico" },
  { ticker: "AZUL4", price: 9.20, change24h: -1.5, name: "Azul S.A. PN", sector: "Consumo Cíclico" },
  { ticker: "B3SA3", price: 10.15, change24h: -0.3, name: "B3 S.A. ON", sector: "Financeiro" },
  { ticker: "KLBN11", price: 20.40, change24h: 0.2, name: "Klabin S.A. Unit", sector: "Materiais Básicos" },
  { ticker: "SUZB3", price: 49.80, change24h: -0.6, name: "Suzano S.A. ON", sector: "Materiais Básicos" },
  { ticker: "HYPE3", price: 28.30, change24h: -0.4, name: "Hypera S.A. ON", sector: "Saúde" },
  { ticker: "NTCO3", price: 14.20, change24h: 0.5, name: "Natura &Co ON", sector: "Consumo Não Cíclico" },
  { ticker: "JBSS3", price: 31.50, change24h: 1.4, name: "JBS S.A. ON", sector: "Consumo Não Cíclico" },
  { ticker: "BRFS3", price: 22.10, change24h: 1.1, name: "BRF S.A. ON", sector: "Consumo Não Cíclico" },
  { ticker: "CRFB3", price: 10.40, change24h: -0.2, name: "Carrefour Brasil ON", sector: "Consumo Não Cíclico" },
  { ticker: "ASSAI3", price: 11.15, change24h: 0.2, name: "Assaí S.A. ON", sector: "Consumo Não Cíclico" },
  { ticker: "VIVT3", price: 51.20, change24h: 0.3, name: "Telefônica Brasil S.A. ON", sector: "Utilidade Pública" },
  { ticker: "TIMS3", price: 16.80, change24h: 0.6, name: "TIM S.A. ON", sector: "Utilidade Pública" },
  { ticker: "FLRY3", price: 15.30, change24h: -0.1, name: "Fleury S.A. ON", sector: "Saúde" },
  { ticker: "SBSP3", price: 82.50, change24h: 1.4, name: "Sabesp S.A. ON", sector: "Utilidade Pública" },

  // ETFs (B3)
  { ticker: "BOVA11", price: 120.40, change24h: 0.4, name: "iShares Ibovespa ETF", sector: "ETFs" },
  { ticker: "SMAL11", price: 98.50, change24h: -0.3, name: "iShares Small Cap ETF", sector: "ETFs" },
  { ticker: "IVVB11", price: 295.20, change24h: 1.1, name: "iShares S&P 500 BRL ETF", sector: "ETFs" },
  { ticker: "HASH11", price: 45.30, change24h: 2.1, name: "Hashdex Nasdaq Crypto ETF", sector: "ETFs" },

  // Ações Internacionais (US)
  { ticker: "AAPL", price: 220.50, change24h: 1.5, name: "Apple Inc.", sector: "Tecnologia" },
  { ticker: "MSFT", price: 445.60, change24h: 0.8, name: "Microsoft Corporation", sector: "Tecnologia" },
  { ticker: "TSLA", price: 198.90, change24h: -1.4, name: "Tesla Inc.", sector: "Automotivo" },
  { ticker: "GOOGL", price: 175.40, change24h: 0.9, name: "Alphabet Inc.", sector: "Tecnologia" },
  { ticker: "AMZN", price: 189.20, change24h: 1.2, name: "Amazon.com Inc.", sector: "Tecnologia" },
  { ticker: "NVDA", price: 125.80, change24h: 2.8, name: "NVIDIA Corporation", sector: "Tecnologia" },
  { ticker: "META", price: 498.30, change24h: 0.4, name: "Meta Platforms Inc.", sector: "Tecnologia" },
  { ticker: "NFLX", price: 650.40, change24h: 1.0, name: "Netflix Inc.", sector: "Tecnologia" },
  { ticker: "JPM", price: 195.50, change24h: -0.2, name: "JPMorgan Chase & Co.", sector: "Financeiro" },
  { ticker: "V", price: 272.10, change24h: 0.3, name: "Visa Inc.", sector: "Financeiro" },
  { ticker: "KO", price: 62.40, change24h: -0.1, name: "The Coca-Cola Company", sector: "Consumo Não Cíclico" },
  { ticker: "DIS", price: 101.50, change24h: -0.5, name: "The Walt Disney Company", sector: "Consumo Cíclico" },

  // Criptomoedas
  { ticker: "BTC", price: 385000.00, change24h: 2.3, name: "Bitcoin", sector: "Criptomoedas" },
  { ticker: "ETH", price: 19200.00, change24h: 1.7, name: "Ethereum", sector: "Criptomoedas" },
  { ticker: "SOL", price: 800.00, change24h: 4.5, name: "Solana", sector: "Criptomoedas" },
  { ticker: "ADA", price: 2.10, change24h: -0.8, name: "Cardano", sector: "Criptomoedas" },
  { ticker: "XRP", price: 2.65, change24h: 1.1, name: "Ripple", sector: "Criptomoedas" },
  { ticker: "DOT", price: 32.00, change24h: -1.2, name: "Polkadot", sector: "Criptomoedas" },
  { ticker: "DOGE", price: 0.66, change24h: 5.4, name: "Dogecoin", sector: "Criptomoedas" },
];

// Helper to keep simulated prices fluctuating in server memory
const livePricesMap = new Map<string, { price: number; change24h: number }>();
let lastFetchTime = 0;
const CACHE_TTL = 3 * 60 * 1000; // Cache for 3 minutes

function toYahooSymbol(ticker: string): string {
  const t = ticker.toUpperCase().trim();
  if (t.endsWith(".SA") || t.includes("-") || t.includes("=")) return t;
  if (t === "BTC") return "BTC-USD";
  if (t === "ETH") return "ETH-USD";
  if (t === "SOL") return "SOL-USD";
  if (t === "ADA") return "ADA-USD";
  if (t === "XRP") return "XRP-USD";
  if (t === "DOT") return "DOT-USD";
  if (t === "DOGE") return "DOGE-USD";
  
  // US Stocks
  const usStocks = ["AAPL", "MSFT", "TSLA", "GOOGL", "AMZN", "NVDA", "META", "NFLX", "JPM", "V", "KO", "DIS"];
  if (usStocks.includes(t)) {
    return t;
  }
  
  if (/\d+$/.test(t)) {
    return t + ".SA";
  }
  return t;
}

async function fetchLiveQuotes() {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_TTL && livePricesMap.size > 0) {
    return;
  }
  
  try {
    const db = readDb();
    const userInvestments = db.investments || [];
    
    // Collect tickers to fetch: user custom ones plus top popular assets
    const tickersSet = new Set<string>();
    
    // 1. All user held tickers
    userInvestments.forEach((inv: any) => {
      if (inv.ticker) {
        tickersSet.add(inv.ticker.toUpperCase().trim());
      }
    });
    
    // 2. Top popular tickers for default market list
    const popularTickers = ["VALE3", "PETR4", "WEGE3", "ITUB4", "BBAS3", "B3SA3", "BOVA11", "BTC", "ETH", "AAPL", "MSFT", "TSLA"];
    popularTickers.forEach(t => tickersSet.add(t));
    
    const tickersList = Array.from(tickersSet);
    
    // First, fetch the USD/BRL exchange rate
    let usdRate = 5.10;
    try {
      const usdRes = await fetch("https://query2.finance.yahoo.com/v8/finance/chart/USDBRL=X?interval=1d&range=1d", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      if (usdRes.ok) {
        const usdJson: any = await usdRes.json();
        const rate = usdJson?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (rate) usdRate = rate;
      }
    } catch (e) {
      console.error("Failed to fetch USD/BRL rate, using fallback 5.10", e);
    }
    
    // Fetch in parallel with 2s timeout per request
    await Promise.all(
      tickersList.map(async (ticker) => {
        const yahooSymbol = toYahooSymbol(ticker);
        const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          
          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const json: any = await response.json();
            const meta = json?.chart?.result?.[0]?.meta;
            if (meta) {
              let price = meta.regularMarketPrice;
              const prevClose = meta.chartPreviousClose;
              
              if (price !== undefined && price !== null) {
                // Convert crypto fetched in USD to BRL
                if (meta.symbol.endsWith("-USD")) {
                  if (ticker === "BTC" || ticker === "ETH" || ticker === "SOL" || ticker === "ADA" || ticker === "XRP" || ticker === "DOT" || ticker === "DOGE") {
                    price = price * usdRate;
                  }
                }
                
                let change24h = meta.regularMarketChangePercent;
                if (change24h === undefined || change24h === null) {
                  change24h = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
                }
                
                livePricesMap.set(ticker, {
                  price: Number(price.toFixed(2)),
                  change24h: Number(change24h.toFixed(2))
                });
              }
            }
          }
        } catch (err: any) {
          console.error(`Error fetching ticker ${ticker} (${yahooSymbol}):`, err.message || err);
        }
      })
    );
    
    lastFetchTime = now;
    console.log("Successfully fetched live quotes from query2.finance.yahoo.com.");
  } catch (error) {
    console.error("Error fetching live quotes:", error);
  }
}

app.get(["/api/market/quotes", "/market/quotes"], async (req, res) => {
  if (livePricesMap.size === 0) {
    await fetchLiveQuotes();
  } else {
    fetchLiveQuotes().catch(err => console.error("Async quote update failed:", err));
  }

  const db = readDb();
  const userInvestments = db.investments || [];

  // Clone base list and merge user custom assets dynamically
  const mergedQuotes = [...defaultBaseQuotes];

  userInvestments.forEach((inv: any) => {
    const tickerUpper = inv.ticker.toUpperCase().trim();
    if (!mergedQuotes.some(q => q.ticker === tickerUpper)) {
      mergedQuotes.push({
        ticker: tickerUpper,
        price: inv.purchasePrice || 50.0,
        change24h: 0.0,
        name: inv.name || tickerUpper,
        sector: inv.sector || "Outros"
      });
    }
  });

  const currentQuotes = mergedQuotes.map(q => {
    const key = q.ticker;
    const currentData = livePricesMap.get(key);

    if (currentData) {
      return {
        ...q,
        price: currentData.price,
        change24h: currentData.change24h
      };
    }

    // Fallback: apply random walk on base price
    const fluctuation = 1 + (Math.random() * 0.006 - 0.003);
    const newPrice = Number((q.price * fluctuation).toFixed(2));
    const randomChange = Number((q.change24h + (Math.random() * 0.2 - 0.1)).toFixed(2));

    return {
      ...q,
      price: newPrice,
      change24h: randomChange
    };
  });

  res.json(currentQuotes);
});

// Cache and live update logic for Banco Central do Brasil rates
let cachedRates = {
  CDI: 14.15,
  SELIC: 14.25,
  IPCA: 4.64,
  Poupança: 6.17,
  lastUpdated: 0
};

const RATES_CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

async function updateRatesFromBCB() {
  const now = Date.now();
  if (now - cachedRates.lastUpdated < RATES_CACHE_TTL) {
    return cachedRates;
  }

  try {
    // 1. Fetch Selic Meta (series 432) from Banco Central do Brasil SGS API
    // Since 432 is a daily series, we MUST specify a date window to avoid the 10-year limit error.
    // Let's query from 30 days ago to today.
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const day = String(thirtyDaysAgo.getDate()).padStart(2, '0');
    const month = String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0');
    const year = thirtyDaysAgo.getFullYear();
    const dateStr = `${day}/${month}/${year}`;

    const selicUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados?formato=json&dataInicial=${dateStr}`;
    const selicRes = await fetch(selicUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
    if (selicRes.ok) {
      const data: any = await selicRes.json();
      if (Array.isArray(data) && data.length > 0) {
        const lastItem = data[data.length - 1];
        const val = parseFloat(lastItem.valor);
        if (!isNaN(val) && val > 0) {
          cachedRates.SELIC = val;
          cachedRates.CDI = Number((val - 0.10).toFixed(2));
          // Calculate Poupança based on Selic rule
          if (val > 8.5) {
            cachedRates.Poupança = 6.17;
          } else {
            cachedRates.Poupança = Number((val * 0.7).toFixed(2));
          }
        }
      }
    }

    // 2. Fetch IPCA accumulated in 12 months (series 13522)
    const ipcaUrl = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados?formato=json";
    const ipcaRes = await fetch(ipcaUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
    if (ipcaRes.ok) {
      const data: any = await ipcaRes.json();
      if (Array.isArray(data) && data.length > 0) {
        const lastItem = data[data.length - 1];
        const val = parseFloat(lastItem.valor);
        if (!isNaN(val) && val > 0) {
          cachedRates.IPCA = val;
        }
      }
    }

    cachedRates.lastUpdated = now;
    console.log("Rates updated successfully from Banco Central do Brasil:", cachedRates);
  } catch (error) {
    console.error("Error updating rates from Banco Central do Brasil:", error);
  }

  return cachedRates;
}

// --- ECONOMIC RATES & CACHING ---
// Returns economic reference rates for fixed income (SELIC, CDI, IPCA)
app.get(["/api/fixed-income/rates", "/fixed-income/rates"], async (req, res) => {
  const rates = await updateRatesFromBCB();
  res.json({
    CDI: rates.CDI,
    SELIC: rates.SELIC,
    IPCA: rates.IPCA,
    Poupança: rates.Poupança
  });
});

// --- SUPABASE DIRECT INTEGRATION HELPERS ---

function getSupabaseCredentials(req: express.Request) {
  const url = req.headers["x-supabase-url"] || req.query.supabase_url || req.body.supabase_url || "";
  const key = req.headers["x-supabase-key"] || req.query.supabase_key || req.body.supabase_key || "";
  
  const cleanUrl = String(url).trim();
  const cleanKey = String(key).trim();
  
  const isPlaceholderUrl = cleanUrl.includes("seu-projeto.supabase.co") || !cleanUrl;
  const isPlaceholderKey = cleanKey.includes("sua-anon-key-aqui") || !cleanKey;
  
  if (isPlaceholderUrl || isPlaceholderKey) {
    return null;
  }
  return { url: cleanUrl.replace(/\/$/, ""), key: cleanKey };
}

async function querySupabase(url: string, key: string, path: string, method: string = "GET", body?: any) {
  const targetUrl = `${url}/rest/v1/${path}`;
  const headers: Record<string, string> = {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json"
  };
  
  if (method === "POST") {
    headers["Prefer"] = "return=representation";
  }
  
  const options: RequestInit = {
    method,
    headers
  };
  
  if (body && (method === "POST" || method === "PATCH" || method === "PUT")) {
    options.body = JSON.stringify(body);
  }
  
  const res = await fetch(targetUrl, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase Error (${res.status}): ${text}`);
  }
  return res.json().catch(() => ({}));
}

// --- AUTHENTICATION API ENDPOINTS ---

// Register
app.post("/api/auth/register", async (req, res) => {
  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) {}
  }
  const { name, email, password, currency } = body;
  if (!email || !password || !name) {
    return res.status(400).json({ success: false, error: "Nome, e-mail e senha são obrigatórios." });
  }

  const cleanEmail = String(email).toLowerCase().trim();

  // Generate template AppData for this new user
  const initialUserData = {
    profile: {
      name,
      email: cleanEmail,
      currency: currency || "BRL",
      theme: "light",
    },
    transactions: [
      {
        id: "t-welcome",
        date: new Date().toISOString().split('T')[0],
        amount: 5000.0,
        type: "receita",
        category: "Salário",
        subcategory: "Mensal",
        description: "Saldo Inicial de Boas-Vindas",
        currency: currency || "BRL",
        tags: ["inicial"]
      }
    ],
    investments: [],
    fixedIncome: [],
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

  const sb = getSupabaseCredentials(req);
  if (sb) {
    try {
      // 1. Check if user already exists in user_accounts
      const existing = await querySupabase(sb.url, sb.key, `user_accounts?email=eq.${encodeURIComponent(cleanEmail)}`);
      if (existing && existing.length > 0) {
        return res.status(400).json({ success: false, error: "Este e-mail já está cadastrado no Supabase." });
      }

      // 2. Insert user into user_accounts
      await querySupabase(sb.url, sb.key, "user_accounts", "POST", {
        email: cleanEmail,
        name,
        password,
        currency: currency || "BRL"
      });

      // 3. Create profile document
      await querySupabase(sb.url, sb.key, "user_profiles", "POST", {
        email: cleanEmail,
        data: initialUserData
      });

      return res.json({
        success: true,
        user: { name, email: cleanEmail, currency: currency || "BRL" },
        data: initialUserData
      });
    } catch (err: any) {
      console.error("Supabase Register error:", err);
      return res.status(500).json({ success: false, error: `Erro no Supabase: ${err.message}. Certifique-se de que criou as tabelas 'user_accounts' e 'user_profiles' no seu painel SQL.` });
    }
  }

  // Fallback to local file-based database
  const db = readDb();
  if (db.users[cleanEmail]) {
    return res.status(400).json({ success: false, error: "Este e-mail já está cadastrado." });
  }

  db.users[cleanEmail] = {
    name,
    password,
    data: initialUserData
  };
  
  writeDb(db);

  res.json({ 
    success: true, 
    user: { name, email: cleanEmail, currency: currency || "BRL" }, 
    data: initialUserData 
  });
});

// Login
app.post("/api/auth/login", async (req, res) => {
  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) {}
  }
  const { email, password } = body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "E-mail e senha são obrigatórios." });
  }

  const cleanEmail = String(email).toLowerCase().trim();

  const sb = getSupabaseCredentials(req);
  if (sb) {
    try {
      const existing = await querySupabase(sb.url, sb.key, `user_accounts?email=eq.${encodeURIComponent(cleanEmail)}`);
      if (!existing || existing.length === 0) {
        return res.status(401).json({ success: false, error: "E-mail ou senha incorretos." });
      }
      const user = existing[0];
      if (user.password !== password) {
        return res.status(401).json({ success: false, error: "E-mail ou senha incorretos." });
      }

      // Fetch user profile
      const profileRes = await querySupabase(sb.url, sb.key, `user_profiles?email=eq.${encodeURIComponent(cleanEmail)}`);
      let userData = profileRes && profileRes.length > 0 ? profileRes[0].data : null;

      if (!userData) {
        // Create fallback profile
        userData = {
          profile: {
            name: user.name,
            email: cleanEmail,
            currency: user.currency || "BRL",
            theme: "light",
          },
          transactions: [],
          investments: [],
          fixedIncome: [],
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
        await querySupabase(sb.url, sb.key, "user_profiles", "POST", {
          email: cleanEmail,
          data: userData
        });
      }

      return res.json({
        success: true,
        user: { name: user.name, email: cleanEmail, currency: user.currency || "BRL" },
        data: userData
      });
    } catch (err: any) {
      console.error("Supabase Login error:", err);
      return res.status(500).json({ success: false, error: `Erro no login via Supabase: ${err.message}. Verifique suas credenciais e tabelas.` });
    }
  }

  // Fallback to local DB
  const db = readDb();
  const user = db.users[cleanEmail];

  if (!user || user.password !== password) {
    return res.status(401).json({ success: false, error: "E-mail ou senha incorretos." });
  }

  res.json({ 
    success: true, 
    user: { name: user.name, email: cleanEmail, currency: user.data?.profile?.currency || "BRL" }, 
    data: user.data 
  });
});

// Full state synchronization per user
app.get(["/api/data", "/data"], async (req, res) => {
  const email = getUserEmail(req);
  const sb = getSupabaseCredentials(req);
  if (sb) {
    try {
      const profileRes = await querySupabase(sb.url, sb.key, `user_profiles?email=eq.${encodeURIComponent(email)}`);
      if (profileRes && profileRes.length > 0) {
        return res.json(profileRes[0].data);
      }
      const freshData = {
        profile: { name: email.split("@")[0], email, currency: "BRL", theme: "light" },
        transactions: [],
        investments: [],
        fixedIncome: [],
        budgets: {},
        bankAccounts: []
      };
      return res.json(freshData);
    } catch (err: any) {
      console.error("Supabase GET data error:", err);
      return res.status(500).json({ error: `Erro ao buscar dados do Supabase: ${err.message}` });
    }
  }

  res.json(readUserDb(email));
});

app.post(["/api/data", "/data"], async (req, res) => {
  const email = getUserEmail(req);
  let data = req.body;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch (e) {}
  }

  const sb = getSupabaseCredentials(req);
  if (sb) {
    try {
      const profileRes = await querySupabase(sb.url, sb.key, `user_profiles?email=eq.${encodeURIComponent(email)}`);
      if (profileRes && profileRes.length > 0) {
        await querySupabase(sb.url, sb.key, `user_profiles?email=eq.${encodeURIComponent(email)}`, "PATCH", {
          data
        });
      } else {
        await querySupabase(sb.url, sb.key, "user_profiles", "POST", {
          email,
          data
        });
      }
      return res.json({ success: true, data });
    } catch (err: any) {
      console.error("Supabase POST data error:", err);
      return res.status(500).json({ success: false, error: `Erro ao salvar dados no Supabase: ${err.message}` });
    }
  }

  writeUserDb(email, data);
  res.json({ success: true, data });
});

const cleanEnvVar = (val: string | undefined): string | undefined => {
  if (!val) return undefined;
  let s = val.trim();
  if (s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1);
  }
  if (s.startsWith("'") && s.endsWith("'")) {
    s = s.slice(1, -1);
  }
  return s.trim();
};

// OpenFinance mock synchronization flow
app.post(["/api/openfinance/sync", "/openfinance/sync"], (req, res) => {
  const email = getUserEmail(req);
  const db = readUserDb(email);
  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) {}
  }
  const bankName = body.bankName;

  // Let's create mock new transactions for OpenFinance sync
  const possibleTransactions = [
    { description: "Pão de Açúcar Supermercados", amount: 145.20, category: "Alimentação", subcategory: "Supermercado" },
    { description: "Posto Shell Aliança", amount: 180.00, category: "Transporte", subcategory: "Combustível" },
    { description: "Netflix Assinatura", amount: 55.90, category: "Lazer", subcategory: "Streaming" },
    { description: "Fármacia Pague Menos", amount: 35.40, category: "Saúde", subcategory: "Medicamentos" },
    { description: "Sabesp S.A. Água", amount: 84.50, category: "Utilities", subcategory: "Saneamento" }
  ];

  // Pick 1 or 2 random transactions to add
  const count = Math.floor(Math.random() * 2) + 1;
  const added: any[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (let i = 0; i < count; i++) {
    const item = possibleTransactions[Math.floor(Math.random() * possibleTransactions.length)];
    const id = "of-" + Math.random().toString(36).substr(2, 9);
    
    // Deduplicate: check if we already added a transaction with the same description today
    const exists = db.transactions.some((t: any) => t.description === item.description && t.date === today);
    if (!exists) {
      const newTx = {
        id,
        date: today,
        amount: item.amount,
        type: "despesa" as const,
        category: item.category,
        subcategory: item.subcategory,
        description: item.description,
        currency: "BRL" as const,
        tags: ["OpenFinance", bankName],
        bankAccount: bankName
      };
      db.transactions.unshift(newTx);
      added.push(newTx);

      // Deduct from bank account balance
      const account = db.bankAccounts.find((a: any) => a.bankName === bankName);
      if (account) {
        account.balance = Number((account.balance - item.amount).toFixed(2));
        account.lastSync = new Date().toISOString();
      }
    }
  }

  writeUserDb(email, db);
  res.json({ success: true, addedCount: added.length, addedTransactions: added, fullAccounts: db.bankAccounts });
});

// Add a transaction
app.post(["/api/transactions", "/transactions"], (req, res) => {
  const email = getUserEmail(req);
  const db = readUserDb(email);
  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) {}
  }
  const transaction = {
    id: "t-" + Math.random().toString(36).substr(2, 9),
    ...body,
  };
  db.transactions.unshift(transaction);
  writeUserDb(email, db);
  res.json({ success: true, transaction });
});

// Secure Supabase Proxy / Simulated Sandbox to bypass browser-level CORS / DNS failures
app.all(["/api/supabase/proxy", "/supabase/proxy"], async (req, res) => {
  let requestData = req.body;
  if (typeof requestData === "string") {
    try {
      requestData = JSON.parse(requestData);
    } catch (e) {
      // ignore
    }
  }
  requestData = requestData || {};
  const { url, apiKey, tableName, method, body, id, idFieldName } = requestData;

  if (!url || !apiKey || !tableName || !method) {
    return res.status(400).json({ 
      error: "Parâmetros obrigatórios ausentes no proxy.", 
      details: "Requer url, apiKey, tableName e method." 
    });
  }

  const isPlaceholderUrl = url.includes("seu-projeto.supabase.co");
  const isPlaceholderKey = apiKey.includes("sua-anon-key-aqui");
  const isSimulated = isPlaceholderUrl || isPlaceholderKey || !url || !apiKey;

  if (isSimulated) {
    console.log(`[Supabase Sandbox] Simulating ${method} on table "${tableName}"`);
    const email = getUserEmail(req);
    const db = readUserDb(email);
    if (!db.supabase_simulated_tables) {
      db.supabase_simulated_tables = {};
    }
    if (!db.supabase_simulated_tables[tableName]) {
      // Seed default sandbox data if the table is requested for the first time
      db.supabase_simulated_tables[tableName] = [
        { id: "1", descricao: "Almoço Executivo", valor: 38.50, categoria: "Alimentação", tags: ["sandbox", "teste"] },
        { id: "2", descricao: "Uber para Escritório", valor: 24.90, categoria: "Transporte", tags: ["sandbox"] },
        { id: "3", descricao: "Assinatura Netflix", valor: 55.90, category: "Lazer", tags: ["mensal"] }
      ];
      writeUserDb(email, db);
    }

    const tableData = db.supabase_simulated_tables[tableName];

    if (method === "GET") {
      return res.json(tableData);
    } else if (method === "POST") {
      const fieldName = idFieldName || "id";
      const newRecord = {
        [fieldName]: "sb-" + Math.random().toString(36).substr(2, 9),
        ...body,
        created_at: new Date().toISOString()
      };
      tableData.push(newRecord);
      db.supabase_simulated_tables[tableName] = tableData;
      writeUserDb(email, db);
      return res.json([newRecord]);
    } else if (method === "DELETE") {
      const initialLength = tableData.length;
      const fieldName = idFieldName || "id";
      db.supabase_simulated_tables[tableName] = tableData.filter(
        (row: any) => String(row[fieldName]) !== String(id)
      );
      writeUserDb(email, db);
      return res.json({ 
        success: true, 
        message: "Deletado com sucesso do sandbox persistido localmente.", 
        deletedCount: initialLength - db.supabase_simulated_tables[tableName].length 
      });
    }

    return res.status(400).json({ error: `Método ${method} não suportado no sandbox.` });
  }

  // Live Proxy Connection
  try {
    const cleanUrl = url.replace(/\/$/, "");
    let targetUrl = `${cleanUrl}/rest/v1/${tableName}`;
    
    const headers: Record<string, string> = {
      "apikey": apiKey,
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    };

    if (method === "GET") {
      targetUrl += "?select=*";
    } else if (method === "POST") {
      headers["Prefer"] = "return=representation";
    } else if (method === "DELETE") {
      const field = idFieldName || "id";
      targetUrl += `?${field}=eq.${id}`;
    }

    const fetchOptions: RequestInit = {
      method: method,
      headers: headers
    };

    if (method === "POST" && body) {
      fetchOptions.body = JSON.stringify(body);
    }

    console.log(`[Supabase Proxy] Requesting real endpoint: ${method} ${targetUrl}`);
    const targetResponse = await fetch(targetUrl, fetchOptions);

    if (!targetResponse.ok) {
      const errText = await targetResponse.text();
      return res.status(targetResponse.status).json({
        error: `Supabase REST API Error (Status ${targetResponse.status})`,
        details: errText
      });
    }

    const responseText = await targetResponse.text();
    let responseData = {};
    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { message: responseText };
      }
    }

    return res.json(responseData);
  } catch (err: any) {
    console.error("[Supabase Proxy] Connection failure:", err);
    return res.status(500).json({
      error: "Falha de conexão com o Supabase através do servidor.",
      details: err.message || "Verifique se o seu projeto do Supabase está ativo e as credenciais estão corretas."
    });
  }
});

// Helper to wrap a promise with a timeout
function withTimeout(promise: Promise<any>, timeoutMs: number, label = "Operação"): Promise<any> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} expirou após ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// Helper to extract and clean JSON from Gemini text response
function extractAndCleanJSON(text: string): any {
  let cleaned = text.trim();
  
  // 1. Remove markdown code blocks if present
  if (cleaned.includes("```")) {
    const jsonMatch = cleaned.match(/```json\s*([\s\S]*?)\s*```/) || cleaned.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      cleaned = jsonMatch[1].trim();
    }
  }
  
  // 2. Try parsing, and fallback to regex object search if first try fails
  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    console.warn("[OCR JSON Parse] Parse direto falhou, tentando extração por regex...", firstError);
    const objMatch = cleaned.match(/(\{[\s\S]*\})/);
    if (objMatch && objMatch[1]) {
      try {
        return JSON.parse(objMatch[1]);
      } catch (secondError) {
        console.error("[OCR JSON Parse] Falha também na extração por regex.", secondError);
        throw new Error(`A resposta do modelo não contém JSON válido. Conteúdo retornado: ${text}`);
      }
    }
    throw new Error(`JSON não encontrado na resposta do modelo. Conteúdo retornado: ${text}`);
  }
}

// Receipt OCR Analysis with Gemini AI
app.post(["/api/transactions/scan", "/transactions/scan"], async (req, res) => {
  const startTime = Date.now();
  let requestData = req.body || {};
  if (typeof requestData === "string") {
    try {
      requestData = JSON.parse(requestData);
    } catch (e) {
      // ignore
    }
  }
  const { imageBase64, mimeType, isFast } = requestData;
  const useFast = isFast !== false; // Default to true if not specified to prevent timeouts and daily quota limits

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({
      success: false,
      error: "Parâmetros obrigatórios ausentes",
      details: "Os parâmetros 'imageBase64' e 'mimeType' são obrigatórios.",
      status: "INVALID_ARGUMENT",
      code: 400
    });
  }

  // Validate that mimeType is an image
  if (!mimeType.startsWith("image/")) {
    return res.status(400).json({
      success: false,
      error: "Tipo de arquivo inválido",
      details: `O tipo de arquivo '${mimeType}' não é uma imagem suportada. Envie apenas imagens (JPEG, PNG, WebP).`,
      status: "INVALID_ARGUMENT",
      code: 400
    });
  }

  // Remove data URL prefix if it exists in a highly robust way
  const rawBase64 = imageBase64.includes(";base64,") ? imageBase64.split(";base64,")[1] : imageBase64;

  // Validate image size (must be under 10MB after base64 conversion)
  const imageSizeKB = Math.round(rawBase64.length * 0.75 / 1024);
  if (imageSizeKB > 10240) { // 10MB limit
    return res.status(413).json({
      success: false,
      error: "Imagem muito grande",
      details: `O tamanho da imagem (${(imageSizeKB / 1024).toFixed(1)} MB) excede o limite máximo permitido de 10 MB.`,
      status: "PAYLOAD_TOO_LARGE",
      code: 413
    });
  }

  // Log OCR startup details
  console.log(`[OCR] Iniciando processamento de imagem de recibo:`);
  console.log(`- MimeType: ${mimeType}`);
  console.log(`- Tamanho estimado: ${imageSizeKB} KB`);

  let ai;
  try {
    ai = getGeminiClient();
  } catch (initErr: any) {
    console.error("[OCR ERROR] Erro na inicialização do cliente Gemini:", initErr);
    return res.status(401).json({
      success: false,
      error: "Falha de autenticação ou inicialização do Gemini",
      details: initErr.message,
      status: "UNAUTHORIZED_OR_INVALID_KEY",
      code: 401
    });
  }

  const currentDate = new Date().toISOString().split("T")[0];
  const prompt = `Analise a imagem deste recibo ou nota fiscal de compra fornecida e extraia as seguintes informações de forma extremamente precisa.
A data de hoje é ${currentDate}. Utilize-a apenas como referência de contexto de ano/mês/dia.

Você deve extrair exatamente estes campos:
1. "establishment" (nome do estabelecimento comercial, com letra maiúscula).
2. "cnpj" (número do CNPJ do estabelecimento no formato XX.XXX.XXX/XXXX-XX ou null se não existente na imagem).
3. "date" (data da compra no formato YYYY-MM-DD ou null se não identificada).
4. "time" (hora da compra no formato HH:MM ou null se não identificada).
5. "total" (valor total pago em formato de número decimal ou null se não identificado).
6. "paymentMethod" (forma de pagamento utilizada, ex: Cartão de Crédito, PIX, Dinheiro, etc. ou null se não identificada).
7. "category" (categoria sugerida do gasto. Escolha estritamente uma destas: Alimentação, Transporte, Saúde, Educação, Lazer, Utilities, Outros ou null se não identificada).
8. "subcategory" (subcategoria específica correspondente, ex: Supermercado, Restaurante, Combustível, Farmácia, Faculdade, etc. ou null se não identificada).
9. "items" (uma lista/array de strings correspondendo a cada produto/item lido na nota ou null se não identificado).
10. "confidence" (um número inteiro entre 0 e 100 de confiança na leitura).
11. "description" (breve resumo descritivo em português da nota ou null se não identificado).

Regras cruciais:
- Se algum campo não existir na imagem, retorne null para esse campo.
- Nunca invente, fabrique ou simule qualquer informação.
- O retorno deve ser exclusivamente JSON correspondente a este esquema.`;

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: rawBase64,
    },
  };

  const textPart = {
    text: prompt,
  };

  // Prioritize gemini-3.1-flash-lite if useFast is true to prevent timeouts and daily quota limits on free-tier keys
  const modelsToTry = useFast 
    ? ["gemini-3.1-flash-lite", "gemini-3.5-flash"]
    : ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
    
  let resultText = "";
  let modelUsed = "";
  let lastError: any = null;

  const isVercel = process.env.VERCEL === "1";
  // Vercel serverless functions on hobby have a hard 10-second execution timeout.
  // We limit to 1 attempt per model with 4-second timeout on Vercel to guarantee response within the 10s window.
  const maxAttempts = isVercel ? 1 : 2;
  const attemptTimeout = isVercel ? 4000 : 15000;

  for (const modelName of modelsToTry) {
    console.log(`[OCR] Tentando analisar com o modelo '${modelName}'...`);
    // Try up to maxAttempts per model
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[OCR] ${modelName} - Tentativa ${attempt} de ${maxAttempts}...`);
        
        const response = await withTimeout(
          ai.models.generateContent({
            model: modelName,
            contents: { parts: [imagePart, textPart] },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  establishment: { type: Type.STRING, description: "Nome do estabelecimento comercial ou null se não identificado." },
                  cnpj: { type: Type.STRING, description: "CNPJ do estabelecimento comercial ou null se não identificado." },
                  date: { type: Type.STRING, description: "Data da compra no formato YYYY-MM-DD ou null se não identificado." },
                  time: { type: Type.STRING, description: "Hora da compra no formato HH:MM ou null se não identificado." },
                  total: { type: Type.NUMBER, description: "Valor total do recibo ou null se não identificado." },
                  paymentMethod: { type: Type.STRING, description: "Forma de pagamento utilizada ou null se não identificado." },
                  category: { type: Type.STRING, description: "Categoria sugerida: Alimentação, Transporte, Saúde, Educação, Lazer, Utilities, Outros ou null se não identificado." },
                  subcategory: { type: Type.STRING, description: "Subcategoria sugerida ou null se não identificado." },
                  items: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Array com os itens identificados ou null se não identificado."
                  },
                  confidence: { type: Type.INTEGER, description: "Nível de confiança da classificação (0-100) ou null se não identificado." },
                  description: { type: Type.STRING, description: "Resumo descritivo da compra ou null se não identificado." }
                },
                required: [
                  "establishment", "cnpj", "date", "time", "total", "paymentMethod",
                  "category", "subcategory", "items", "confidence", "description"
                ]
              }
            }
          }),
          attemptTimeout,
          `Chamada ao Gemini (${modelName})`
        );

        if (response && response.text) {
          resultText = response.text;
          modelUsed = modelName;
          console.log(`[OCR] Sucesso com o modelo '${modelName}' na tentativa ${attempt}.`);
          break;
        } else {
          throw new Error("A API do Gemini retornou uma resposta vazia.");
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = (err.message || "").toLowerCase();
        console.warn(`[OCR WARNING] Falha no modelo '${modelName}' (Tentativa ${attempt}):`, err.message || err);

        // Immediate exit if the API key is invalid (unauthorized) - avoids waste of time
        if (
          errMsg.includes("api key") || 
          errMsg.includes("apikey") || 
          errMsg.includes("invalid key") || 
          errMsg.includes("key not valid") || 
          errMsg.includes("forbidden") || 
          err.status === 401 || 
          err.status === 403
        ) {
          console.error("[OCR] Chave de API inválida detectada. Interrompendo tentativas imediatamente.");
          break;
        }

        // Wait with backoff before retry (only if we have more attempts)
        if (attempt < maxAttempts) {
          const backoffDelay = attempt * 1000;
          console.log(`[OCR] Aguardando ${backoffDelay}ms antes de tentar novamente...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }
    
    // Stop trying other models if we succeeded
    if (resultText) {
      break;
    }

    // Stop trying other models if API Key error occurred
    const errMsg = (lastError?.message || "").toLowerCase();
    if (
      errMsg.includes("api key") || 
      errMsg.includes("apikey") || 
      errMsg.includes("invalid key") || 
      errMsg.includes("key not valid") || 
      errMsg.includes("forbidden") || 
      lastError?.status === 401 || 
      lastError?.status === 403
    ) {
      break;
    }
  }

  if (!resultText) {
    const duration = Date.now() - startTime;
    console.error(`[OCR ERROR] Todas as tentativas de OCR falharam após ${duration}ms.`, lastError);
    
    // Determine detailed HTTP status code and response payload
    let statusCode = 500;
    let errorStatus = "INTERNAL_SERVER_ERROR";
    const errorMessage = lastError?.message || "Ocorreu um erro ao processar o OCR da nota fiscal.";
    
    const errLower = errorMessage.toLowerCase();
    if (errLower.includes("unauthorized") || errLower.includes("key not valid") || errLower.includes("invalid key") || errLower.includes("api key") || lastError?.status === 401 || lastError?.status === 403) {
      statusCode = 401;
      errorStatus = "UNAUTHORIZED_INVALID_API_KEY";
    } else if (errLower.includes("rate limit") || errLower.includes("quota exceeded") || errLower.includes("resource exhausted") || lastError?.status === 429) {
      statusCode = 429;
      errorStatus = "RATE_LIMIT_OR_QUOTA_EXHAUSTED";
    } else if (errLower.includes("overloaded") || errLower.includes("unavailable") || lastError?.status === 503) {
      statusCode = 503;
      errorStatus = "MODEL_OVERLOADED_OR_UNAVAILABLE";
    } else if (errLower.includes("timeout") || errLower.includes("expirou") || lastError?.status === 504) {
      statusCode = 504;
      errorStatus = "GATEWAY_TIMEOUT";
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: lastError?.stack || "Sem detalhes adicionais disponíveis.",
      status: errorStatus,
      code: statusCode
    });
  }

  // Handle successful text parsing
  try {
    const processingTime = Date.now() - startTime;
    console.log(`[OCR SUCCESS] Processamento finalizado em ${processingTime}ms usando o modelo '${modelUsed}':`);
    console.log(`- Resposta da API:`, resultText);

    const parsedJSON = extractAndCleanJSON(resultText);
    
    // Return parsed JSON directly
    return res.json({
      success: true,
      data: parsedJSON,
      meta: {
        model: modelUsed,
        processingTimeMs: processingTime,
        imageSizeKB: imageSizeKB
      }
    });
  } catch (parseError: any) {
    const duration = Date.now() - startTime;
    console.error(`[OCR ERROR] Falha ao parsear JSON retornado pela IA após ${duration}ms:`, parseError);
    return res.status(500).json({
      success: false,
      error: "Falha na decodificação do JSON de resposta da IA.",
      details: parseError.message + "\nResposta recebida:\n" + resultText,
      status: "JSON_PARSING_FAILURE",
      code: 500
    });
  }
});

// Setup Vite Dev server middleware if in development, otherwise serve statics
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving production static files from dist/ directory.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;

if (process.env.VERCEL !== "1") {
  start().catch((err) => {
    console.error("Server startup error:", err);
  });
}