# Invoice System Architecture - ContractorAI

## Executive Summary

This document outlines the comprehensive architecture for implementing a production-ready invoice system into the ContractorAI application. The system will enable contractors to create, send, track, and manage customer invoices with payment processing, PDF generation, and email delivery capabilities.

**Key Technologies:**
- Frontend: React 18 + TypeScript + Zustand + React Query
- Backend: Supabase (PostgreSQL + Auth + Storage)
- Payments: Stripe Payment Intents
- PDF: jsPDF + jspdf-autotable (already installed)
- Email: Resend (recommended) or SendGrid
- File Storage: Supabase Storage

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer (React)                      │
├─────────────────────────────────────────────────────────────────┤
│  Invoice Pages    │  Components     │  State (Zustand)          │
│  - InvoiceList    │  - InvoiceForm  │  - invoiceStore          │
│  - InvoiceCreate  │  - InvoiceCard  │  - paymentStore          │
│  - InvoiceDetail  │  - PaymentForm  │  - clientsStore (exists) │
│  - InvoiceEdit    │  - PDFViewer    │  - projectStore (exists) │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (React Query)                     │
├─────────────────────────────────────────────────────────────────┤
│  Queries          │  Mutations      │  Background Jobs          │
│  - fetchInvoices  │  - createInv    │  - sendEmail             │
│  - fetchPayments  │  - updateInv    │  - generatePDF           │
│  - fetchMetrics   │  - deleteInv    │  - processPayment        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Service Layer (Business Logic)                 │
├─────────────────────────────────────────────────────────────────┤
│  invoiceService   │  pdfService     │  emailService            │
│  paymentService   │  stripeService  │  notificationService     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer (Supabase)                         │
├─────────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL)    │  Storage        │  Auth             │
│  - invoices               │  - PDFs         │  - RLS Policies   │
│  - invoice_items          │  - Attachments  │  - User Context   │
│  - payments               │                 │                   │
│  - payment_intents        │                 │                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
├─────────────────────────────────────────────────────────────────┤
│  Stripe API       │  Email Provider │  Analytics               │
│  - Payments       │  - Resend       │  - Tracking              │
│  - Subscriptions  │  - Templates    │  - Reporting             │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow Diagram

```
┌──────────────┐
│  Contractor  │
└──────┬───────┘
       │ Create Invoice
       ↓
┌──────────────────────┐
│  Invoice Form        │
│  - Client Selection  │
│  - Line Items        │
│  - Payment Terms     │
└──────┬───────────────┘
       │ Submit
       ↓
┌──────────────────────┐
│  Invoice Store       │
│  - Validate          │
│  - Calculate Totals  │
└──────┬───────────────┘
       │
       ├──→ Save to Database
       │
       ├──→ Generate PDF
       │    └──→ Upload to Storage
       │
       ├──→ Create Stripe Payment Intent
       │
       └──→ Send Email to Customer
            └──→ Include Payment Link
                 └──→ Track Email Status

┌──────────────┐
│   Customer   │
└──────┬───────┘
       │ Receive Email
       ↓
┌──────────────────────┐
│  Payment Page        │
│  - Invoice Details   │
│  - Stripe Checkout   │
└──────┬───────────────┘
       │ Complete Payment
       ↓
┌──────────────────────┐
│  Webhook Handler     │
│  - Update Invoice    │
│  - Record Payment    │
│  - Send Receipt      │
└──────┬───────────────┘
       │
       └──→ Notify Contractor
```

### 1.3 Component Structure

```
src/
├── pages/
│   └── invoices/
│       ├── InvoiceList.tsx          (Main invoice management page)
│       ├── InvoiceCreate.tsx        (Create new invoice)
│       ├── InvoiceEdit.tsx          (Edit existing invoice)
│       ├── InvoiceDetail.tsx        (View invoice details)
│       ├── InvoicePayment.tsx       (Public payment page)
│       └── InvoiceAnalytics.tsx     (Reporting dashboard)
│
├── components/
│   └── invoices/
│       ├── InvoiceForm.tsx          (Reusable form component)
│       ├── InvoiceCard.tsx          (Invoice summary card)
│       ├── InvoiceTable.tsx         (Tabular invoice list)
│       ├── InvoiceStatusBadge.tsx   (Status indicator)
│       ├── LineItemsEditor.tsx      (Line items management)
│       ├── PaymentForm.tsx          (Stripe payment form)
│       ├── PaymentHistory.tsx       (Payment records display)
│       ├── InvoicePDFViewer.tsx     (PDF preview component)
│       ├── InvoiceFilters.tsx       (Filter and search)
│       ├── InvoiceMetrics.tsx       (Key metrics display)
│       └── EmailPreview.tsx         (Email template preview)
│
├── stores/
│   ├── invoiceStore.ts              (Invoice state management)
│   └── paymentStore.ts              (Payment state management)
│
├── services/
│   ├── invoiceService.ts            (Invoice CRUD operations)
│   ├── paymentService.ts            (Payment processing)
│   ├── pdfService.ts                (PDF generation)
│   ├── emailService.ts              (Email delivery)
│   └── stripeService.ts             (Stripe integration)
│
├── hooks/
│   ├── useInvoices.ts               (Invoice queries)
│   ├── useInvoiceForm.ts            (Form state)
│   ├── usePayments.ts               (Payment queries)
│   └── useInvoiceMetrics.ts         (Analytics)
│
├── types/
│   ├── invoice.ts                   (Invoice types)
│   └── payment.ts                   (Payment types)
│
└── utils/
    ├── invoiceCalculations.ts       (Business calculations)
    ├── invoiceValidation.ts         (Validation logic)
    ├── invoiceFormatters.ts         (Display formatting)
    └── invoiceNumberGenerator.ts    (Invoice number logic)
```

---

## 2. Database Schema

### 2.1 Enhanced Invoice Schema

```sql
-- Enhanced invoices table (extends existing)
CREATE TABLE public.invoices (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Invoice Identification
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,

    -- Relationships
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT,
    estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,

    -- Financial Data
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    balance_due DECIMAL(12, 2) NOT NULL,

    -- Status and Tracking
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'refunded')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),

    -- Payment Terms
    payment_terms TEXT DEFAULT 'net_30',
    late_fee_percentage DECIMAL(5, 2) DEFAULT 0,
    late_fee_amount DECIMAL(12, 2) DEFAULT 0,

    -- Content
    notes TEXT,
    terms_conditions TEXT,
    footer_text TEXT,

    -- Email Tracking
    email_sent_at TIMESTAMP WITH TIME ZONE,
    email_opened_at TIMESTAMP WITH TIME ZONE,
    last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
    reminder_count INTEGER DEFAULT 0,

    -- PDF Storage
    pdf_url TEXT,
    pdf_generated_at TIMESTAMP WITH TIME ZONE,

    -- Stripe Integration
    stripe_payment_intent_id TEXT,
    stripe_invoice_id TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    voided_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Invoice Line Items
CREATE TABLE public.invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Item Details
    item_order INTEGER NOT NULL,
    description TEXT NOT NULL,
    item_type TEXT DEFAULT 'service'
        CHECK (item_type IN ('service', 'material', 'labor', 'equipment', 'other')),

    -- Pricing
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL,

    -- Additional Info
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Payments Table
CREATE TABLE public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Payment Details
    payment_number TEXT UNIQUE NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method TEXT NOT NULL
        CHECK (payment_method IN ('credit_card', 'debit_card', 'bank_transfer', 'check', 'cash', 'other')),

    -- Stripe Integration
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_charge_id TEXT,
    stripe_payment_method_id TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded')),

    -- Additional Info
    reference_number TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Refund Info
    refund_amount DECIMAL(12, 2) DEFAULT 0,
    refunded_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Payment Intents (for Stripe integration)
CREATE TABLE public.payment_intents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Stripe Details
    stripe_payment_intent_id TEXT UNIQUE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT NOT NULL,

    -- Client Info
    client_email TEXT,
    client_name TEXT,

    -- Payment Details
    payment_method_types TEXT[] DEFAULT ARRAY['card'],

    -- URLs
    payment_url TEXT,
    success_url TEXT,
    cancel_url TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Invoice Templates (for recurring patterns)
CREATE TABLE public.invoice_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Template Info
    template_name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,

    -- Template Content
    payment_terms TEXT DEFAULT 'net_30',
    terms_conditions TEXT,
    footer_text TEXT,
    notes TEXT,

    -- Default Settings
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    late_fee_percentage DECIMAL(5, 2) DEFAULT 0,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Email Logs
CREATE TABLE public.invoice_email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Email Details
    email_type TEXT NOT NULL
        CHECK (email_type IN ('invoice_sent', 'payment_reminder', 'payment_received', 'payment_failed')),
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),

    -- Tracking
    email_provider_id TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,

    -- Error Handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 2.2 Indexes for Performance

```sql
-- Invoices Indexes
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_payment_status ON public.invoices(payment_status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_invoices_invoice_date ON public.invoices(invoice_date);
CREATE INDEX idx_invoices_stripe_payment_intent ON public.invoices(stripe_payment_intent_id);

-- Invoice Items Indexes
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_user_id ON public.invoice_items(user_id);

-- Payments Indexes
CREATE INDEX idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX idx_payments_stripe_payment_intent ON public.payments(stripe_payment_intent_id);

-- Payment Intents Indexes
CREATE INDEX idx_payment_intents_invoice_id ON public.payment_intents(invoice_id);
CREATE INDEX idx_payment_intents_stripe_id ON public.payment_intents(stripe_payment_intent_id);

-- Email Logs Indexes
CREATE INDEX idx_email_logs_invoice_id ON public.invoice_email_logs(invoice_id);
CREATE INDEX idx_email_logs_user_id ON public.invoice_email_logs(user_id);
CREATE INDEX idx_email_logs_status ON public.invoice_email_logs(status);
```

### 2.3 Database Functions

```sql
-- Auto-update invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate balance due
    NEW.balance_due = NEW.total_amount - NEW.paid_amount;

    -- Update payment status
    IF NEW.paid_amount = 0 THEN
        NEW.payment_status = 'unpaid';
    ELSIF NEW.paid_amount >= NEW.total_amount THEN
        NEW.payment_status = 'paid';
        NEW.paid_at = COALESCE(NEW.paid_at, NOW());
    ELSE
        NEW.payment_status = 'partial';
    END IF;

    -- Auto-update status based on dates and payment
    IF NEW.payment_status = 'paid' THEN
        NEW.status = 'paid';
    ELSIF NEW.due_date < CURRENT_DATE AND NEW.payment_status != 'paid' THEN
        NEW.status = 'overdue';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_totals_trigger
    BEFORE INSERT OR UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_totals();

-- Auto-update invoice when payment is added
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'succeeded' THEN
        UPDATE public.invoices
        SET
            paid_amount = paid_amount + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.invoice_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_update_invoice_trigger
    AFTER INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_on_payment();

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_prefix TEXT;
BEGIN
    year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1
    INTO next_number
    FROM public.invoices
    WHERE invoice_number LIKE 'INV-' || year_prefix || '-%';

    RETURN 'INV-' || year_prefix || '-' || LPAD(next_number::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
```

### 2.4 Row Level Security Policies

```sql
-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_email_logs ENABLE ROW LEVEL SECURITY;

-- Invoice Policies
CREATE POLICY "Users can view own invoices"
    ON public.invoices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
    ON public.invoices FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
    ON public.invoices FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
    ON public.invoices FOR DELETE
    USING (auth.uid() = user_id);

-- Similar policies for other tables
-- (invoice_items, payments, payment_intents, etc.)
```

---

## 3. Feature Set

### 3.1 Core Features (MVP - Phase 1)

**Invoice Management:**
- Create new invoices from scratch
- Create invoices from estimates
- Edit draft invoices
- Delete draft invoices
- Duplicate invoices
- View invoice details
- List all invoices with filtering

**Line Items:**
- Add/edit/remove line items
- Support for services, materials, labor
- Quantity and unit price
- Automatic subtotal calculation
- Item reordering

**Customer Management:**
- Select client from existing clients
- Auto-populate client details
- Client contact information display

**Basic Calculations:**
- Subtotal calculation
- Tax calculation (single rate)
- Total calculation
- Balance due tracking

**PDF Generation:**
- Generate professional PDF invoices
- Download PDF
- Preview PDF before sending
- Professional template with branding

**Invoice Status:**
- Draft
- Sent
- Paid
- Overdue
- Cancelled

### 3.2 Enhanced Features (Phase 2)

**Payment Processing:**
- Stripe payment integration
- Credit/debit card payments
- Payment link generation
- Payment tracking
- Payment history

**Email Delivery:**
- Send invoice via email
- Customizable email templates
- Email tracking (sent, opened)
- Automated payment reminders

**Advanced Calculations:**
- Multiple tax rates
- Discount support (percentage or fixed)
- Late fees
- Partial payments

**Invoice Customization:**
- Custom invoice templates
- Logo upload
- Color scheme customization
- Custom fields
- Payment terms configuration

**Reporting:**
- Revenue by period
- Outstanding invoices
- Payment trends
- Client payment history
- Tax reports

### 3.3 Advanced Features (Phase 3)

**Recurring Invoices:**
- Set up recurring billing schedules
- Automatic invoice generation
- Subscription management

**Multi-Currency:**
- Support for multiple currencies
- Currency conversion
- Multi-currency reporting

**Advanced Payment Options:**
- ACH/Bank transfers
- Multiple payment methods
- Payment plans
- Deposit/down payment handling

**Automation:**
- Automated payment reminders
- Overdue notifications
- Thank you emails
- Auto-generate from recurring schedules

**Advanced Reporting:**
- Aging reports
- Forecast revenue
- Customer lifetime value
- Export to accounting software

**Mobile Features:**
- Mobile-optimized invoice view
- Mobile payment experience
- Push notifications

---

## 4. Technical Implementation

### 4.1 State Management Architecture

**Invoice Store (Zustand):**

```typescript
// src/stores/invoiceStore.ts
interface InvoiceState {
  // State
  invoices: Invoice[];
  currentInvoice: Invoice | null;
  loading: boolean;
  error: string | null;
  filters: InvoiceFilters;

  // Actions
  fetchInvoices: () => Promise<void>;
  fetchInvoice: (id: string) => Promise<Invoice>;
  createInvoice: (data: CreateInvoiceInput) => Promise<Invoice>;
  updateInvoice: (id: string, data: UpdateInvoiceInput) => Promise<Invoice>;
  deleteInvoice: (id: string) => Promise<void>;
  sendInvoice: (id: string, email: EmailOptions) => Promise<void>;
  generatePDF: (id: string) => Promise<string>;
  recordPayment: (id: string, payment: PaymentInput) => Promise<Payment>;

  // Computed
  overdueInvoices: () => Invoice[];
  totalOutstanding: () => number;
  revenueByMonth: () => Record<string, number>;
}
```

### 4.2 API Layer (React Query)

```typescript
// src/hooks/useInvoices.ts
export const useInvoices = (filters?: InvoiceFilters) => {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => invoiceService.fetchInvoices(filters),
    staleTime: 30000, // 30 seconds
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: invoiceService.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const useSendInvoice = () => {
  return useMutation({
    mutationFn: ({ id, options }: { id: string; options: EmailOptions }) =>
      invoiceService.sendInvoice(id, options),
  });
};
```

### 4.3 Service Layer

**Invoice Service:**

```typescript
// src/services/invoiceService.ts
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

    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    // Generate invoice number
    const { data: invoiceNumber } = await supabase
      .rpc('generate_invoice_number');

    // Create invoice
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        ...input,
        invoice_number: invoiceNumber,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Create line items
    if (input.items?.length) {
      await this.createInvoiceItems(data.id, input.items);
    }

    return data;
  }

  async sendInvoice(id: string, options: EmailOptions): Promise<void> {
    const invoice = await this.fetchInvoice(id);

    // Generate PDF
    const pdfUrl = await pdfService.generateInvoicePDF(invoice);

    // Create payment intent
    const paymentIntent = await stripeService.createPaymentIntent(invoice);

    // Send email
    await emailService.sendInvoiceEmail({
      invoice,
      pdfUrl,
      paymentLink: paymentIntent.payment_url,
      ...options,
    });

    // Update invoice status
    await this.updateInvoice(id, {
      status: 'sent',
      email_sent_at: new Date().toISOString(),
      pdf_url: pdfUrl,
      stripe_payment_intent_id: paymentIntent.stripe_payment_intent_id,
    });
  }
}

export const invoiceService = new InvoiceService();
```

**PDF Service:**

```typescript
// src/services/pdfService.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';

class PDFService {
  async generateInvoicePDF(invoice: Invoice): Promise<string> {
    const doc = new jsPDF();

    // Add company logo
    if (invoice.user.company_logo) {
      const logoImg = await this.loadImage(invoice.user.company_logo);
      doc.addImage(logoImg, 'PNG', 20, 10, 40, 20);
    }

    // Header
    doc.setFontSize(28);
    doc.setTextColor(0, 0, 0);
    doc.text('INVOICE', 150, 25);

    // Invoice details
    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoice.invoice_number}`, 150, 35);
    doc.text(`Date: ${format(invoice.invoice_date, 'MMM dd, yyyy')}`, 150, 42);
    doc.text(`Due Date: ${format(invoice.due_date, 'MMM dd, yyyy')}`, 150, 49);

    // Bill from
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('From:', 20, 45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(invoice.user.company_name || 'Your Company', 20, 52);
    doc.text(invoice.user.email, 20, 59);
    if (invoice.user.phone) doc.text(invoice.user.phone, 20, 66);

    // Bill to
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, 80);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(invoice.client.name, 20, 87);
    doc.text(invoice.client.email, 20, 94);
    if (invoice.client.phone) doc.text(invoice.client.phone, 20, 101);
    if (invoice.client.address) doc.text(invoice.client.address, 20, 108);

    // Line items table
    autoTable(doc, {
      startY: 120,
      head: [['Description', 'Qty', 'Rate', 'Amount']],
      body: invoice.items.map(item => [
        item.description,
        item.quantity.toString(),
        `$${item.unit_price.toFixed(2)}`,
        `$${item.total.toFixed(2)}`
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
      },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
      },
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.text('Subtotal:', 140, finalY);
    doc.text(`$${invoice.subtotal.toFixed(2)}`, 185, finalY, { align: 'right' });

    if (invoice.tax_amount > 0) {
      doc.text(`Tax (${invoice.tax_rate}%):`, 140, finalY + 7);
      doc.text(`$${invoice.tax_amount.toFixed(2)}`, 185, finalY + 7, { align: 'right' });
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total:', 140, finalY + 14);
    doc.text(`$${invoice.total_amount.toFixed(2)}`, 185, finalY + 14, { align: 'right' });

    if (invoice.paid_amount > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Paid:', 140, finalY + 21);
      doc.text(`$${invoice.paid_amount.toFixed(2)}`, 185, finalY + 21, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.text('Balance Due:', 140, finalY + 28);
      doc.text(`$${invoice.balance_due.toFixed(2)}`, 185, finalY + 28, { align: 'right' });
    }

    // Notes
    if (invoice.notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Notes:', 20, finalY + 40);
      const splitNotes = doc.splitTextToSize(invoice.notes, 170);
      doc.text(splitNotes, 20, finalY + 47);
    }

    // Terms & Conditions
    if (invoice.terms_conditions) {
      const termsY = invoice.notes ? finalY + 70 : finalY + 40;
      doc.setFont('helvetica', 'bold');
      doc.text('Terms & Conditions:', 20, termsY);
      doc.setFont('helvetica', 'normal');
      const splitTerms = doc.splitTextToSize(invoice.terms_conditions, 170);
      doc.text(splitTerms, 20, termsY + 7);
    }

    // Generate blob and upload
    const blob = doc.output('blob');
    return await this.uploadPDF(blob, invoice.invoice_number);
  }

  private async uploadPDF(blob: Blob, invoiceNumber: string): Promise<string> {
    const fileName = `invoices/${invoiceNumber}-${Date.now()}.pdf`;

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, blob, {
        contentType: 'application/pdf',
        cacheControl: '3600',
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  private async loadImage(url: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = url;
    });
  }
}

export const pdfService = new PDFService();
```

**Stripe Service:**

```typescript
// src/services/stripeService.ts
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

class StripeService {
  async createPaymentIntent(invoice: Invoice) {
    // Call Supabase Edge Function to create payment intent
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        invoice_id: invoice.id,
        amount: Math.round(invoice.balance_due * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          invoice_number: invoice.invoice_number,
          client_id: invoice.client_id,
        },
      },
    });

    if (error) throw error;

    // Save payment intent
    await supabase.from('payment_intents').insert({
      invoice_id: invoice.id,
      stripe_payment_intent_id: data.payment_intent_id,
      amount: invoice.balance_due,
      currency: 'usd',
      status: data.status,
      payment_url: data.payment_url,
      client_email: invoice.client.email,
      client_name: invoice.client.name,
    });

    return data;
  }

  async processPayment(paymentIntentId: string, paymentMethodId: string) {
    const stripe = await stripePromise;
    if (!stripe) throw new Error('Stripe not loaded');

    const { error } = await stripe.confirmCardPayment(paymentIntentId, {
      payment_method: paymentMethodId,
    });

    if (error) throw error;
  }
}

export const stripeService = new StripeService();
```

**Email Service:**

```typescript
// src/services/emailService.ts
class EmailService {
  async sendInvoiceEmail({
    invoice,
    pdfUrl,
    paymentLink,
    recipientEmail,
    customMessage,
  }: SendInvoiceOptions): Promise<void> {
    // Call Supabase Edge Function
    const { error } = await supabase.functions.invoke('send-invoice-email', {
      body: {
        to: recipientEmail || invoice.client.email,
        invoice_number: invoice.invoice_number,
        invoice_amount: invoice.total_amount,
        due_date: invoice.due_date,
        pdf_url: pdfUrl,
        payment_link: paymentLink,
        custom_message: customMessage,
        company_name: invoice.user.company_name,
      },
    });

    if (error) throw error;

    // Log email
    await supabase.from('invoice_email_logs').insert({
      invoice_id: invoice.id,
      email_type: 'invoice_sent',
      recipient_email: recipientEmail || invoice.client.email,
      subject: `Invoice ${invoice.invoice_number} from ${invoice.user.company_name}`,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
  }

  async sendPaymentReminder(invoice: Invoice): Promise<void> {
    // Similar implementation for payment reminders
  }

  async sendPaymentConfirmation(invoice: Invoice, payment: Payment): Promise<void> {
    // Similar implementation for payment confirmations
  }
}

export const emailService = new EmailService();
```

### 4.4 Supabase Edge Functions

**Create Payment Intent:**

```typescript
// supabase/functions/create-payment-intent/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  try {
    const { invoice_id, amount, currency, metadata } = await req.json();

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        invoice_id,
        ...metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Generate payment URL
    const paymentUrl = `${Deno.env.get('APP_URL')}/invoice/${invoice_id}/pay`;

    return new Response(
      JSON.stringify({
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        status: paymentIntent.status,
        payment_url: paymentUrl,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

**Send Invoice Email:**

```typescript
// supabase/functions/send-invoice-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  try {
    const {
      to,
      invoice_number,
      invoice_amount,
      due_date,
      pdf_url,
      payment_link,
      custom_message,
      company_name,
    } = await req.json();

    // Using Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${company_name} <invoices@yourapp.com>`,
        to: [to],
        subject: `Invoice ${invoice_number} from ${company_name}`,
        html: `
          <h2>Invoice ${invoice_number}</h2>
          <p>Thank you for your business!</p>
          <p><strong>Amount Due:</strong> $${invoice_amount.toFixed(2)}</p>
          <p><strong>Due Date:</strong> ${new Date(due_date).toLocaleDateString()}</p>
          ${custom_message ? `<p>${custom_message}</p>` : ''}
          <p>
            <a href="${payment_link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Pay Invoice
            </a>
          </p>
          <p>
            <a href="${pdf_url}">Download Invoice PDF</a>
          </p>
        `,
      }),
    });

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

**Stripe Webhook Handler:**

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature!, webhookSecret!);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;

        // Get payment intent record
        const { data: intent } = await supabase
          .from('payment_intents')
          .select('*')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (intent) {
          // Create payment record
          const { data: payment } = await supabase
            .from('payments')
            .insert({
              invoice_id: intent.invoice_id,
              user_id: intent.user_id,
              amount: paymentIntent.amount / 100,
              payment_method: 'credit_card',
              stripe_payment_intent_id: paymentIntent.id,
              stripe_charge_id: paymentIntent.latest_charge,
              status: 'succeeded',
              payment_number: `PAY-${Date.now()}`,
            })
            .select()
            .single();

          // Update payment intent status
          await supabase
            .from('payment_intents')
            .update({ status: 'succeeded' })
            .eq('id', intent.id);

          // Send payment confirmation email
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-payment-confirmation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({
              invoice_id: intent.invoice_id,
              payment_id: payment.id,
            }),
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;

        // Update payment intent status
        await supabase
          .from('payment_intents')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        // Could send failure notification here
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 5. Implementation Roadmap

### Phase 1: MVP Foundation (2-3 weeks)

**Week 1: Database & Core Backend**
- [ ] Create database migrations
- [ ] Set up RLS policies
- [ ] Create Supabase Edge Functions
- [ ] Implement invoice number generation
- [ ] Set up basic Stripe integration

**Week 2: UI Components & State**
- [ ] Create invoice store (Zustand)
- [ ] Build InvoiceForm component
- [ ] Build LineItemsEditor component
- [ ] Build InvoiceList page
- [ ] Build InvoiceDetail page
- [ ] Implement PDF generation

**Week 3: Integration & Testing**
- [ ] Connect UI to backend
- [ ] Implement invoice CRUD operations
- [ ] Test PDF generation
- [ ] Basic email functionality
- [ ] End-to-end testing

**Deliverables:**
- Working invoice creation
- PDF generation and download
- Basic list and detail views
- Draft status management

### Phase 2: Payment & Communication (2-3 weeks)

**Week 4: Payment Integration**
- [ ] Complete Stripe payment flow
- [ ] Build payment page
- [ ] Implement webhook handler
- [ ] Payment recording system
- [ ] Payment status updates

**Week 5: Email System**
- [ ] Set up Resend/email provider
- [ ] Create email templates
- [ ] Implement send invoice
- [ ] Email tracking system
- [ ] Payment reminders

**Week 6: Enhanced Features**
- [ ] Invoice templates
- [ ] Discount support
- [ ] Tax calculations
- [ ] Invoice customization
- [ ] Status automation

**Deliverables:**
- Complete payment processing
- Email delivery system
- Payment tracking
- Enhanced invoice features

### Phase 3: Advanced Features (2-3 weeks)

**Week 7: Analytics & Reporting**
- [ ] Build analytics dashboard
- [ ] Revenue reports
- [ ] Aging reports
- [ ] Client payment history
- [ ] Tax reports

**Week 8: Automation**
- [ ] Recurring invoices
- [ ] Automated reminders
- [ ] Overdue automation
- [ ] Bulk operations
- [ ] Template management

**Week 9: Polish & Optimization**
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Accessibility improvements
- [ ] Error handling
- [ ] User documentation

**Deliverables:**
- Analytics dashboard
- Automated workflows
- Recurring billing
- Production-ready system

---

## 6. Integration with Existing App

### 6.1 Navigation Integration

**Update App.tsx:**

```typescript
// Add invoice routes
import InvoiceList from './pages/invoices/InvoiceList';
import InvoiceCreate from './pages/invoices/InvoiceCreate';
import InvoiceEdit from './pages/invoices/InvoiceEdit';
import InvoiceDetail from './pages/invoices/InvoiceDetail';
import InvoicePayment from './pages/invoices/InvoicePayment';

// In routes
<Route path="/invoices" element={<InvoiceList />} />
<Route path="/invoices/new" element={<InvoiceCreate />} />
<Route path="/invoices/:id" element={<InvoiceDetail />} />
<Route path="/invoices/:id/edit" element={<InvoiceEdit />} />
<Route path="/invoice/:id/pay" element={<InvoicePayment />} /> {/* Public route */}
```

**Update navigation menu:**

```typescript
// Add to main navigation
{
  name: 'Invoices',
  path: '/invoices',
  icon: FileText,
  badge: overdueCount > 0 ? overdueCount : undefined,
}
```

### 6.2 Client Integration

The invoice system will leverage the existing `clientsStore` to avoid duplication:

```typescript
// Use existing clients
import { useClientsStore } from '@/stores/clientsStore';

const InvoiceForm = () => {
  const clients = useClientsStore((state) => state.clients);

  // Client selector in form
  <select name="client_id">
    {clients.map(client => (
      <option key={client.id} value={client.id}>
        {client.name}
      </option>
    ))}
  </select>
};
```

### 6.3 Project Integration

Link invoices to projects from `projectStore`:

```typescript
// Optional project linking
import { useProjectStore } from '@/stores/projectStore';

const InvoiceForm = () => {
  const projects = useProjectStore((state) => state.projects);

  // Optional project selector
  <select name="project_id" optional>
    <option value="">No project</option>
    {projects.map(project => (
      <option key={project.id} value={project.id}>
        {project.name}
      </option>
    ))}
  </select>
};
```

### 6.4 Estimate Conversion

Convert estimates to invoices:

```typescript
// In EstimateGenerator page
const convertToInvoice = async (estimate: Estimate) => {
  const invoice = await invoiceService.createFromEstimate(estimate.id);
  navigate(`/invoices/${invoice.id}`);
};

// In invoiceService
async createFromEstimate(estimateId: string): Promise<Invoice> {
  const estimate = await estimateService.fetchEstimate(estimateId);

  return this.createInvoice({
    client_id: estimate.client_id,
    project_id: estimate.project_id,
    estimate_id: estimateId,
    items: estimate.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      item_type: item.type,
    })),
    due_date: addDays(new Date(), 30).toISOString(),
  });
}
```

### 6.5 Dashboard Integration

Add invoice metrics to existing Dashboard:

```typescript
// In Dashboard.tsx
import { useInvoiceMetrics } from '@/hooks/useInvoiceMetrics';

const Dashboard = () => {
  const metrics = useInvoiceMetrics();

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Existing metrics */}

      {/* New invoice metrics */}
      <MetricCard
        title="Outstanding Invoices"
        value={`$${metrics.totalOutstanding.toLocaleString()}`}
        change={metrics.outstandingChange}
        icon={FileText}
      />

      <MetricCard
        title="Overdue Invoices"
        value={metrics.overdueCount}
        change={metrics.overdueChange}
        icon={AlertCircle}
        variant="warning"
      />
    </div>
  );
};
```

### 6.6 Settings Integration

Add invoice settings to existing Settings page:

```typescript
// In Settings.tsx
const Settings = () => {
  return (
    <Tabs>
      {/* Existing tabs */}

      <Tab label="Invoice Settings">
        <InvoiceSettingsForm />
      </Tab>
    </Tabs>
  );
};

// InvoiceSettingsForm
const InvoiceSettingsForm = () => {
  return (
    <form>
      <h3>Invoice Configuration</h3>

      <Input
        label="Company Name"
        name="company_name"
      />

      <Input
        label="Default Payment Terms"
        name="payment_terms"
        type="select"
        options={[
          { value: 'due_on_receipt', label: 'Due on Receipt' },
          { value: 'net_15', label: 'Net 15' },
          { value: 'net_30', label: 'Net 30' },
          { value: 'net_60', label: 'Net 60' },
        ]}
      />

      <Input
        label="Default Tax Rate (%)"
        name="tax_rate"
        type="number"
      />

      <Input
        label="Invoice Footer"
        name="invoice_footer"
        type="textarea"
      />

      <FileUpload
        label="Company Logo"
        name="company_logo"
        accept="image/*"
      />
    </form>
  );
};
```

---

## 7. Technology Stack Recommendations

### 7.1 Core Technologies (Already in place)

**Frontend:**
- React 18.3.1 ✅
- TypeScript ✅
- Vite ✅
- TailwindCSS ✅
- React Router ✅

**State Management:**
- Zustand 4.5.2 ✅
- React Query 5.28.4 ✅

**Backend:**
- Supabase ✅
- PostgreSQL ✅

**Payments:**
- Stripe ✅

### 7.2 Additional Dependencies Needed

**PDF Generation:**
- jsPDF 3.0.2 ✅ (already installed)
- jspdf-autotable 5.0.2 ✅ (already installed)

**Email Service:**
```bash
# Choose one:
npm install resend  # Recommended - modern, developer-friendly
# OR
npm install @sendgrid/mail  # Alternative - more established
```

**Date Handling:**
- date-fns 3.3.1 ✅ (already installed)

**Form Validation:**
```bash
npm install zod  # Type-safe schema validation
npm install react-hook-form  # Form state management
```

**UI Components:**
```bash
# Optional but recommended
npm install @radix-ui/react-dialog
npm install @radix-ui/react-dropdown-menu
npm install @radix-ui/react-select
npm install @radix-ui/react-tabs
npm install @radix-ui/react-toast
```

### 7.3 Development Tools

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D msw  # Mock Service Worker for API mocking
```

### 7.4 Environment Variables

```env
# Existing
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLIC_KEY=

# New additions needed
VITE_APP_URL=https://yourapp.com
STRIPE_SECRET_KEY=  # Server-side only (Edge Functions)
STRIPE_WEBHOOK_SECRET=  # Server-side only
RESEND_API_KEY=  # Server-side only (Edge Functions)
```

---

## 8. File Structure

```
contractorai2/
├── src/
│   ├── pages/
│   │   └── invoices/
│   │       ├── InvoiceList.tsx
│   │       ├── InvoiceCreate.tsx
│   │       ├── InvoiceEdit.tsx
│   │       ├── InvoiceDetail.tsx
│   │       ├── InvoicePayment.tsx
│   │       └── InvoiceAnalytics.tsx
│   │
│   ├── components/
│   │   └── invoices/
│   │       ├── InvoiceForm.tsx
│   │       ├── InvoiceCard.tsx
│   │       ├── InvoiceTable.tsx
│   │       ├── InvoiceStatusBadge.tsx
│   │       ├── LineItemsEditor.tsx
│   │       ├── LineItemRow.tsx
│   │       ├── PaymentForm.tsx
│   │       ├── PaymentHistory.tsx
│   │       ├── InvoicePDFViewer.tsx
│   │       ├── InvoiceFilters.tsx
│   │       ├── InvoiceMetrics.tsx
│   │       ├── EmailPreview.tsx
│   │       ├── SendInvoiceDialog.tsx
│   │       ├── RecordPaymentDialog.tsx
│   │       └── InvoiceTemplateSelector.tsx
│   │
│   ├── stores/
│   │   ├── invoiceStore.ts
│   │   └── paymentStore.ts
│   │
│   ├── services/
│   │   ├── invoiceService.ts
│   │   ├── paymentService.ts
│   │   ├── pdfService.ts
│   │   ├── emailService.ts
│   │   └── stripeService.ts
│   │
│   ├── hooks/
│   │   ├── useInvoices.ts
│   │   ├── useInvoice.ts
│   │   ├── useCreateInvoice.ts
│   │   ├── useUpdateInvoice.ts
│   │   ├── useDeleteInvoice.ts
│   │   ├── useSendInvoice.ts
│   │   ├── useInvoiceForm.ts
│   │   ├── usePayments.ts
│   │   ├── useRecordPayment.ts
│   │   └── useInvoiceMetrics.ts
│   │
│   ├── types/
│   │   ├── invoice.ts
│   │   └── payment.ts
│   │
│   └── utils/
│       ├── invoiceCalculations.ts
│       ├── invoiceValidation.ts
│       ├── invoiceFormatters.ts
│       └── invoiceNumberGenerator.ts
│
├── supabase/
│   ├── migrations/
│   │   ├── 20250110_create_enhanced_invoices.sql
│   │   ├── 20250110_create_invoice_items.sql
│   │   ├── 20250110_create_payments.sql
│   │   ├── 20250110_create_payment_intents.sql
│   │   ├── 20250110_create_invoice_templates.sql
│   │   └── 20250110_create_email_logs.sql
│   │
│   └── functions/
│       ├── create-payment-intent/
│       │   └── index.ts
│       ├── send-invoice-email/
│       │   └── index.ts
│       ├── send-payment-confirmation/
│       │   └── index.ts
│       └── stripe-webhook/
│           └── index.ts
│
└── docs/
    └── architecture/
        └── invoice-system-architecture.md
```

---

## 9. Architecture Decision Records (ADRs)

### ADR-001: Use Zustand over Redux for State Management

**Context:** Need to manage invoice state across the application.

**Decision:** Use Zustand (already in use in the app) instead of Redux.

**Rationale:**
- Already used in the codebase (consistency)
- Simpler API with less boilerplate
- Better TypeScript support
- Smaller bundle size
- Easier to integrate with React Query

**Consequences:**
- Consistent state management pattern across app
- Easier onboarding for developers
- Less code to maintain

### ADR-002: Use React Query for Server State

**Context:** Need to manage server-side data fetching, caching, and synchronization.

**Decision:** Use React Query (already installed) for all server state.

**Rationale:**
- Already in use in the app
- Automatic caching and background refetching
- Built-in loading and error states
- Optimistic updates support
- Request deduplication

**Consequences:**
- Separation of server state (React Query) from client state (Zustand)
- Improved UX with automatic background updates
- Reduced boilerplate for API calls

### ADR-003: Use jsPDF for PDF Generation

**Context:** Need to generate PDF invoices.

**Decision:** Use jsPDF with jspdf-autotable (already installed) for client-side PDF generation.

**Alternatives Considered:**
- Server-side generation (Puppeteer, wkhtmltopdf)
- React-PDF
- PDFKit

**Rationale:**
- Already installed in the project
- Client-side generation reduces server load
- Good TypeScript support
- Flexible styling with autotable
- No server dependencies

**Consequences:**
- PDFs generated in browser
- Upload to Supabase Storage for persistence
- Faster generation (no server round-trip)
- Potential issues with very complex layouts (acceptable for invoices)

### ADR-004: Use Resend for Email Delivery

**Context:** Need to send invoice emails to customers.

**Decision:** Use Resend as the email service provider.

**Alternatives Considered:**
- SendGrid
- AWS SES
- Mailgun
- Postmark

**Rationale:**
- Modern, developer-friendly API
- Great deliverability rates
- Generous free tier (3,000 emails/month)
- React email templates support
- Built-in analytics
- Good documentation

**Consequences:**
- Need to add Resend dependency
- Configure DNS records for custom domain
- Store API key in environment variables
- Implement email templates

### ADR-005: Store PDFs in Supabase Storage

**Context:** Need to store generated PDF files.

**Decision:** Use Supabase Storage for PDF file storage.

**Alternatives Considered:**
- AWS S3
- Cloudinary
- Store as base64 in database

**Rationale:**
- Already using Supabase
- RLS policies for security
- CDN for fast delivery
- No additional service needed
- Integrated with existing auth

**Consequences:**
- Set up storage bucket
- Configure RLS policies
- Handle file uploads in service layer
- Manage storage quota

### ADR-006: Use Stripe Payment Intents for Payments

**Context:** Need to accept online payments for invoices.

**Decision:** Use Stripe Payment Intents API with client-side integration.

**Rationale:**
- Stripe already integrated in the app
- Payment Intents provide strong authentication (SCA compliance)
- Flexible payment methods support
- Good error handling
- Built-in fraud prevention
- Excellent documentation

**Consequences:**
- Need webhook handling for async payment confirmations
- Store payment intent IDs for reconciliation
- Implement webhook verification
- Handle payment failures gracefully

### ADR-007: Implement Invoice Number Generation in Database

**Context:** Need unique, sequential invoice numbers.

**Decision:** Use PostgreSQL function for invoice number generation.

**Alternatives Considered:**
- Client-side generation
- UUID-based numbers
- External service

**Rationale:**
- Ensures uniqueness with database constraints
- Sequential numbering per year
- Atomic operation (no race conditions)
- Can't be manipulated client-side
- Simple to implement

**Consequences:**
- Database function required
- Format: INV-YYYY-XXXXX
- Need migration for function

### ADR-008: Use Row Level Security for Authorization

**Context:** Need to ensure users can only access their own invoices.

**Decision:** Use Supabase Row Level Security (RLS) policies.

**Rationale:**
- Database-level security
- Can't be bypassed from client
- Consistent with existing app patterns
- Automatic enforcement
- Simple policy syntax

**Consequences:**
- RLS policies required for all tables
- Performance considerations (minimal)
- Testing RLS policies needed

---

## 10. Testing Strategy

### 10.1 Unit Tests

**Store Tests:**
```typescript
// src/stores/__tests__/invoiceStore.test.ts
describe('invoiceStore', () => {
  it('should create invoice', async () => {
    const store = useInvoiceStore.getState();
    const invoice = await store.createInvoice(mockInvoiceData);
    expect(invoice).toBeDefined();
    expect(invoice.invoice_number).toMatch(/INV-\d{4}-\d{5}/);
  });

  it('should calculate totals correctly', () => {
    const total = calculateInvoiceTotal(mockLineItems);
    expect(total).toBe(1000);
  });
});
```

**Service Tests:**
```typescript
// src/services/__tests__/invoiceService.test.ts
describe('invoiceService', () => {
  it('should fetch invoices', async () => {
    const invoices = await invoiceService.fetchInvoices();
    expect(Array.isArray(invoices)).toBe(true);
  });

  it('should handle errors', async () => {
    await expect(
      invoiceService.fetchInvoice('invalid-id')
    ).rejects.toThrow();
  });
});
```

### 10.2 Integration Tests

```typescript
// src/pages/invoices/__tests__/InvoiceList.test.tsx
describe('InvoiceList', () => {
  it('should display invoices', async () => {
    render(<InvoiceList />);

    await waitFor(() => {
      expect(screen.getByText('INV-2025-00001')).toBeInTheDocument();
    });
  });

  it('should filter by status', async () => {
    render(<InvoiceList />);

    const filter = screen.getByLabelText('Status');
    fireEvent.change(filter, { target: { value: 'paid' } });

    await waitFor(() => {
      expect(screen.queryByText('INV-2025-00001')).not.toBeInTheDocument();
    });
  });
});
```

### 10.3 E2E Tests (Optional)

```typescript
// Using Playwright or Cypress
describe('Invoice Flow', () => {
  it('should create and send invoice', () => {
    cy.visit('/invoices/new');

    // Fill form
    cy.get('[name="client_id"]').select('Test Client');
    cy.get('[name="due_date"]').type('2025-02-01');

    // Add line item
    cy.get('button').contains('Add Item').click();
    cy.get('[name="items[0].description"]').type('Service');
    cy.get('[name="items[0].quantity"]').type('1');
    cy.get('[name="items[0].unit_price"]').type('1000');

    // Submit
    cy.get('button').contains('Save').click();

    // Verify redirect
    cy.url().should('include', '/invoices/');

    // Send invoice
    cy.get('button').contains('Send').click();
    cy.get('[name="recipient_email"]').type('client@test.com');
    cy.get('button').contains('Send Invoice').click();

    // Verify sent
    cy.contains('Invoice sent successfully');
  });
});
```

---

## 11. Security Considerations

### 11.1 Authentication & Authorization

- All invoice operations require authentication
- RLS policies enforce user isolation
- Payment pages have token-based access
- Webhook endpoints verify Stripe signatures

### 11.2 Data Validation

- Input validation on both client and server
- SQL injection prevention via parameterized queries
- XSS prevention via React escaping
- CSRF protection via Supabase auth tokens

### 11.3 Payment Security

- PCI compliance via Stripe (no card data touches our servers)
- Payment intents prevent payment manipulation
- Webhook verification prevents spoofing
- Amount verification before processing

### 11.4 Email Security

- SPF/DKIM/DMARC configuration
- Rate limiting on email sends
- Unsubscribe handling
- Spam prevention

### 11.5 File Security

- RLS on storage buckets
- Virus scanning (optional)
- File type validation
- Size limits

---

## 12. Performance Considerations

### 12.1 Database Optimization

- Proper indexes on frequently queried columns
- Query optimization (avoid N+1)
- Connection pooling via Supabase
- Pagination for large lists

### 12.2 Frontend Optimization

- React Query caching reduces API calls
- Virtual scrolling for long lists
- Code splitting by route
- Lazy loading components
- Image optimization

### 12.3 PDF Generation

- Generate PDFs in background
- Cache generated PDFs
- Compress PDFs
- CDN delivery via Supabase Storage

### 12.4 Email Delivery

- Queue emails for batch sending
- Rate limiting
- Retry logic for failures
- Async processing

---

## 13. Monitoring & Analytics

### 13.1 Key Metrics

**Business Metrics:**
- Total invoices created
- Total revenue invoiced
- Payment success rate
- Average time to payment
- Overdue invoice count
- Customer payment trends

**Technical Metrics:**
- API response times
- Error rates
- Email delivery rates
- Email open rates
- Payment processing times
- PDF generation times

### 13.2 Error Tracking

- Sentry or similar for error tracking
- Log critical operations
- Alert on payment failures
- Monitor webhook deliveries

---

## 14. Deployment Checklist

### 14.1 Pre-Launch

- [ ] Database migrations applied
- [ ] RLS policies tested
- [ ] Edge functions deployed
- [ ] Environment variables configured
- [ ] Stripe webhooks configured
- [ ] Email DNS records configured
- [ ] Storage buckets created
- [ ] Test payments completed
- [ ] Email delivery tested
- [ ] PDF generation tested

### 14.2 Post-Launch

- [ ] Monitor error rates
- [ ] Check payment processing
- [ ] Verify email delivery
- [ ] Monitor performance
- [ ] Collect user feedback
- [ ] Document issues
- [ ] Plan iterations

---

## 15. Future Enhancements

### 15.1 Short Term (3-6 months)

- Recurring invoices
- Invoice templates
- Bulk operations
- Mobile app
- Advanced reporting
- Multi-currency support

### 15.2 Long Term (6-12 months)

- Accounting software integration (QuickBooks, Xero)
- Advanced automation (smart reminders)
- AI-powered insights
- White-label capabilities
- API for third-party integrations
- Multi-language support

---

## Conclusion

This architecture provides a solid foundation for implementing a production-ready invoice system in ContractorAI. The phased approach allows for incremental development and testing, while the integration strategy ensures seamless incorporation into the existing application.

The technology choices leverage existing dependencies where possible, reducing complexity and maintaining consistency with the current codebase. The modular design allows for easy extension and maintenance as requirements evolve.

Key strengths of this architecture:
- Leverages existing infrastructure (Supabase, Stripe, React)
- Scalable database design
- Secure payment processing
- Professional PDF generation
- Reliable email delivery
- Clean separation of concerns
- Type-safe implementation
- Comprehensive testing strategy
- Clear migration path

**Next Steps:**
1. Review and approve architecture
2. Set up development environment
3. Create database migrations
4. Begin Phase 1 implementation
5. Iterate based on feedback
