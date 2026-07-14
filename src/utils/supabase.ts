/**
 * Supabase client service for fetching, inserting, and deleting data.
 * Built based on custom user requirements for direct REST integration.
 */

// Default configuration with fallback to environment variables
export const DEFAULT_SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "https://seu-projeto.supabase.co";
export const DEFAULT_SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "sua-anon-key-aqui";

export interface SupabaseConfig {
  url: string;
  apiKey: string;
  tableName: string;
}

export interface SupabaseGlobalConfig {
  url: string;
  apiKey: string;
  autoSync: boolean;
  transactionsTable: string;
  investmentsTable: string;
  fixedIncomeTable: string;
  idFieldName: string;
}

const STORAGE_KEY = "supabase_config_v1";

export function getStoredSupabaseConfig(): SupabaseGlobalConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        url: parsed.url || DEFAULT_SUPABASE_URL,
        apiKey: parsed.apiKey || DEFAULT_SUPABASE_KEY,
        autoSync: !!parsed.autoSync,
        transactionsTable: parsed.transactionsTable || "transactions",
        investmentsTable: parsed.investmentsTable || "investments",
        fixedIncomeTable: parsed.fixedIncomeTable || "fixed_income",
        idFieldName: parsed.idFieldName || "id"
      };
    }
  } catch (e) {
    console.error("Erro ao ler configurações do Supabase:", e);
  }
  return {
    url: DEFAULT_SUPABASE_URL,
    apiKey: DEFAULT_SUPABASE_KEY,
    autoSync: false,
    transactionsTable: "transactions",
    investmentsTable: "investments",
    fixedIncomeTable: "fixed_income",
    idFieldName: "id"
  };
}

export function saveStoredSupabaseConfig(config: SupabaseGlobalConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("Erro ao salvar configurações do Supabase:", e);
  }
}

/**
 * Fetches all records from the configured Supabase table.
 */
export async function buscarDados(config: SupabaseConfig = { 
  url: DEFAULT_SUPABASE_URL, 
  apiKey: DEFAULT_SUPABASE_KEY, 
  tableName: "sua_tabela" 
}) {
  const { url, apiKey, tableName } = config;

  try {
    const response = await fetch("/api/supabase/proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url,
        apiKey,
        tableName,
        method: "GET"
      })
    });

    if (!response.ok) {
      const respText = await response.text().catch(() => "");
      let errMsg = "";
      try {
        const errJson = JSON.parse(respText);
        errMsg = errJson.details || errJson.error || `HTTP ${response.status}: ${respText.substring(0, 150)}`;
      } catch (e) {
        errMsg = `HTTP ${response.status}: ${respText.substring(0, 150) || "Erro na resposta do servidor proxy"}`;
      }
      throw new Error(errMsg);
    }
    
    const dados = await response.json();
    console.log("Dados buscados com sucesso:", dados);
    return dados;
  } catch (erro) {
    console.error("Erro ao buscar dados do Supabase:", erro);
    throw erro;
  }
}

/**
 * Inserts a new record (or records) into the configured Supabase table.
 */
export async function inserirDados<T = any>(
  novosDados: T,
  config: SupabaseConfig = { 
    url: DEFAULT_SUPABASE_URL, 
    apiKey: DEFAULT_SUPABASE_KEY, 
    tableName: "sua_tabela" 
  },
  idFieldName: string = "id"
) {
  const { url, apiKey, tableName } = config;

  try {
    const response = await fetch("/api/supabase/proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url,
        apiKey,
        tableName,
        method: "POST",
        body: novosDados,
        idFieldName
      })
    });

    if (!response.ok) {
      const respText = await response.text().catch(() => "");
      let errMsg = "";
      try {
        const errJson = JSON.parse(respText);
        errMsg = errJson.details || errJson.error || `HTTP ${response.status}: ${respText.substring(0, 150)}`;
      } catch (e) {
        errMsg = `HTTP ${response.status}: ${respText.substring(0, 150) || "Erro de inserção"}`;
      }
      throw new Error(errMsg);
    }
    
    const resultado = await response.json();
    console.log("Dados inseridos com sucesso:", resultado);
    return resultado;
  } catch (erro) {
    console.error("Erro ao inserir dados no Supabase:", erro);
    throw erro;
  }
}

/**
 * Deletes a record from the configured Supabase table based on its ID.
 */
export async function deletarDados(
  id: string | number,
  config: SupabaseConfig = { 
    url: DEFAULT_SUPABASE_URL, 
    apiKey: DEFAULT_SUPABASE_KEY, 
    tableName: "sua_tabela" 
  },
  idFieldName: string = "id"
) {
  const { url, apiKey, tableName } = config;

  try {
    const response = await fetch("/api/supabase/proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url,
        apiKey,
        tableName,
        method: "DELETE",
        id,
        idFieldName
      })
    });

    if (!response.ok) {
      const respText = await response.text().catch(() => "");
      let errMsg = "";
      try {
        const errJson = JSON.parse(respText);
        errMsg = errJson.details || errJson.error || `HTTP ${response.status}: ${respText.substring(0, 150)}`;
      } catch (e) {
        errMsg = `HTTP ${response.status}: ${respText.substring(0, 150) || "Erro de exclusão"}`;
      }
      throw new Error(errMsg);
    }
    
    const result = await response.json();
    console.log(`Deletado com sucesso (ID: ${id})`, result);
    return { success: true, id };
  } catch (erro) {
    console.error(`Erro ao deletar dados no Supabase (ID: ${id}):`, erro);
    throw erro;
  }
}
