import { createContext, useContext, useState, ReactNode } from 'react';
import { Trade, CalculationResult } from '../types';

interface CalculatorImport {
  trade: string;
  results: CalculationResult[];
  timestamp: number;
}

interface PricingContextType {
  selectedTrade: Trade | null;
  setSelectedTrade: (trade: Trade | null) => void;
  specifications: Record<string, any>;
  setSpecifications: (specs: Record<string, any>) => void;
  pricingResults: any | null;
  setPricingResults: (results: any | null) => void;
  savedEstimates: any[];
  saveEstimate: (estimate: any) => void;
  saveCalculatorResults: (trade: string, results: CalculationResult[]) => void;
  getPendingCalculatorImport: () => CalculatorImport | null;
  clearPendingCalculatorImport: () => void;
}

const PricingContext = createContext<PricingContextType | undefined>(undefined);

export function PricingProvider({ children }: { children: ReactNode }) {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [specifications, setSpecifications] = useState<Record<string, any>>({});
  const [pricingResults, setPricingResults] = useState<any | null>(null);
  const [savedEstimates, setSavedEstimates] = useState<any[]>([]);

  const saveEstimate = (estimate: any) => {
    setSavedEstimates(prev => [...prev, { ...estimate, id: Date.now().toString() }]);
  };

  const saveCalculatorResults = (trade: string, results: CalculationResult[]) => {
    const importData: CalculatorImport = {
      trade,
      results,
      timestamp: Date.now()
    };
    localStorage.setItem('pendingCalculatorImport', JSON.stringify(importData));
  };

  const getPendingCalculatorImport = (): CalculatorImport | null => {
    try {
      const stored = localStorage.getItem('pendingCalculatorImport');
      if (!stored) return null;

      const data: CalculatorImport = JSON.parse(stored);

      // Check if import is less than 1 hour old
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      if (data.timestamp < oneHourAgo) {
        localStorage.removeItem('pendingCalculatorImport');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting pending calculator import:', error);
      return null;
    }
  };

  const clearPendingCalculatorImport = () => {
    localStorage.removeItem('pendingCalculatorImport');
  };

  return (
    <PricingContext.Provider
      value={{
        selectedTrade,
        setSelectedTrade,
        specifications,
        setSpecifications,
        pricingResults,
        setPricingResults,
        savedEstimates,
        saveEstimate,
        saveCalculatorResults,
        getPendingCalculatorImport,
        clearPendingCalculatorImport,
      }}
    >
      {children}
    </PricingContext.Provider>
  );
}

export function usePricing() {
  const context = useContext(PricingContext);
  if (context === undefined) {
    throw new Error('usePricing must be used within a PricingProvider');
  }
  return context;
}