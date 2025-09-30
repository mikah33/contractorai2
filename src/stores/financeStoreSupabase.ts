import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { subDays, addDays, format, parseISO, addMonths } from 'date-fns';

// Types
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
  userId?: string;
  createdAt?: string;
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
  userId?: string;
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
  userId?: string;
}

export interface BudgetItem {
  id: string;
  projectId: string;
  category: string;
  name?: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  userId?: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  totalBudget: number;
  totalActual: number;
  variance: number;
  variancePercentage: number;
  userId?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  userId?: string;
}

export interface Invoice {
  id: string;
  projectId: string;
  amount: number;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  userId?: string;
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
  // Data
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
  
  // Computed data
  financialSummary: FinancialSummary;
  
  // Actions - Receipt
  fetchReceipts: () => Promise<void>;
  addReceipt: (receipt: Omit<Receipt, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateReceipt: (receipt: Receipt) => Promise<void>;
  deleteReceipt: (id: string) => Promise<void>;
  
  // Actions - Payment
  fetchPayments: () => Promise<void>;
  addPayment: (payment: Omit<Payment, 'id' | 'userId'>) => Promise<void>;
  updatePayment: (payment: Payment) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  
  // Actions - Recurring Expense
  fetchRecurringExpenses: () => Promise<void>;
  addRecurringExpense: (expense: Omit<RecurringExpense, 'id' | 'userId'>) => Promise<void>;
  updateRecurringExpense: (expense: RecurringExpense) => Promise<void>;
  deleteRecurringExpense: (id: string) => Promise<void>;
  toggleRecurringExpense: (id: string, isActive: boolean) => Promise<void>;
  
  // Actions - Budget
  fetchBudgetItems: () => Promise<void>;
  addBudgetItem: (item: Omit<BudgetItem, 'id' | 'variance' | 'variancePercentage' | 'userId'>) => Promise<void>;
  updateBudgetItem: (item: BudgetItem) => Promise<void>;
  deleteBudgetItem: (id: string) => Promise<void>;
  
  // Actions - Projects & Clients
  fetchProjects: () => Promise<void>;
  fetchClients: () => Promise<void>;
  fetchInvoices: () => Promise<void>;
  
  // Other Actions
  setDateRange: (range: 'week' | 'month' | 'quarter' | 'year') => void;
  generateReport: (options: any) => Promise<void>;
  calculateFinancialSummary: () => void;
  
  // AI features
  predictCashFlow: (months: number) => Promise<any>;
  detectAnomalies: () => Promise<any>;
  suggestCostSavings: () => Promise<any>;
}

// Helper function to get current user
// For development, we'll use a mock user since auth isn't implemented
const getCurrentUser = async () => {
  // Check if there's a real user first
  const { data: { user }, error } = await supabase.auth.getUser();
  
  // If there's a user, return it
  if (user) return user;
  
  // Otherwise, return a mock user for development
  // You should implement proper auth later
  console.warn('No authenticated user, using mock user for development');
  return {
    id: '00000000-0000-0000-0000-000000000000', // Valid UUID format
    email: 'dev@example.com'
  };
};

// Helper to resolve project ID (handles revenue-tracker special case)
const resolveProjectId = async (projectId?: string) => {
  if (!projectId) return null;
  
  // If it's the special revenue-tracker ID, find the actual Revenue Tracker project
  if (projectId === 'revenue-tracker') {
    const { data } = await supabase
      .from('projects')
      .select('id')
      .eq('name', 'Revenue Tracker')
      .single();
    
    return data?.id || null;
  }
  
  return projectId;
};

export const useFinanceStore = create<FinanceState>((set, get) => ({
  // Initial state
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
  fetchReceipts: async () => {
    set({ isLoading: true, error: null });
    try {
      // Use new finance_expenses table
      const { data, error } = await supabase
        .from('finance_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform finance_expenses to receipt format
      const receipts = data?.map(expense => ({
        id: expense.id,
        vendor: expense.vendor || 'Unknown Vendor',
        date: expense.date || new Date().toISOString().split('T')[0],
        amount: expense.amount || 0,
        category: expense.category || 'General',
        notes: expense.notes || '',
        status: 'processed',
        projectId: null,
        userId: expense.user_id
      })) || [];

      set({ 
        receipts: receipts, 
        isLoading: false 
      });
      
      get().calculateFinancialSummary();
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addReceipt: async (receipt) => {
    set({ isLoading: true, error: null });
    try {
      const user = await getCurrentUser();
      const userId = user?.id || null;

      console.log('Adding receipt:', receipt);

      // Resolve project ID (handles revenue-tracker special case)
      const resolvedProjectId = await resolveProjectId(receipt.projectId);

      // Insert into estimates table as an expense
      const { data, error } = await supabase
        .from('finance_expenses')
        .insert({
          vendor: receipt.vendor,
          amount: receipt.amount,
          date: receipt.date,
          category: receipt.category,
          status: receipt.status || 'pending',
          notes: receipt.notes || null,
          project_id: resolvedProjectId,
          user_id: userId
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding receipt:', error);
        throw error;
      }

      console.log('Receipt added successfully:', data);

      // Transform the estimate back to receipt format for state
      const receiptData = {
        id: data.id,
        vendor: receipt.vendor,
        date: receipt.date,
        amount: receipt.amount,
        category: receipt.category,
        notes: receipt.notes || '',
        status: receipt.status || 'pending',
        projectId: receipt.projectId,
        userId: userId
      };

      set(state => ({
        receipts: [receiptData, ...state.receipts],
        isLoading: false,
        error: null
      }));
      
      get().calculateFinancialSummary();
      
      // Show success message
      alert('Expense saved successfully!');
      
    } catch (error: any) {
      console.error('Failed to add receipt:', error);
      set({ error: error.message || 'Failed to save expense', isLoading: false });
      alert(`Error saving expense: ${error.message || 'Unknown error'}`);
    }
  },

  updateReceipt: async (receipt) => {
    set({ isLoading: true, error: null });
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ error: 'User not authenticated', isLoading: false });
        return;
      }

      // Resolve project ID (handles revenue-tracker special case)
      const resolvedProjectId = await resolveProjectId(receipt.projectId);

      const { data, error } = await supabase
        .from('finance_expenses')
        .update({
          vendor: receipt.vendor,
          amount: receipt.amount,
          date: receipt.date,
          category: receipt.category,
          status: receipt.status,
          notes: receipt.notes,
          project_id: resolvedProjectId
        })
        .eq('id', receipt.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        receipts: state.receipts.map(r => r.id === receipt.id ? receipt : r),
        isLoading: false
      }));
      
      get().calculateFinancialSummary();
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteReceipt: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ error: 'User not authenticated', isLoading: false });
        return;
      }

      const { error } = await supabase
        .from('finance_expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      set(state => ({
        receipts: state.receipts.filter(r => r.id !== id),
        isLoading: false
      }));
      
      get().calculateFinancialSummary();
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Payment actions
  fetchPayments: async () => {
    set({ isLoading: true, error: null });
    try {
      // Use finance_payments table
      const { data, error } = await supabase
        .from('finance_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        throw error;
      }
      
      // Transform finance_payments to payment format
      const payments = data?.map(payment => ({
        id: payment.id,
        clientId: payment.client_name || 'Unknown',
        projectId: null,
        amount: payment.amount || 0,
        date: payment.date || new Date().toISOString().split('T')[0],
        method: payment.method || 'bank_transfer',
        status: 'completed',
        reference: payment.reference || '',
        notes: payment.notes || '',
        userId: payment.user_id
      })) || [];

      set({ 
        payments: payments, 
        isLoading: false 
      });
      
      get().calculateFinancialSummary();
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addPayment: async (payment) => {
    set({ isLoading: true, error: null });
    try {
      const user = await getCurrentUser();
      const userId = user?.id || null;

      console.log('Adding payment:', payment);
      
      // Insert into finance_payments table for payment tracking
      const { data, error } = await supabase
        .from('finance_payments')
        .insert({
          client_name: payment.clientId || 'Unknown Client',
          amount: payment.amount,
          date: payment.date,
          method: payment.method || 'bank_transfer',
          reference: payment.reference || '',
          notes: payment.notes || null,
          user_id: userId
        })
        .select()
        .single();

      if (error) throw error;

      // Transform to payment format for state
      const paymentData = {
        id: data.id,
        clientId: payment.clientId,
        projectId: payment.projectId,
        amount: payment.amount,
        date: payment.date,
        method: payment.method || 'bank_transfer',
        reference: payment.reference,
        notes: payment.notes || '',
        status: 'completed',
        userId: userId
      };

      set(state => ({
        payments: [paymentData, ...state.payments],
        isLoading: false
      }));
      
      get().calculateFinancialSummary();
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updatePayment: async (payment) => {
    set({ isLoading: true, error: null });
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ error: 'User not authenticated', isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('finance_payments')
        .update({
          client_name: payment.clientId || 'Unknown Client',
          amount: payment.amount,
          date: payment.date,
          method: payment.method || 'bank_transfer',
          reference: payment.reference || '',
          notes: payment.notes
        })
        .eq('id', payment.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        payments: state.payments.map(p => p.id === payment.id ? payment : p),
        isLoading: false
      }));
      
      get().calculateFinancialSummary();
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deletePayment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ error: 'User not authenticated', isLoading: false });
        return;
      }

      const { error } = await supabase
        .from('finance_expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      set(state => ({
        payments: state.payments.filter(p => p.id !== id),
        isLoading: false
      }));
      
      get().calculateFinancialSummary();
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Recurring expense actions
  fetchRecurringExpenses: async () => {
    set({ isLoading: true, error: null });
    try {
      // Use existing projects table as recurring expenses
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform projects to recurring expense format
      const recurringExpenses = data?.map(project => ({
        id: project.id,
        name: project.name || 'Unnamed Project',
        amount: project.budget || 0,
        category: 'Project Budget',
        frequency: 'monthly',
        nextDueDate: new Date().toISOString().split('T')[0],
        vendor: project.client_name || 'Unknown Client',
        projectId: project.id,
        isActive: project.status === 'active',
        userId: project.user_id
      })) || [];
      
      set({ 
        recurringExpenses: recurringExpenses, 
        isLoading: false 
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addRecurringExpense: async (expense) => {
    set({ isLoading: true, error: null });
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ error: 'User not authenticated', isLoading: false });
        return;
      }

      console.log('Adding recurring expense:', expense);
      
      // Insert into projects table as recurring expense project
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: expense.name,
          budget: expense.amount,
          client_name: expense.vendor,
          status: expense.isActive ? 'active' : 'inactive',
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Transform to recurring expense format for state
      const recurringData = {
        id: data.id,
        name: expense.name,
        amount: expense.amount,
        category: expense.category,
        frequency: expense.frequency,
        nextDueDate: expense.nextDueDate,
        vendor: expense.vendor,
        projectId: data.id,
        isActive: expense.isActive,
        userId: user.id
      };

      set(state => ({
        recurringExpenses: [...state.recurringExpenses, recurringData],
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateRecurringExpense: async (expense) => {
    set({ isLoading: true, error: null });
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ error: 'User not authenticated', isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .update({
          name: expense.name,
          budget: expense.amount,
          client_name: expense.vendor,
          status: expense.isActive ? 'active' : 'inactive'
        })
        .eq('id', expense.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        recurringExpenses: state.recurringExpenses.map(e => e.id === expense.id ? expense : e),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteRecurringExpense: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ error: 'User not authenticated', isLoading: false });
        return;
      }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      set(state => ({
        recurringExpenses: state.recurringExpenses.filter(e => e.id !== id),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  toggleRecurringExpense: async (id, isActive) => {
    set({ isLoading: true, error: null });
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ error: 'User not authenticated', isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .update({ status: isActive ? 'active' : 'inactive' })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        recurringExpenses: state.recurringExpenses.map(e => 
          e.id === id ? { ...e, isActive } : e
        ),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Budget actions
  fetchBudgetItems: async () => {
    set({ isLoading: true, error: null });
    try {
      // Use proper budget_items table
      const { data, error } = await supabase
        .from('budget_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching budget items:', error);
        throw error;
      }

      // Transform budget_items to our interface format
      const budgetItems = data?.map(item => ({
        id: item.id,
        projectId: item.project_id,
        category: item.category,
        name: item.name,
        budgetedAmount: item.budgeted_amount || 0,
        actualAmount: item.actual_amount || 0,
        variance: item.variance || 0,
        variancePercentage: item.variance_percentage || 0,
        userId: item.user_id
      })) || [];
      
      console.log('Fetched budget items:', budgetItems);
      
      set({ 
        budgetItems: budgetItems, 
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Error fetching budget items:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  addBudgetItem: async (item) => {
    set({ isLoading: true, error: null });
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ error: 'User not authenticated', isLoading: false });
        return;
      }

      console.log('Adding budget item:', item);

      // Insert into budget_items table
      const { data, error } = await supabase
        .from('budget_items')
        .insert({
          project_id: item.projectId,
          category: item.category,
          name: item.name || item.category,
          budgeted_amount: item.budgetedAmount,
          actual_amount: item.actualAmount,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding budget item:', error);
        throw error;
      }

      // Transform to budget item format for state
      const budgetData = {
        id: data.id,
        projectId: data.project_id,
        category: data.category,
        name: data.name,
        budgetedAmount: data.budgeted_amount,
        actualAmount: data.actual_amount,
        variance: data.variance,
        variancePercentage: data.variance_percentage,
        userId: data.user_id
      };

      console.log('Budget item added successfully:', budgetData);

      set(state => ({
        budgetItems: [budgetData, ...state.budgetItems],
        isLoading: false
      }));
    } catch (error: any) {
      console.error('Failed to add budget item:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  updateBudgetItem: async (item) => {
    set({ isLoading: true, error: null });
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ error: 'User not authenticated', isLoading: false });
        return;
      }

      console.log('Updating budget item:', item);

      const { data, error } = await supabase
        .from('budget_items')
        .update({
          category: item.category,
          name: item.name || item.category,
          budgeted_amount: item.budgetedAmount,
          actual_amount: item.actualAmount
        })
        .eq('id', item.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating budget item:', error);
        throw error;
      }

      // Transform the updated data
      const updatedItem = {
        id: data.id,
        projectId: data.project_id,
        category: data.category,
        name: data.name,
        budgetedAmount: data.budgeted_amount,
        actualAmount: data.actual_amount,
        variance: data.variance,
        variancePercentage: data.variance_percentage,
        userId: data.user_id
      };

      set(state => ({
        budgetItems: state.budgetItems.map(b => 
          b.id === item.id ? updatedItem : b
        ),
        isLoading: false
      }));
    } catch (error: any) {
      console.error('Failed to update budget item:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  deleteBudgetItem: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ error: 'User not authenticated', isLoading: false });
        return;
      }

      console.log('Deleting budget item:', id);

      const { error } = await supabase
        .from('budget_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting budget item:', error);
        throw error;
      }

      console.log('Budget item deleted successfully');

      set(state => ({
        budgetItems: state.budgetItems.filter(item => item.id !== id),
        isLoading: false
      }));
    } catch (error: any) {
      console.error('Failed to delete budget item:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Fetch projects
  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map projects to include all required fields for finance components
      const projectsWithBudget = (data || []).map(project => ({
        id: project.id,
        name: project.name,
        clientId: project.client_name || '', // Use client_name as clientId for matching
        clientName: project.client_name || '', // Store the actual client name
        totalBudget: project.budget || 0,
        totalActual: project.spent || 0,
        totalAmount: project.budget || 0, // PaymentTracker expects totalAmount
        paidAmount: project.spent || 0, // PaymentTracker expects paidAmount
        variance: (project.budget || 0) - (project.spent || 0),
        variancePercentage: project.budget ? ((project.budget - project.spent) / project.budget * 100) : 0,
        userId: project.user_id
      }));

      console.log('Fetched projects:', projectsWithBudget);

      set({ 
        projects: projectsWithBudget, 
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Fetch clients
  fetchClients: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Fetched clients:', data);
      console.log('Number of clients:', data?.length || 0);

      set({ 
        clients: data || [], 
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Fetch invoices - use estimates table for invoice data
  fetchInvoices: async () => {
    set({ isLoading: true, error: null });
    try {
      // Use estimates table to represent invoices (approved estimates can be invoices)
      const { data, error } = await supabase
        .from('finance_expenses')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform estimates to invoice format
      const invoices = data?.map(estimate => ({
        id: estimate.id,
        projectId: estimate.project_id,
        amount: estimate.total || 0,
        dueDate: estimate.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        status: 'sent', // Default status for approved estimates
        userId: estimate.user_id,
        created_at: estimate.created_at
      })) || [];

      console.log('Fetched invoices:', invoices);

      set({ 
        invoices: invoices, 
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Calculate financial summary
  calculateFinancialSummary: () => {
    const state = get();
    const { receipts, payments, invoices } = state;

    // Calculate totals
    const totalExpenses = receipts.reduce((sum, r) => sum + r.amount, 0);
    const totalRevenue = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    
    const outstandingInvoices = invoices
      .filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + i.amount, 0);

    // Get recent transactions
    const recentTransactions = [
      ...receipts.map(r => ({
        id: r.id,
        date: r.date,
        description: `Expense: ${r.vendor}`,
        amount: r.amount,
        type: 'expense' as const
      })),
      ...payments.map(p => ({
        id: p.id,
        date: p.date,
        description: `Payment received`,
        amount: p.amount,
        type: 'income' as const
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
     .slice(0, 10);

    // Calculate expenses by category
    const categoryTotals = receipts.reduce((acc, receipt) => {
      if (!acc[receipt.category]) {
        acc[receipt.category] = 0;
      }
      acc[receipt.category] += receipt.amount;
      return acc;
    }, {} as Record<string, number>);

    const expensesByCategory = Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
    }));

    set({
      financialSummary: {
        totalRevenue,
        totalExpenses,
        profit,
        profitMargin,
        outstandingInvoices,
        upcomingPayments: [],
        recentTransactions,
        monthlyData: [],
        expensesByCategory
      }
    });
  },

  // UI actions
  setDateRange: (range) => set({ dateRange: range }),

  // Report generation
  generateReport: async (options) => {
    set({ isLoading: true, error: null });
    
    try {
      console.log('Generating report with options:', options);
      const state = get();
      const { receipts, payments, projects, clients, financialSummary, recurringExpenses, budgetItems } = state;
      
      // Check if we have data
      if (!receipts && !payments && !projects) {
        console.warn('No data available for report generation');
      }
      
      // Create allTransactions array for both CSV and PDF generation
      const allTransactions = [
        ...payments.map(p => ({
          date: p.date,
          type: 'Income',
          description: `Payment #${p.id?.substring(0, 8) || 'N/A'}`,
          category: 'Payment',
          income: p.amount,
          expense: 0
        })),
        ...receipts.map(r => ({
          date: r.date,
          type: 'Expense',
          description: r.vendor,
          category: r.category,
          income: 0,
          expense: r.amount
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (options.format === 'csv') {
        // Generate comprehensive CSV data
        let csvContent = 'COMPREHENSIVE FINANCIAL REPORT\n';
        csvContent += `"Period:",="${options.dateRange.start}","to",="${options.dateRange.end}"\n\n`;
        
        // Financial Summary
        csvContent += 'FINANCIAL SUMMARY\n';
        csvContent += '"Metric","Amount"\n';
        csvContent += `"Total Revenue","$${financialSummary.totalRevenue.toFixed(2)}"\n`;
        csvContent += `"Total Expenses","$${financialSummary.totalExpenses.toFixed(2)}"\n`;
        csvContent += `"Net Profit","$${financialSummary.profit.toFixed(2)}"\n`;
        csvContent += `"Profit Margin","${financialSummary.profitMargin.toFixed(2)}%"\n\n`;
        
        // Profit & Loss Statement
        csvContent += 'PROFIT & LOSS STATEMENT\n';
        csvContent += '"Date","Type","Description","Category","Income","Expense"\n';
        
        allTransactions.forEach(t => {
          csvContent += `"${t.date}","${t.type}","${t.description}","${t.category}","$${t.income.toFixed(2)}","$${t.expense.toFixed(2)}"\n`;
        });
        csvContent += '\n';
        
        // Expense Summary by Category
        csvContent += 'EXPENSE SUMMARY BY CATEGORY\n';
        csvContent += '"Category","Total Amount","Count"\n';
        const expenseByCategory = receipts.reduce((acc, r) => {
          if (!acc[r.category]) acc[r.category] = { amount: 0, count: 0 };
          acc[r.category].amount += r.amount;
          acc[r.category].count++;
          return acc;
        }, {} as Record<string, { amount: number; count: number }>);
        
        Object.entries(expenseByCategory).forEach(([category, data]) => {
          csvContent += `"${category}","$${data.amount.toFixed(2)}","${data.count}"\n`;
        });
        csvContent += '\n';
        
        // Project Profitability
        if (projects.length > 0) {
          csvContent += 'PROJECT PROFITABILITY\n';
          csvContent += '"Project","Budget","Spent","Remaining","Profit Margin %"\n';
          projects.forEach(p => {
            const budget = p.totalBudget || p.totalAmount || 0;
            const spent = p.totalActual || p.paidAmount || 0;
            const remaining = budget - spent;
            const margin = budget ? (remaining / budget * 100) : 0;
            csvContent += `"${p.name}","$${budget.toFixed(2)}","$${spent.toFixed(2)}","$${remaining.toFixed(2)}","${margin.toFixed(2)}%"\n`;
          });
          csvContent += '\n';
        }
        
        // Recurring Expenses
        if (recurringExpenses.length > 0) {
          csvContent += 'RECURRING EXPENSES\n';
          csvContent += '"Name","Amount","Frequency","Status"\n';
          recurringExpenses.forEach(e => {
            csvContent += `"${e.name}","$${e.amount.toFixed(2)}","${e.frequency}","${e.isActive ? 'Active' : 'Inactive'}"\n`;
          });
        }
        
        // Create downloadable CSV and show for copy/paste
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `comprehensive_report_${options.dateRange.start}_${options.dateRange.end}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Create a textarea for copy/paste
        const textarea = document.createElement('textarea');
        textarea.value = csvContent;
        textarea.style.position = 'fixed';
        textarea.style.top = '50%';
        textarea.style.left = '50%';
        textarea.style.transform = 'translate(-50%, -50%)';
        textarea.style.width = '80%';
        textarea.style.height = '60%';
        textarea.style.zIndex = '9999';
        textarea.style.backgroundColor = 'white';
        textarea.style.border = '2px solid #333';
        textarea.style.padding = '10px';
        textarea.style.fontFamily = 'monospace';
        document.body.appendChild(textarea);
        textarea.select();
        
        alert('CSV Report Generated!\n\nThe file has been downloaded.\n\nThe data is also displayed in a text box - you can copy it (Ctrl+C) and paste into Excel or Google Sheets.\n\nClick OK to close the text box.');
        document.body.removeChild(textarea);
        
      } else {
        // Generate comprehensive PDF with all sections
        const { default: jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        
        const doc = new jsPDF();
        
        // Attach autoTable to the doc instance
        (doc as any).autoTable = autoTable;
        let yPos = 20;
        
        // Title Page
        doc.setFontSize(24);
        doc.text('COMPREHENSIVE FINANCIAL REPORT', 105, yPos, { align: 'center' });
        yPos += 15;
        
        doc.setFontSize(12);
        doc.text(`Period: ${options.dateRange.start} to ${options.dateRange.end}`, 105, yPos, { align: 'center' });
        yPos += 20;
        
        // Executive Summary
        doc.setFontSize(16);
        doc.text('Executive Summary', 14, yPos);
        yPos += 10;
        
        doc.setFontSize(10);
        const summaryItems = [
          `Total Revenue: $${financialSummary.totalRevenue.toLocaleString()}`,
          `Total Expenses: $${financialSummary.totalExpenses.toLocaleString()}`,
          `Net Profit: $${financialSummary.profit.toLocaleString()}`,
          `Profit Margin: ${financialSummary.profitMargin.toFixed(2)}%`
        ];
        
        summaryItems.forEach(item => {
          doc.text(item, 14, yPos);
          yPos += 7;
        });
        yPos += 10;
        
        // Section 1: Profit & Loss
        doc.setFontSize(14);
        doc.text('1. Profit & Loss Statement', 14, yPos);
        yPos += 10;
        
        const plData = allTransactions.slice(0, 15).map(t => [
          t.date,
          t.description.substring(0, 25),
          t.category,
          t.income > 0 ? `$${t.income.toFixed(2)}` : '',
          t.expense > 0 ? `$${t.expense.toFixed(2)}` : ''
        ]);
        
        doc.autoTable({
          head: [['Date', 'Description', 'Category', 'Income', 'Expense']],
          body: plData,
          startY: yPos,
          margin: { left: 14 },
          styles: { fontSize: 8 }
        });
        
        // Section 2: Expense Summary (new page)
        doc.addPage();
        yPos = 20;
        doc.setFontSize(14);
        doc.text('2. Expense Summary by Category', 14, yPos);
        yPos += 10;
        
        const expenseData = Object.entries(expenseByCategory).map(([cat, data]) => [
          cat,
          `$${data.amount.toFixed(2)}`,
          data.count.toString(),
          `$${(data.amount / data.count).toFixed(2)}`
        ]);
        
        doc.autoTable({
          head: [['Category', 'Total Amount', 'Count', 'Average']],
          body: expenseData,
          startY: yPos,
          margin: { left: 14 },
          styles: { fontSize: 9 }
        });
        
        // Section 3: Project Profitability
        if (projects.length > 0) {
          yPos = doc.lastAutoTable.finalY + 20;
          if (yPos > 240) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(14);
          doc.text('3. Project Profitability Analysis', 14, yPos);
          yPos += 10;
          
          const projectData = projects.map(p => {
            const budget = p.totalBudget || p.totalAmount || 0;
            const spent = p.totalActual || p.paidAmount || 0;
            return [
              p.name.substring(0, 30),
              `$${budget.toFixed(2)}`,
              `$${spent.toFixed(2)}`,
              `$${(budget - spent).toFixed(2)}`,
              budget ? `${((budget - spent) / budget * 100).toFixed(1)}%` : '0%'
            ];
          });
          
          doc.autoTable({
            head: [['Project', 'Budget', 'Spent', 'Remaining', 'Margin']],
            body: projectData,
            startY: yPos,
            margin: { left: 14 },
            styles: { fontSize: 9 }
          });
        }
        
        // Section 4: Recurring Expenses
        if (recurringExpenses.length > 0) {
          yPos = doc.lastAutoTable.finalY + 20;
          if (yPos > 240) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(14);
          doc.text('4. Recurring Expenses', 14, yPos);
          yPos += 10;
          
          const recurringData = recurringExpenses.map(e => [
            e.name,
            `$${e.amount.toFixed(2)}`,
            e.frequency,
            e.isActive ? 'Active' : 'Inactive'
          ]);
          
          doc.autoTable({
            head: [['Expense', 'Amount', 'Frequency', 'Status']],
            body: recurringData,
            startY: yPos,
            margin: { left: 14 },
            styles: { fontSize: 9 }
          });
        }
        
        // Save the PDF
        const fileName = `comprehensive_report_${options.dateRange.start}_${options.dateRange.end}.pdf`;
        doc.save(fileName);
      }
      
      set({ isLoading: false, error: null });
    } catch (error: any) {
      console.error('Error generating report:', error);
      const errorMessage = error.message || 'Failed to generate report';
      set({ isLoading: false, error: errorMessage });
      alert(`Error generating report: ${errorMessage}`);
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