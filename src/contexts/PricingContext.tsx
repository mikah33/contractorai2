import { createContext, useContext, useState, ReactNode } from 'react';
import { Trade } from '../types';

interface PricingContextType {
  selectedTrade: Trade | null;
  setSelectedTrade: (trade: Trade | null) => void;
  specifications: Record<string, any>;
  setSpecifications: (specs: Record<string, any>) => void;
  pricingResults: any | null;
  setPricingResults: (results: any | null) => void;
  savedEstimates: any[];
  saveEstimate: (estimate: any) => void;
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