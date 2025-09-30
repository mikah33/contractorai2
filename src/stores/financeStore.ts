import { create } from 'zustand';
import { subDays, addDays, format, parseISO, addMonths } from 'date-fns';

// Types (keeping the same interfaces)
export interface Receipt {
  id: string;
  vendor: string;
  date: string;
  amount: number;
  category: string;
  projectId?: string;
  notes?: string;
  imageUrl?: string;
  status: 'pending' | 'processed' | 'verified';
}

export interface Payment {
  id: string;
  clientId: string;
  projectId: string;
  amount: number;
  date: string;
  method: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'other';
  reference?: string;
  notes?: string;
  status: 'pending' | 'completed' | 'failed';
  invoiceId?: string;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextDueDate: string;
  vendor: string;
  projectId?: string;
  isActive: boolean;
}

export interface BudgetItem {
  id: string;
  projectId: string;
  category: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  totalBudget: number;
  totalActual: number;
  variance: number;
  variancePercentage: number;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface Invoice {
  id: string;
  projectId: string;
  amount: number;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  profitMargin: number;
  outstandingInvoices: number;
  upcomingPayments: {
    amount: number;
    dueDate: string;
    projectName: string;
    clientName: string;
  }[];
  recentTransactions: {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }[];
  monthlyData: {
    month: string;
    revenue: number;
    expenses: number;
  }[];
  expensesByCategory: {
    category: string;
    amount: number;
    percentage: number;
  }[];
}

interface FinanceState {
  // Data - all start empty
  receipts: Receipt[];
  payments: Payment[];
  recurringExpenses: RecurringExpense[];
  budgetItems: BudgetItem[];
  projects: Project[];
  clients: Client[];
  invoices: Invoice[];
  
  // UI state
  dateRange: 'week' | 'month' | 'quarter' | 'year';
  isLoading: boolean;
  error: string | null;
  
  // Computed data - starts empty
  financialSummary: FinancialSummary;
  
  // Actions
  addReceipt: (receipt: Omit<Receipt, 'id'>) => void;
  updateReceipt: (receipt: Receipt) => void;
  deleteReceipt: (id: string) => void;
  
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  updatePayment: (payment: Payment) => void;
  deletePayment: (id: string) => void;
  
  addRecurringExpense: (expense: Omit<RecurringExpense, 'id'>) => void;
  updateRecurringExpense: (expense: RecurringExpense) => void;
  deleteRecurringExpense: (id: string) => void;
  toggleRecurringExpense: (id: string, isActive: boolean) => void;
  
  addBudgetItem: (item: Omit<BudgetItem, 'id' | 'variance' | 'variancePercentage'>) => void;
  updateBudgetItem: (item: BudgetItem) => void;
  
  setDateRange: (range: 'week' | 'month' | 'quarter' | 'year') => void;
  generateReport: (options: any) => Promise<void>;
  
  // AI features
  predictCashFlow: (months: number) => Promise<any>;
  detectAnomalies: () => Promise<any>;
  suggestCostSavings: () => Promise<any>;
}

// Create the store with all empty data
export const useFinanceStore = create<FinanceState>((set, get) => ({
  // Initial empty state
  receipts: [],
  payments: [],
  recurringExpenses: [],
  budgetItems: [],
  projects: [],
  clients: [],
  invoices: [],
  dateRange: 'month',
  isLoading: false,
  error: null,
  financialSummary: {
    totalRevenue: 0,
    totalExpenses: 0,
    profit: 0,
    profitMargin: 0,
    outstandingInvoices: 0,
    upcomingPayments: [],
    recentTransactions: [],
    monthlyData: [],
    expensesByCategory: []
  },
  
  // Receipt actions
  addReceipt: (receipt) => {
    const newReceipt = {
      ...receipt,
      id: `receipt-${Date.now()}`
    };
    
    set(state => ({
      receipts: [...state.receipts, newReceipt]
    }));
  },
  
  updateReceipt: (receipt) => {
    set(state => ({
      receipts: state.receipts.map(r => r.id === receipt.id ? receipt : r)
    }));
  },
  
  deleteReceipt: (id) => {
    set(state => ({
      receipts: state.receipts.filter(r => r.id !== id)
    }));
  },
  
  // Payment actions
  addPayment: (payment) => {
    const newPayment = {
      ...payment,
      id: `payment-${Date.now()}`
    };
    
    set(state => ({
      payments: [...state.payments, newPayment]
    }));
  },
  
  updatePayment: (payment) => {
    set(state => ({
      payments: state.payments.map(p => p.id === payment.id ? payment : p)
    }));
  },
  
  deletePayment: (id) => {
    set(state => ({
      payments: state.payments.filter(p => p.id !== id)
    }));
  },
  
  // Recurring expense actions
  addRecurringExpense: (expense) => {
    const newExpense = {
      ...expense,
      id: `recur-${Date.now()}`
    };
    
    set(state => ({
      recurringExpenses: [...state.recurringExpenses, newExpense]
    }));
  },
  
  updateRecurringExpense: (expense) => {
    set(state => ({
      recurringExpenses: state.recurringExpenses.map(e => e.id === expense.id ? expense : e)
    }));
  },
  
  deleteRecurringExpense: (id) => {
    set(state => ({
      recurringExpenses: state.recurringExpenses.filter(e => e.id !== id)
    }));
  },
  
  toggleRecurringExpense: (id, isActive) => {
    set(state => ({
      recurringExpenses: state.recurringExpenses.map(e => 
        e.id === id ? { ...e, isActive } : e
      )
    }));
  },
  
  // Budget item actions
  addBudgetItem: (item) => {
    const variance = item.budgetedAmount - item.actualAmount;
    const variancePercentage = item.budgetedAmount > 0 
      ? (variance / item.budgetedAmount) * 100 
      : 0;
    
    const newItem = {
      ...item,
      id: `budget-${Date.now()}`,
      variance,
      variancePercentage
    };
    
    set(state => ({
      budgetItems: [...state.budgetItems, newItem]
    }));
  },
  
  updateBudgetItem: (item) => {
    const variance = item.budgetedAmount - item.actualAmount;
    const variancePercentage = item.budgetedAmount > 0 
      ? (variance / item.budgetedAmount) * 100 
      : 0;
    
    set(state => ({
      budgetItems: state.budgetItems.map(b => 
        b.id === item.id ? { ...item, variance, variancePercentage } : b
      )
    }));
  },
  
  // UI actions
  setDateRange: (range) => set({ dateRange: range }),
  
  // Report generation
  generateReport: async (options) => {
    set({ isLoading: true });
    
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Report generated with options:', options);
      set({ isLoading: false });
    } catch (error) {
      console.error('Error generating report:', error);
      set({ isLoading: false, error: 'Failed to generate report' });
    }
  },
  
  // AI features (stubs for now)
  predictCashFlow: async (months) => {
    console.log(`Predicting cash flow for ${months} months`);
    return { prediction: 'Feature coming soon' };
  },
  
  detectAnomalies: async () => {
    console.log('Detecting anomalies');
    return { anomalies: [] };
  },
  
  suggestCostSavings: async () => {
    console.log('Suggesting cost savings');
    return { suggestions: [] };
  }
}));