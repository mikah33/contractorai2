import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { subDays, addDays, format, parseISO, addMonths } from 'date-fns';

// Helper function to get current user ID
const getCurrentUserId = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch (error) {
    console.log('Auth not available, using development mode');
  }
  // Return a default user ID for development
  return '00000000-0000-0000-0000-000000000000';
};

// Types
export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface ReceiptMetadata {
  receiptNumber?: string;
  taxAmount?: number;
  subtotal?: number;
  supplierAddress?: string;
  supplierPhone?: string;
  lineItems?: LineItem[];
  confidence?: {
    vendor?: number;
    amount?: number;
    date?: number;
    overall?: number;
  };
  source?: string;
}

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
  metadata?: ReceiptMetadata;
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
  startDate?: string; // When this recurring expense started (for historical tracking)
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
  clientId: string;
  estimateId?: string; // Link to original estimate if converted
  invoiceNumber?: string;
  totalAmount: number;
  paidAmount: number;
  balance: number; // totalAmount - paidAmount
  dueDate: string;
  issuedDate: string;
  status: 'draft' | 'sent' | 'outstanding' | 'partial' | 'paid' | 'overdue';
  lineItems?: LineItem[];
  notes?: string;
  payment_link?: string | null; // Stripe payment link
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'other';
  referenceNumber?: string;
  notes?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
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
  invoicePayments: InvoicePayment[];

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

  // Actions - Invoice Management
  convertEstimateToInvoice: (estimateId: string) => Promise<Invoice | null>;
  recordInvoicePayment: (invoiceId: string, payment: Omit<InvoicePayment, 'id' | 'invoiceId' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  fetchInvoicePayments: (invoiceId: string) => Promise<InvoicePayment[]>;
  updateInvoicePayment: (invoiceId: string, paymentAmount: number, status?: 'partial' | 'paid') => Promise<void>;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateInvoice: (invoice: Invoice) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;

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
  // Always return the same fixed user for development
  // This user_id matches what's already in your database
  return {
    id: '5ff28ea6-751f-4a22-b584-ca6c8a43f506', // The user_id from your session
    email: 'dev@example.com'
  };
};

// Helper to resolve project ID (handles revenue-tracker special case)
const resolveProjectId = async (projectId?: string) => {
  if (!projectId) return null;

  // If it's the special revenue-tracker ID, find the actual Revenue Tracker project
  if (projectId === 'revenue-tracker') {
    console.log('Resolving revenue-tracker to actual project ID...');
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('name', 'Revenue Tracker')
      .single();

    if (error) {
      console.error('Error resolving Revenue Tracker project:', error);
      console.log('Will use null as project_id instead');
      return null;
    }

    if (!data) {
      console.warn('Revenue Tracker project not found in database');
      console.log('Will use null as project_id instead');
      return null;
    }

    console.log('Resolved revenue-tracker to project ID:', data.id);
    return data.id;
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
  invoicePayments: [],
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
      console.log('🔍 Fetching receipts from finance_expenses...');

      // Use new finance_expenses table
      const { data, error } = await supabase
        .from('finance_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching receipts:', error);
        throw error;
      }

      console.log('📊 Raw data from finance_expenses:', data);
      console.log('📊 Number of expenses:', data?.length || 0);

      // Transform finance_expenses to receipt format
      const receipts = data?.map(expense => ({
        id: expense.id,
        vendor: expense.vendor || 'Unknown Vendor',
        date: expense.date || new Date().toISOString().split('T')[0],
        amount: expense.amount || 0,
        category: expense.category || 'General',
        notes: expense.notes || '',
        status: 'processed' as const,
        projectId: expense.project_id || null,
        userId: expense.user_id,
        metadata: expense.metadata || undefined
      })) || [];

      console.log('✅ Transformed receipts:', receipts);
      console.log('✅ Number of receipts:', receipts.length);

      set({
        receipts: receipts,
        isLoading: false
      });

      get().calculateFinancialSummary();
    } catch (error: any) {
      console.error('💥 Failed to fetch receipts:', error);
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
        console.error('Error details:', JSON.stringify(error, null, 2));
        set({ error: `Failed to save expense: ${error.message}`, isLoading: false });
        alert(`Error saving expense: ${error.message}`);
        return;
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

      // Prepare update data including metadata
      const updateData: any = {
        vendor: receipt.vendor,
        amount: receipt.amount,
        date: receipt.date,
        category: receipt.category,
        status: receipt.status,
        notes: receipt.notes,
        project_id: resolvedProjectId,
        metadata: receipt.metadata || null
      };

      const { data, error } = await supabase
        .from('finance_expenses')
        .update(updateData)
        .eq('id', receipt.id)
        .select();

      if (error) throw error;

      // Update local state
      set(state => ({
        receipts: state.receipts.map(r => r.id === receipt.id ? receipt : r),
        isLoading: false
      }));

      get().calculateFinancialSummary();
    } catch (error: any) {
      console.error('Update error:', error);
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
        projectId: payment.project_id || null,
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

      // Resolve project ID if it's revenue-tracker
      const resolvedProjectId = await resolveProjectId(payment.projectId);

      // Insert into finance_payments table for payment tracking
      const { data, error } = await supabase
        .from('finance_payments')
        .insert({
          client_name: payment.clientId || 'Unknown Client',
          project_id: resolvedProjectId, // Save the project ID
          amount: payment.amount,
          date: payment.date,
          method: payment.method || 'bank_transfer',
          reference: payment.reference || '',
          notes: payment.notes || null,
          user_id: userId
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding payment:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        set({ error: `Failed to save payment: ${error.message}`, isLoading: false });
        alert(`Error saving payment: ${error.message}`);
        return;
      }

      // Transform to payment format for state
      const paymentData = {
        id: data.id,
        clientId: payment.clientId,
        projectId: resolvedProjectId, // Use resolved project ID
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

      // Resolve project ID if it's revenue-tracker
      const resolvedProjectId = await resolveProjectId(payment.projectId);

      const { data, error } = await supabase
        .from('finance_payments')
        .update({
          client_name: payment.clientId || 'Unknown Client',
          project_id: resolvedProjectId, // Save the project ID
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
        payments: state.payments.map(p =>
          p.id === payment.id ? { ...payment, projectId: resolvedProjectId } : p
        ),
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
        .from('finance_payments')
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
      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const recurringExpenses = (data || []).map(expense => ({
        id: expense.id,
        name: expense.name,
        amount: expense.amount,
        category: expense.category,
        frequency: expense.frequency,
        nextDueDate: expense.next_due_date,
        startDate: expense.start_date || undefined,
        projectId: expense.project_id || undefined,
        vendor: expense.vendor || '',
        isActive: expense.is_active,
        userId: expense.user_id
      }));

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
      console.log('  - projectId:', expense.projectId);
      console.log('  - startDate:', expense.startDate);

      // Resolve project ID (handles revenue-tracker special case)
      const resolvedProjectId = await resolveProjectId(expense.projectId);
      console.log('  - resolvedProjectId:', resolvedProjectId);

      // Insert into recurring_expenses table
      const { data, error } = await supabase
        .from('recurring_expenses')
        .insert({
          name: expense.name,
          amount: expense.amount,
          category: expense.category,
          frequency: expense.frequency,
          next_due_date: expense.nextDueDate,
          start_date: expense.startDate || null,
          project_id: resolvedProjectId,
          vendor: expense.vendor || '',
          is_active: expense.isActive,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding recurring expense:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        set({ error: `Failed to save recurring expense: ${error.message}`, isLoading: false });
        alert(`Error saving recurring expense: ${error.message}`);
        return;
      }

      // Transform to recurring expense format for state
      const recurringData = {
        id: data.id,
        name: expense.name,
        amount: expense.amount,
        category: expense.category,
        frequency: expense.frequency,
        nextDueDate: data.next_due_date,
        startDate: data.start_date || undefined,
        projectId: resolvedProjectId || undefined,
        vendor: expense.vendor || '',
        isActive: data.is_active,
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

      // Resolve project ID (handles revenue-tracker special case)
      const resolvedProjectId = await resolveProjectId(expense.projectId);

      const { data, error } = await supabase
        .from('recurring_expenses')
        .update({
          name: expense.name,
          amount: expense.amount,
          category: expense.category,
          frequency: expense.frequency,
          next_due_date: expense.nextDueDate,
          start_date: expense.startDate || null,
          project_id: resolvedProjectId,
          vendor: expense.vendor || '',
          is_active: expense.isActive
        })
        .eq('id', expense.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        recurringExpenses: state.recurringExpenses.map(e =>
          e.id === expense.id ? expense : e
        ),
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
        .from('recurring_expenses')
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
        .from('recurring_expenses')
        .update({ is_active: isActive })
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
      // Fetch all projects from database
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Just use all projects - don't filter
      const projectsData = data || [];

      // Map projects to include all required fields for finance components
      const projectsWithBudget = projectsData.map(project => ({
        id: project.id,
        name: project.name,
        clientId: project.client_id ? project.client_id : null, // Preserve actual UUID or set to null
        clientName: project.client_name || 'Unknown Client', // Store the actual client name for display
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
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const invoices = data?.map(inv => ({
        id: inv.id,
        projectId: inv.project_id,
        clientId: inv.client_id,
        estimateId: inv.estimate_id,
        invoiceNumber: inv.invoice_number,
        totalAmount: inv.total_amount,
        paidAmount: inv.paid_amount,
        balance: inv.balance,
        dueDate: inv.due_date,
        issuedDate: inv.issued_date,
        status: inv.status,
        lineItems: inv.line_items,
        notes: inv.notes,
        payment_link: inv.payment_link,
        userId: inv.user_id,
        createdAt: inv.created_at,
        updatedAt: inv.updated_at
      })) || [];

      set({
        invoices: invoices,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Convert estimate to invoice
  convertEstimateToInvoice: async (estimateId: string) => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();

      // Fetch the estimate
      const { data: estimateData, error: estimateError } = await supabase
        .from('estimates')
        .select('*')
        .eq('id', estimateId)
        .eq('user_id', userId)
        .single();

      if (estimateError) throw estimateError;
      if (!estimateData) throw new Error('Estimate not found');

      // Create invoice from estimate
      const invoiceNumber = `INV-${Date.now()}`;
      const dueDate = addDays(new Date(), 30).toISOString().split('T')[0]; // 30 days from now

      const newInvoice = {
        project_id: estimateData.project_id,
        client_id: estimateData.client_id,
        estimate_id: estimateId,
        invoice_number: invoiceNumber,
        total_amount: estimateData.total,
        paid_amount: 0,
        balance: estimateData.total,
        due_date: dueDate,
        issued_date: new Date().toISOString().split('T')[0],
        status: 'outstanding',
        line_items: estimateData.items,
        notes: estimateData.notes,
        user_id: userId
      };

      const { data, error } = await supabase
        .from('invoices')
        .insert([newInvoice])
        .select()
        .single();

      if (error) throw error;

      // Update estimate to mark it as converted to invoice
      await supabase
        .from('estimates')
        .update({
          status: 'approved',
          converted_to_invoice: true,
          invoice_id: data.id
        })
        .eq('id', estimateId);

      const invoice: Invoice = {
        id: data.id,
        projectId: data.project_id,
        clientId: data.client_id,
        estimateId: data.estimate_id,
        invoiceNumber: data.invoice_number,
        totalAmount: data.total_amount,
        paidAmount: data.paid_amount,
        balance: data.balance,
        dueDate: data.due_date,
        issuedDate: data.issued_date,
        status: data.status,
        lineItems: data.line_items,
        notes: data.notes,
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      set((state) => ({
        invoices: [invoice, ...state.invoices],
        isLoading: false
      }));

      // Refresh financial summary
      get().calculateFinancialSummary();

      return invoice;
    } catch (error: any) {
      console.error('Error converting estimate to invoice:', error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  // Update invoice payment
  updateInvoicePayment: async (invoiceId: string, paymentAmount: number, status?: 'partial' | 'paid') => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();

      // Get current invoice
      const { data: invoiceData, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;
      if (!invoiceData) throw new Error('Invoice not found');

      const newPaidAmount = invoiceData.paid_amount + paymentAmount;
      const newBalance = invoiceData.total_amount - newPaidAmount;

      let newStatus = status;
      if (!newStatus) {
        newStatus = newBalance <= 0 ? 'paid' : 'partial';
      }

      const { error } = await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (error) throw error;

      set((state) => ({
        invoices: state.invoices.map((inv) =>
          inv.id === invoiceId
            ? {
                ...inv,
                paidAmount: newPaidAmount,
                balance: newBalance,
                status: newStatus as any,
                updatedAt: new Date().toISOString()
              }
            : inv
        ),
        isLoading: false
      }));

      // Refresh financial summary
      get().calculateFinancialSummary();
    } catch (error: any) {
      console.error('Error updating invoice payment:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Add invoice
  addInvoice: async (invoice: Omit<Invoice, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          project_id: invoice.projectId,
          client_id: invoice.clientId,
          estimate_id: invoice.estimateId,
          invoice_number: invoice.invoiceNumber,
          total_amount: invoice.totalAmount,
          paid_amount: invoice.paidAmount,
          balance: invoice.balance,
          due_date: invoice.dueDate,
          issued_date: invoice.issuedDate,
          status: invoice.status,
          line_items: invoice.lineItems,
          notes: invoice.notes,
          user_id: userId
        }])
        .select()
        .single();

      if (error) throw error;

      const newInvoice: Invoice = {
        id: data.id,
        projectId: data.project_id,
        clientId: data.client_id,
        estimateId: data.estimate_id,
        invoiceNumber: data.invoice_number,
        totalAmount: data.total_amount,
        paidAmount: data.paid_amount,
        balance: data.balance,
        dueDate: data.due_date,
        issuedDate: data.issued_date,
        status: data.status,
        lineItems: data.line_items,
        notes: data.notes,
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      set((state) => ({
        invoices: [newInvoice, ...state.invoices],
        isLoading: false
      }));

      get().calculateFinancialSummary();
    } catch (error: any) {
      console.error('Error adding invoice:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Update invoice
  updateInvoice: async (invoice: Invoice) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          project_id: invoice.projectId,
          client_id: invoice.clientId,
          invoice_number: invoice.invoiceNumber,
          total_amount: invoice.totalAmount,
          paid_amount: invoice.paidAmount,
          balance: invoice.balance,
          due_date: invoice.dueDate,
          issued_date: invoice.issuedDate,
          status: invoice.status,
          line_items: invoice.lineItems,
          notes: invoice.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      if (error) throw error;

      set((state) => ({
        invoices: state.invoices.map((inv) =>
          inv.id === invoice.id ? { ...invoice, updatedAt: new Date().toISOString() } : inv
        ),
        isLoading: false
      }));

      get().calculateFinancialSummary();
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Delete invoice
  deleteInvoice: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        invoices: state.invoices.filter((inv) => inv.id !== id),
        isLoading: false
      }));

      get().calculateFinancialSummary();
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Record invoice payment with history tracking
  recordInvoicePayment: async (invoiceId: string, payment: Omit<InvoicePayment, 'id' | 'invoiceId' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();

      // Get current invoice
      const { data: invoiceData, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;
      if (!invoiceData) throw new Error('Invoice not found');

      // Record payment transaction in invoice_payments table
      const { data: paymentData, error: paymentError } = await supabase
        .from('invoice_payments')
        .insert([{
          invoice_id: invoiceId,
          amount: payment.amount,
          payment_date: payment.paymentDate,
          payment_method: payment.paymentMethod,
          reference_number: payment.referenceNumber,
          notes: payment.notes,
          user_id: userId
        }])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Also create a Payment record for revenue tracking
      const { data: revenuePayment, error: revenueError } = await supabase
        .from('finance_payments')
        .insert([{
          client_name: invoiceData.client_id || 'Unknown Client',
          amount: payment.amount,
          date: payment.paymentDate,
          method: payment.paymentMethod || 'other',
          reference: payment.referenceNumber || '',
          notes: payment.notes || `Payment for invoice ${invoiceData.invoice_number}`,
          user_id: userId
        }])
        .select()
        .single();

      if (revenueError) throw revenueError;

      // Calculate new totals
      const newPaidAmount = invoiceData.paid_amount + payment.amount;
      const newBalance = invoiceData.total_amount - newPaidAmount;
      const newStatus = newBalance <= 0 ? 'paid' : 'partial';

      // Update invoice
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (updateError) throw updateError;

      // Update local state
      set((state) => ({
        invoices: state.invoices.map((inv) =>
          inv.id === invoiceId
            ? {
                ...inv,
                paidAmount: newPaidAmount,
                balance: newBalance,
                status: newStatus as any,
                updatedAt: new Date().toISOString()
              }
            : inv
        ),
        invoicePayments: [...state.invoicePayments, {
          id: paymentData.id,
          invoiceId: paymentData.invoice_id,
          amount: paymentData.amount,
          paymentDate: paymentData.payment_date,
          paymentMethod: paymentData.payment_method,
          referenceNumber: paymentData.reference_number,
          notes: paymentData.notes,
          userId: paymentData.user_id,
          createdAt: paymentData.created_at,
          updatedAt: paymentData.updated_at
        }],
        payments: [...state.payments, {
          id: revenuePayment.id,
          clientId: revenuePayment.client_id,
          projectId: revenuePayment.project_id,
          amount: revenuePayment.amount,
          date: revenuePayment.date,
          method: revenuePayment.method,
          reference: revenuePayment.reference,
          notes: revenuePayment.notes,
          status: revenuePayment.status,
          invoiceId: revenuePayment.invoice_id,
          userId: revenuePayment.user_id
        }],
        isLoading: false
      }));

      get().calculateFinancialSummary();
    } catch (error: any) {
      console.error('Error recording invoice payment:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Fetch invoice payment history
  fetchInvoicePayments: async (invoiceId: string) => {
    try {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from('invoice_payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .eq('user_id', userId)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      const payments = data?.map(p => ({
        id: p.id,
        invoiceId: p.invoice_id,
        amount: p.amount,
        paymentDate: p.payment_date,
        paymentMethod: p.payment_method,
        referenceNumber: p.reference_number,
        notes: p.notes,
        userId: p.user_id,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      })) || [];

      return payments;
    } catch (error: any) {
      console.error('Error fetching invoice payments:', error);
      return [];
    }
  },

  // Calculate financial summary
  calculateFinancialSummary: () => {
    const state = get();
    const { receipts, payments, invoices, recurringExpenses, budgetItems } = state;

    // Note: Employee and contractor payments should be fetched separately
    // and stored in state. For now, we'll skip these to avoid infinite loops.
    // TODO: Add fetchEmployeePayments() and fetchContractorPayments() methods
    const employeePaymentsTotal = 0;
    const contractorPaymentsTotal = 0;

    // Calculate monthly recurring cost
    const monthlyRecurringCost = recurringExpenses
      .filter(e => e.isActive)
      .reduce((sum, e) => {
        switch (e.frequency) {
          case 'weekly': return sum + (e.amount * 4.33);
          case 'monthly': return sum + e.amount;
          case 'quarterly': return sum + (e.amount / 3);
          case 'yearly': return sum + (e.amount / 12);
          default: return sum + e.amount;
        }
      }, 0);

    // Calculate ALL expense components for accurate profit tracking
    // 1. Direct Expenses: Receipts (materials, equipment, direct costs)
    const directExpenses = receipts.reduce((sum, r) => sum + r.amount, 0);

    // 2. Labor Costs: Employee and contractor payments
    const laborCosts = employeePaymentsTotal + contractorPaymentsTotal;

    // 3. Operating Expenses: Monthly recurring (prorated)
    const operatingExpenses = monthlyRecurringCost;

    // 4. Budget Actuals: Include actual amounts from budget items
    const budgetActuals = budgetItems.reduce((sum, b) => sum + (b.actualAmount || 0), 0);

    // Calculate TOTAL EXPENSES (all categories combined)
    const totalExpenses = directExpenses + laborCosts + operatingExpenses + budgetActuals;

    // Calculate TOTAL REVENUE (completed payments only)
    const totalRevenue = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    // Calculate PROFIT and MARGIN
    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    console.log('💰 Financial Summary Calculation:');
    console.log('  Direct Expenses (receipts):', directExpenses);
    console.log('  Labor Costs (payroll):', laborCosts);
    console.log('  Operating Expenses (recurring):', operatingExpenses);
    console.log('  Budget Actuals:', budgetActuals);
    console.log('  TOTAL EXPENSES:', totalExpenses);
    console.log('  TOTAL REVENUE:', totalRevenue);
    console.log('  NET PROFIT:', profit);

    // Calculate outstanding invoices using balance (unpaid amount)
    const outstandingInvoices = invoices
      .filter(i => i.status === 'outstanding' || i.status === 'partial' || i.status === 'overdue')
      .reduce((sum, i) => sum + (i.balance || 0), 0);

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

    // Calculate upcoming payments from recurring expenses
    const upcomingPayments = recurringExpenses
      .filter(e => e.isActive)
      .map(e => ({
        amount: e.amount,
        dueDate: e.nextDueDate,
        projectName: 'Recurring Expense',
        clientName: e.vendor || e.name
      }))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);

    // Calculate monthly data for last 6 months
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthRevenue = payments
        .filter(p => {
          const pDate = new Date(p.date);
          return pDate >= monthStart && pDate <= monthEnd;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      // Calculate ALL monthly expenses (not just receipts)
      const monthReceipts = receipts
        .filter(r => {
          const rDate = new Date(r.date);
          return rDate >= monthStart && rDate <= monthEnd;
        })
        .reduce((sum, r) => sum + r.amount, 0);

      // Add prorated recurring expenses for this month
      const monthRecurring = recurringExpenses
        .filter(e => e.isActive)
        .reduce((sum, e) => {
          switch (e.frequency) {
            case 'weekly': return sum + (e.amount * 4.33);
            case 'monthly': return sum + e.amount;
            case 'quarterly': return sum + (e.amount / 3);
            case 'yearly': return sum + (e.amount / 12);
            default: return sum + e.amount;
          }
        }, 0);

      // Add budget actuals for projects in this month
      const monthBudgetActuals = budgetItems
        .filter(b => b.actualAmount > 0)
        .reduce((sum, b) => sum + (b.actualAmount / 6), 0); // Distribute evenly across 6 months

      const monthExpenses = monthReceipts + monthRecurring + monthBudgetActuals;

      monthlyData.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue,
        expenses: monthExpenses
      });
    }

    console.log('📊 Monthly data calculated:', monthlyData);
    console.log('  Total payments:', payments.length);
    console.log('  Total receipts:', receipts.length);

    set({
      financialSummary: {
        totalRevenue,
        totalExpenses,
        profit,
        profitMargin,
        outstandingInvoices,
        upcomingPayments,
        recentTransactions,
        monthlyData,
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
      
      // Filter data by report type (whole vs project-based)
      const isProjectReport = options.type === 'project' && options.projectId;

      // Filter receipts, budgetItems, recurringExpenses, payments based on report type
      const filteredReceipts = isProjectReport
        ? receipts.filter(r => r.projectId === options.projectId)
        : receipts;

      const filteredBudgetItems = isProjectReport
        ? budgetItems.filter(b => b.projectId === options.projectId)
        : budgetItems;

      const filteredRecurringExpenses = isProjectReport
        ? recurringExpenses.filter(e => e.projectId === options.projectId)
        : recurringExpenses;

      const filteredPayments = isProjectReport
        ? payments.filter(p => p.projectId === options.projectId)
        : payments;

      // Create allTransactions array including ALL expense types
      const allTransactions = [
        // Payments (Income)
        ...filteredPayments.map(p => ({
          date: p.date,
          type: 'Income',
          description: `Payment #${p.id?.substring(0, 8) || 'N/A'}`,
          category: 'Payment',
          income: p.amount,
          expense: 0,
          source: 'payment'
        })),
        // Receipts (Expenses)
        ...filteredReceipts.map(r => ({
          date: r.date,
          type: 'Expense',
          description: r.vendor,
          category: r.category,
          income: 0,
          expense: r.amount,
          source: 'receipt'
        })),
        // Budget Items (Planned Expenses)
        ...filteredBudgetItems.map(b => ({
          date: new Date().toISOString().split('T')[0], // Current date for budget items
          type: 'Budget',
          description: `${b.category} - Budget Item`,
          category: b.category,
          income: 0,
          expense: b.actual || 0,
          source: 'budget'
        })),
        // Recurring Expenses
        ...filteredRecurringExpenses.filter(e => e.isActive).map(e => ({
          date: e.nextDueDate || new Date().toISOString().split('T')[0],
          type: 'Recurring',
          description: `${e.name} (${e.frequency})`,
          category: e.category,
          income: 0,
          expense: e.amount,
          source: 'recurring'
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate expense summary by category (ALL expense sources)
      const expenseByCategory = allTransactions
        .filter(t => t.expense > 0)
        .reduce((acc, t) => {
          if (!acc[t.category]) acc[t.category] = { amount: 0, count: 0 };
          acc[t.category].amount += t.expense;
          acc[t.category].count++;
          return acc;
        }, {} as Record<string, { amount: number; count: number }>);

      // Determine report title based on type
      const reportTitle = options.type === 'project'
        ? `PROJECT-BASED FINANCIAL REPORT${options.projectId ? ` - Project ${options.projectId.substring(0, 8)}` : ''}`
        : 'WHOLE COMPANY FINANCIAL REPORT';

      if (options.format === 'csv') {
        // Generate CSV data
        let csvContent = `${reportTitle}\n`;
        csvContent += `"Report Type:","${options.type === 'whole' ? 'All Company Expenses' : 'Project-Specific'}"\n`;
        csvContent += `"Period:",="${options.dateRange.start}","to",="${options.dateRange.end}"\n\n`;
        
        // Financial Summary
        csvContent += 'FINANCIAL SUMMARY\n';
        csvContent += '"Metric","Amount"\n';
        csvContent += `"Total Revenue","$${financialSummary.totalRevenue.toFixed(2)}"\n`;
        csvContent += `"Total Expenses","$${financialSummary.totalExpenses.toFixed(2)}"\n`;
        csvContent += `"Net Profit","$${financialSummary.profit.toFixed(2)}"\n`;
        csvContent += `"Profit Margin","${financialSummary.profitMargin.toFixed(2)}%"\n\n`;
        
        // All Transactions (Receipts, Budget, Recurring, Payments)
        csvContent += 'ALL TRANSACTIONS (Receipts + Budget Items + Recurring Expenses + Payments)\n';
        csvContent += '"Date","Type","Description","Category","Income","Expense","Source"\n';

        allTransactions.forEach(t => {
          csvContent += `"${t.date}","${t.type}","${t.description}","${t.category}","$${t.income.toFixed(2)}","$${t.expense.toFixed(2)}","${t.source}"\n`;
        });
        csvContent += '\n';
        
        // Expense Summary by Category
        csvContent += 'EXPENSE SUMMARY BY CATEGORY\n';
        csvContent += '"Category","Total Amount","Count"\n';

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
        
        // Budget Items Detail
        if (filteredBudgetItems.length > 0) {
          csvContent += '\n';
          csvContent += 'BUDGET ITEMS DETAIL\n';
          csvContent += '"Category","Planned","Actual","Variance","Variance %"\n';
          filteredBudgetItems.forEach(b => {
            csvContent += `"${b.category}","$${b.budgetedAmount.toFixed(2)}","$${b.actualAmount.toFixed(2)}","$${b.variance.toFixed(2)}","${b.variancePercentage.toFixed(2)}%"\n`;
          });
        }

        // Recurring Expenses Detail
        if (filteredRecurringExpenses.length > 0) {
          csvContent += '\n';
          csvContent += 'RECURRING EXPENSES DETAIL\n';
          csvContent += '"Name","Amount","Category","Frequency","Next Due","Status"\n';
          filteredRecurringExpenses.forEach(e => {
            csvContent += `"${e.name}","$${e.amount.toFixed(2)}","${e.category}","${e.frequency}","${e.nextDueDate}","${e.isActive ? 'Active' : 'Inactive'}"\n`;
          });
        }
        
        // Create downloadable CSV and show for copy/paste
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const reportType = options.type === 'whole' ? 'whole_company' : 'project';
        link.setAttribute('download', `${reportType}_report_${options.dateRange.start}_${options.dateRange.end}.csv`);
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
        // Generate PDF with all sections
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;

        const doc = new jsPDF();
        let yPos = 20;

        // Title Page
        doc.setFontSize(24);
        const pdfTitle = options.type === 'whole' ? 'WHOLE COMPANY REPORT' : 'PROJECT-BASED REPORT';
        doc.text(pdfTitle, 105, yPos, { align: 'center' });
        yPos += 10;

        doc.setFontSize(10);
        const reportTypeText = options.type === 'whole' ? 'All Company Expenses' : 'Project-Specific Expenses';
        doc.text(reportTypeText, 105, yPos, { align: 'center' });
        yPos += 10;

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

        // Section 1: All Transactions (including source)
        doc.setFontSize(14);
        doc.text('1. All Transactions (Receipts + Budget + Recurring + Payments)', 14, yPos);
        yPos += 10;

        const plData = allTransactions.slice(0, 20).map(t => [
          t.date,
          t.type,
          t.description.substring(0, 20),
          t.category.substring(0, 15),
          t.income > 0 ? `$${t.income.toFixed(2)}` : '',
          t.expense > 0 ? `$${t.expense.toFixed(2)}` : '',
          t.source
        ]);

        autoTable(doc, {
          head: [['Date', 'Type', 'Description', 'Category', 'Income', 'Expense', 'Source']],
          body: plData,
          startY: yPos,
          margin: { left: 14 },
          styles: { fontSize: 7 }
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
        
        autoTable(doc, {
          head: [['Category', 'Total Amount', 'Count', 'Average']],
          body: expenseData,
          startY: yPos,
          margin: { left: 14 },
          styles: { fontSize: 9 }
        });

        // Section 3: Project Profitability
        if (projects.length > 0) {
          yPos = (doc as any).lastAutoTable.finalY + 20;
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
          
          autoTable(doc, {
            head: [['Project', 'Budget', 'Spent', 'Remaining', 'Margin']],
            body: projectData,
            startY: yPos,
            margin: { left: 14 },
            styles: { fontSize: 9 }
          });
        }

        // Section 4: Budget Items Detail
        if (filteredBudgetItems.length > 0) {
          yPos = (doc as any).lastAutoTable.finalY + 20;
          if (yPos > 240) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(14);
          doc.text('4. Budget Items Detail', 14, yPos);
          yPos += 10;

          const budgetData = filteredBudgetItems.map(b => [
            b.category,
            `$${b.budgetedAmount.toFixed(2)}`,
            `$${b.actualAmount.toFixed(2)}`,
            `$${b.variance.toFixed(2)}`,
            `${b.variancePercentage.toFixed(1)}%`
          ]);

          autoTable(doc, {
            head: [['Category', 'Planned', 'Actual', 'Variance', 'Variance %']],
            body: budgetData,
            startY: yPos,
            margin: { left: 14 },
            styles: { fontSize: 9 }
          });
        }

        // Section 5: Recurring Expenses Detail
        if (filteredRecurringExpenses.length > 0) {
          yPos = (doc as any).lastAutoTable.finalY + 20;
          if (yPos > 240) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(14);
          doc.text('5. Recurring Expenses Detail', 14, yPos);
          yPos += 10;

          const recurringData = filteredRecurringExpenses.map(e => [
            e.name,
            `$${e.amount.toFixed(2)}`,
            e.category,
            e.frequency,
            e.nextDueDate || 'N/A',
            e.isActive ? 'Active' : 'Inactive'
          ]);

          autoTable(doc, {
            head: [['Name', 'Amount', 'Category', 'Frequency', 'Next Due', 'Status']],
            body: recurringData,
            startY: yPos,
            margin: { left: 14 },
            styles: { fontSize: 8 }
          });
        }
        
        // Save the PDF
        const reportType = options.type === 'whole' ? 'whole_company' : 'project';
        const fileName = `${reportType}_report_${options.dateRange.start}_${options.dateRange.end}.pdf`;
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