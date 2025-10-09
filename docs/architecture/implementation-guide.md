# Invoice System Implementation Guide

## Quick Start Guide

This guide provides step-by-step instructions for implementing the invoice system in ContractorAI.

---

## Phase 1: Foundation (Week 1)

### Step 1: Database Setup

1. **Run migrations in order:**

```bash
cd /Users/mikahalbertson/git/ContractorAI/contractorai2

# Apply migrations
supabase db push

# Or manually via Supabase dashboard:
# 1. Navigate to SQL Editor
# 2. Run each migration file in order:
#    - 20250110_create_enhanced_invoices.sql
#    - 20250110_create_invoice_items.sql
#    - 20250110_create_payments.sql
#    - 20250110_create_payment_intents.sql
#    - 20250110_create_invoice_templates.sql
#    - 20250110_create_email_logs.sql
```

2. **Set up Supabase Storage:**

```sql
-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true);

-- RLS for storage
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

3. **Verify database setup:**

```sql
-- Test invoice number generation
SELECT generate_invoice_number();

-- Should return: INV-2025-00001

-- Test payment number generation
SELECT generate_payment_number();

-- Should return: PAY-2025-00001
```

### Step 2: Install Dependencies

```bash
cd /Users/mikahalbertson/git/ContractorAI/contractorai2

# Install required packages
npm install resend zod react-hook-form

# Install optional but recommended
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast

# Install dev dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom msw
```

### Step 3: Environment Variables

Update `.env` file:

```env
# Existing variables
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key

# New additions
VITE_APP_URL=http://localhost:5173
```

Create `.env.local` for server-side variables (for Edge Functions):

```env
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
RESEND_API_KEY=your_resend_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 4: Create Type Definitions

Create `src/types/invoice.ts`:

```typescript
export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;

  // Relationships
  user_id: string;
  project_id?: string;
  client_id: string;
  estimate_id?: string;

  // Financial
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;

  // Status
  status: InvoiceStatus;
  payment_status: PaymentStatus;

  // Payment terms
  payment_terms: string;
  late_fee_percentage: number;
  late_fee_amount: number;

  // Content
  notes?: string;
  terms_conditions?: string;
  footer_text?: string;

  // Email tracking
  email_sent_at?: string;
  email_opened_at?: string;
  last_reminder_sent_at?: string;
  reminder_count: number;

  // PDF
  pdf_url?: string;
  pdf_generated_at?: string;

  // Stripe
  stripe_payment_intent_id?: string;
  stripe_invoice_id?: string;

  // Metadata
  metadata?: Record<string, any>;

  // Timestamps
  created_at: string;
  updated_at: string;
  voided_at?: string;
  paid_at?: string;

  // Populated relations
  client?: Client;
  project?: Project;
  items?: InvoiceItem[];
  payments?: Payment[];
}

export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'sent'
  | 'viewed'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  user_id: string;

  item_order: number;
  description: string;
  item_type: ItemType;

  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;

  notes?: string;
  metadata?: Record<string, any>;

  created_at: string;
  updated_at: string;
}

export type ItemType = 'service' | 'material' | 'labor' | 'equipment' | 'other';

export interface CreateInvoiceInput {
  client_id: string;
  project_id?: string;
  estimate_id?: string;

  invoice_date?: string;
  due_date: string;

  payment_terms?: string;
  tax_rate?: number;

  notes?: string;
  terms_conditions?: string;
  footer_text?: string;

  items: CreateInvoiceItemInput[];
}

export interface CreateInvoiceItemInput {
  description: string;
  item_type?: ItemType;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  discount_amount?: number;
  tax_rate?: number;
  notes?: string;
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  payment_status?: PaymentStatus;
  client_id?: string;
  project_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}
```

Create `src/types/payment.ts`:

```typescript
export interface Payment {
  id: string;
  invoice_id: string;
  user_id: string;

  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;

  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  stripe_payment_method_id?: string;

  status: PaymentStatus;

  reference_number?: string;
  notes?: string;
  metadata?: Record<string, any>;

  refund_amount: number;
  refunded_at?: string;

  created_at: string;
  updated_at: string;
}

export type PaymentMethod =
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'check'
  | 'cash'
  | 'other';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export interface PaymentIntent {
  id: string;
  invoice_id: string;
  user_id: string;

  stripe_payment_intent_id: string;
  amount: number;
  currency: string;
  status: string;

  client_email: string;
  client_name: string;

  payment_method_types: string[];

  payment_url: string;
  success_url?: string;
  cancel_url?: string;

  metadata?: Record<string, any>;

  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface CreatePaymentInput {
  invoice_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date?: string;
  reference_number?: string;
  notes?: string;
}
```

### Step 5: Create Invoice Store

Create `src/stores/invoiceStore.ts`:

```typescript
import { create } from 'zustand';
import { Invoice, InvoiceFilters } from '@/types/invoice';

interface InvoiceState {
  // State
  invoices: Invoice[];
  currentInvoice: Invoice | null;
  loading: boolean;
  error: string | null;
  filters: InvoiceFilters;

  // Actions
  setInvoices: (invoices: Invoice[]) => void;
  setCurrentInvoice: (invoice: Invoice | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: InvoiceFilters) => void;
  clearFilters: () => void;

  // Computed
  filteredInvoices: () => Invoice[];
  overdueInvoices: () => Invoice[];
  totalOutstanding: () => number;
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  // Initial state
  invoices: [],
  currentInvoice: null,
  loading: false,
  error: null,
  filters: {},

  // Actions
  setInvoices: (invoices) => set({ invoices }),
  setCurrentInvoice: (currentInvoice) => set({ currentInvoice }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),

  // Computed values
  filteredInvoices: () => {
    const { invoices, filters } = get();
    let filtered = [...invoices];

    if (filters.status) {
      filtered = filtered.filter((inv) => inv.status === filters.status);
    }

    if (filters.payment_status) {
      filtered = filtered.filter(
        (inv) => inv.payment_status === filters.payment_status
      );
    }

    if (filters.client_id) {
      filtered = filtered.filter((inv) => inv.client_id === filters.client_id);
    }

    if (filters.project_id) {
      filtered = filtered.filter(
        (inv) => inv.project_id === filters.project_id
      );
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(search) ||
          inv.client?.name.toLowerCase().includes(search)
      );
    }

    return filtered;
  },

  overdueInvoices: () => {
    const { invoices } = get();
    return invoices.filter(
      (inv) => inv.status === 'overdue' && inv.payment_status !== 'paid'
    );
  },

  totalOutstanding: () => {
    const { invoices } = get();
    return invoices
      .filter((inv) => inv.payment_status !== 'paid')
      .reduce((sum, inv) => sum + inv.balance_due, 0);
  },
}));
```

---

## Phase 2: Core UI Components (Week 2)

### Step 1: Create Invoice Service

Create `src/services/invoiceService.ts`:

```typescript
import { supabase } from '@/lib/supabase';
import {
  Invoice,
  CreateInvoiceInput,
  InvoiceFilters,
} from '@/types/invoice';

class InvoiceService {
  async fetchInvoices(filters?: InvoiceFilters): Promise<Invoice[]> {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        client:clients(*),
        project:projects(*),
        items:invoice_items(*),
        payments(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.payment_status) {
      query = query.eq('payment_status', filters.payment_status);
    }

    if (filters?.client_id) {
      query = query.eq('client_id', filters.client_id);
    }

    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Invoice[];
  }

  async fetchInvoice(id: string): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(*),
        project:projects(*),
        items:invoice_items(*),
        payments(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Invoice;
  }

  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Generate invoice number
    const { data: invoiceNumber, error: numberError } = await supabase.rpc(
      'generate_invoice_number'
    );
    if (numberError) throw numberError;

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        invoice_number: invoiceNumber,
        client_id: input.client_id,
        project_id: input.project_id,
        estimate_id: input.estimate_id,
        invoice_date: input.invoice_date || new Date().toISOString(),
        due_date: input.due_date,
        payment_terms: input.payment_terms || 'net_30',
        tax_rate: input.tax_rate || 0,
        notes: input.notes,
        terms_conditions: input.terms_conditions,
        footer_text: input.footer_text,
        // Totals will be calculated by triggers
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        paid_amount: 0,
        balance_due: 0,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Create line items
    if (input.items && input.items.length > 0) {
      const items = input.items.map((item, index) => ({
        invoice_id: invoice.id,
        user_id: user.id,
        item_order: index + 1,
        description: item.description,
        item_type: item.item_type || 'service',
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage || 0,
        discount_amount: item.discount_amount || 0,
        tax_rate: item.tax_rate || input.tax_rate || 0,
        notes: item.notes,
        // Totals will be calculated by triggers
        subtotal: 0,
        tax_amount: 0,
        total: 0,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(items);

      if (itemsError) throw itemsError;
    }

    // Fetch complete invoice with items
    return this.fetchInvoice(invoice.id);
  }

  async updateInvoice(
    id: string,
    updates: Partial<Invoice>
  ): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.fetchInvoice(id);
  }

  async deleteInvoice(id: string): Promise<void> {
    const { error } = await supabase.from('invoices').delete().eq('id', id);

    if (error) throw error;
  }
}

export const invoiceService = new InvoiceService();
```

### Step 2: Create React Query Hooks

Create `src/hooks/useInvoices.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceService } from '@/services/invoiceService';
import {
  Invoice,
  CreateInvoiceInput,
  InvoiceFilters,
} from '@/types/invoice';
import { useInvoiceStore } from '@/stores/invoiceStore';

export const useInvoices = (filters?: InvoiceFilters) => {
  const setInvoices = useInvoiceStore((state) => state.setInvoices);
  const setLoading = useInvoiceStore((state) => state.setLoading);
  const setError = useInvoiceStore((state) => state.setError);

  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      setLoading(true);
      try {
        const invoices = await invoiceService.fetchInvoices(filters);
        setInvoices(invoices);
        setError(null);
        return invoices;
      } catch (error: any) {
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    staleTime: 30000, // 30 seconds
  });
};

export const useInvoice = (id: string) => {
  const setCurrentInvoice = useInvoiceStore((state) => state.setCurrentInvoice);

  return useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const invoice = await invoiceService.fetchInvoice(id);
      setCurrentInvoice(invoice);
      return invoice;
    },
    enabled: !!id,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInvoiceInput) =>
      invoiceService.createInvoice(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Invoice> }) =>
      invoiceService.updateInvoice(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', data.id] });
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoiceService.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};
```

### Step 3: Build Basic Invoice List Page

Create `src/pages/invoices/InvoiceList.tsx`:

```typescript
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Search } from 'lucide-react';
import { useInvoices } from '@/hooks/useInvoices';
import { useInvoiceStore } from '@/stores/invoiceStore';
import { InvoiceFilters } from '@/types/invoice';

export default function InvoiceList() {
  const filters = useInvoiceStore((state) => state.filters);
  const setFilters = useInvoiceStore((state) => state.setFilters);

  const { data: invoices, isLoading } = useInvoices(filters);

  const [searchTerm, setSearchTerm] = useState('');

  const handleFilterChange = (key: keyof InvoiceFilters, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  if (isLoading) {
    return <div>Loading invoices...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <Link
          to="/invoices/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Invoice # or client..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  handleFilterChange('search', e.target.value);
                }}
                className="w-full pl-10 pr-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Payment Status</label>
            <select
              value={filters.payment_status || ''}
              onChange={(e) =>
                handleFilterChange('payment_status', e.target.value || undefined)
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partially Paid</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Invoice #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoices?.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link
                    to={`/invoices/${invoice.id}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {invoice.invoice_number}
                  </Link>
                </td>
                <td className="px-6 py-4">{invoice.client?.name || '-'}</td>
                <td className="px-6 py-4">
                  {new Date(invoice.invoice_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  {new Date(invoice.due_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 font-medium">
                  ${invoice.total_amount.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      invoice.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : invoice.status === 'overdue'
                        ? 'bg-red-100 text-red-800'
                        : invoice.status === 'sent'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {invoice.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <Link
                    to={`/invoices/${invoice.id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!invoices || invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No invoices found</p>
            <Link
              to="/invoices/new"
              className="text-blue-600 hover:underline"
            >
              Create your first invoice
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

---

## Next Steps

Continue with:
1. Invoice creation form
2. PDF generation
3. Payment integration
4. Email delivery

Refer to the main architecture document for complete details on each component.
