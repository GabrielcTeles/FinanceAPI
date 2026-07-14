/**
 * Financial utility functions for Finanças Inteligentes
 */

export function formatCurrency(value: number, currency: 'BRL' | 'USD' | 'EUR' = 'BRL'): string {
  try {
    return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : currency === 'USD' ? 'en-US' : 'de-DE', {
      style: 'currency',
      currency: currency,
    }).format(value);
  } catch (e) {
    const symbols = { BRL: 'R$', USD: '$', EUR: '€' };
    return `${symbols[currency] || 'R$'} ${value.toFixed(2)}`;
  }
}

/**
 * Calculates progressive Income Tax (IR) for fixed income investments in Brazil:
 * - Up to 180 days: 22.5%
 * - 181 to 360 days: 20.0%
 * - 361 to 720 days: 17.5%
 * - Over 720 days: 15.0%
 */
export function calculateFixedIncomeYield(
  principal: number,
  ratePct: number, // index rate or fixed interest %
  indexation: 'CDI' | 'SELIC' | 'IPCA' | 'Prefixado',
  appDateStr: string,
  nowDate: Date = new Date(),
  referenceRates = { CDI: 14.15, SELIC: 14.25, IPCA: 4.64 }
): {
  daysElapsed: number;
  grossInterest: number;
  taxRate: number;
  taxAmount: number;
  netValue: number;
  accruedRateAnual: number;
} {
  const appDate = new Date(appDateStr);
  const timeDiff = nowDate.getTime() - appDate.getTime();
  const daysElapsed = Math.max(0, Math.floor(timeDiff / (1000 * 3600 * 24)));

  // Calculate annual rate
  let annualRatePct = 0;
  if (indexation === 'CDI') {
    annualRatePct = (ratePct / 100) * referenceRates.CDI;
  } else if (indexation === 'SELIC') {
    annualRatePct = (ratePct / 100) * referenceRates.SELIC;
  } else if (indexation === 'IPCA') {
    // Hybrid interest rate + inflation: e.g. IPCA + 6%
    annualRatePct = referenceRates.IPCA + ratePct;
  } else {
    // Prefixado
    annualRatePct = ratePct;
  }

  // Daily interest multiplier (compound interest based on days / 365 or simple approximation for UI)
  const dailyRate = Math.pow(1 + (annualRatePct / 100), 1 / 365) - 1;
  const multiplier = Math.pow(1 + dailyRate, daysElapsed);
  
  const grossValue = principal * multiplier;
  const grossInterest = Math.max(0, grossValue - principal);

  // Progressive Tax Rate
  let taxRate = 0.15;
  if (daysElapsed <= 180) {
    taxRate = 0.225;
  } else if (daysElapsed <= 360) {
    taxRate = 0.20;
  } else if (daysElapsed <= 720) {
    taxRate = 0.175;
  }

  const taxAmount = grossInterest * taxRate;
  const netValue = principal + (grossInterest - taxAmount);

  return {
    daysElapsed,
    grossInterest,
    taxRate: taxRate * 100,
    taxAmount,
    netValue,
    accruedRateAnual: annualRatePct
  };
}

export const CATEGORY_COLORS: Record<string, string> = {
  "Alimentação": "bg-emerald-500",
  "Transporte": "bg-blue-500",
  "Saúde": "bg-red-500",
  "Educação": "bg-purple-500",
  "Lazer": "bg-amber-500",
  "Utilities": "bg-sky-500",
  "Outros": "bg-slate-500",
  "Salário": "bg-indigo-500",
};

export const CATEGORY_TEXT_COLORS: Record<string, string> = {
  "Alimentação": "text-emerald-500",
  "Transporte": "text-blue-500",
  "Saúde": "text-red-500",
  "Educação": "text-purple-500",
  "Lazer": "text-amber-500",
  "Utilities": "text-sky-500",
  "Outros": "text-slate-500",
  "Salário": "text-indigo-500",
};
