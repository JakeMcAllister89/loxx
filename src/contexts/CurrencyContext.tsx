import React, { createContext, useContext, useState } from 'react';
import { Currency } from '@/data/types';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  format: (gbp: number, eur: number) => string;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('GBP');

  const symbol = currency === 'GBP' ? '£' : '€';

  const format = (gbp: number, eur: number) => {
    const value = currency === 'GBP' ? gbp : eur;
    return `${symbol}${value.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format, symbol }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider');
  return context;
}
