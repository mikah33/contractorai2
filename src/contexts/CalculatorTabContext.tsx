import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CalculatorTab } from '../types/custom-calculator';

interface CalculatorTabContextType {
  activeTab: CalculatorTab;
  setActiveTab: (tab: CalculatorTab) => void;
}

const CalculatorTabContext = createContext<CalculatorTabContextType | undefined>(undefined);

export const CalculatorTabProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<CalculatorTab>('default');

  return (
    <CalculatorTabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </CalculatorTabContext.Provider>
  );
};

export const useCalculatorTab = () => {
  const context = useContext(CalculatorTabContext);
  if (context === undefined) {
    throw new Error('useCalculatorTab must be used within a CalculatorTabProvider');
  }
  return context;
};
