import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  DollarSign,
  Plus,
  Edit2,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Search,
  Receipt,
  Wallet,
  FileText,
  BarChart3,
  X,
  Link2,
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  Loader2,
  ChevronDown,
  Calendar,
  Building2,
  User,
  CreditCard,
  Trash2,
  Camera,
  Upload,
  RefreshCw,
  Edit,
  Check,
  ClipboardList,
  PenLine
} from 'lucide-react';
import { useFinanceStore, type Invoice, type Receipt as ReceiptType, type RecurringExpense } from '../stores/financeStoreSupabase';
import { useClientsStore } from '../stores/clientsStore';
import useProjectStore from '../stores/projectStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import AIChatPopup from '../components/ai/AIChatPopup';
import AddChoiceModal from '../components/common/AddChoiceModal';
import PaymentsTutorialModal from '../components/finance/PaymentsTutorialModal';
import FinanceTutorialModal from '../components/finance/FinanceTutorialModal';
import { supabase } from '../lib/supabase';
import { useTheme, getThemeClasses } from '../contexts/ThemeContext';

type ExpenseSubTab = 'upload' | 'recurring' | 'manual';

type ActiveSection = 'dashboard' | 'invoices' | 'revenue' | 'expenses' | 'reports';

interface FinanceHubProps {
  embedded?: boolean;
  searchQuery?: string;
}

const FinanceHub: React.FC<FinanceHubProps> = ({ embedded = false, searchQuery: externalSearchQuery }) => {
  const location = useLocation();
  const {
    invoices,
    payments,
    receipts,
    recurringExpenses,
    fetchInvoices,
    fetchPayments,
    fetchReceipts,
    fetchRecurringExpenses,
    addReceipt,
    updateReceipt,
    deleteReceipt,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    toggleRecurringExpense,
    addPayment,
    addInvoice,
    recordInvoicePayment,
    financialSummary,
    calculateFinancialSummary,
    isLoading
  } = useFinanceStore();

  const { clients, fetchClients, addClient } = useClientsStore();
  const { projects, fetchProjects } = useProjectStore();

  // Theme context
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const {
    paymentsTutorialCompleted,
    checkPaymentsTutorial,
    setPaymentsTutorialCompleted,
    financeTutorialCompleted,
    checkFinanceTutorial,
    setFinanceTutorialCompleted
  } = useOnboardingStore();

  const [showAddChoice, setShowAddChoice] = useState(false);
  const [showFinanceTutorial, setShowFinanceTutorial] = useState(false);
  const [showPaymentsTutorial, setShowPaymentsTutorial] = useState(false);
  const [tutorialUserId, setTutorialUserId] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');

  // Use external search query if provided (embedded mode)
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = externalSearchQuery !== undefined ? () => {} : setInternalSearchQuery;
  const [expenseSubTab, setExpenseSubTab] = useState<ExpenseSubTab>('upload');

  // Receipt upload state
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [isReceiptProcessing, setIsReceiptProcessing] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const [receiptFormData, setReceiptFormData] = useState({
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: '',
    projectId: '',
    notes: '',
    imageUrl: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Recurring expense form state
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null);
  const [recurringFormData, setRecurringFormData] = useState({
    name: '',
    vendor: '',
    amount: 0,
    category: '',
    frequency: 'monthly' as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    nextDueDate: new Date().toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    projectId: '',
    isActive: true
  });

  // Handle navigation state for collect payment
  useEffect(() => {
    const state = location.state as { openPaymentCollection?: boolean } | null;
    if (state?.openPaymentCollection) {
      setActiveSection('invoices');
      // Clear the state so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Modal states
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [paymentLinkLoading, setPaymentLinkLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Forms
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showRevenueForm, setShowRevenueForm] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    vendor: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Materials',
    notes: '',
    imageUrl: ''
  });
  const [expenseImagePreview, setExpenseImagePreview] = useState<string | null>(null);
  const expenseImageInputRef = useRef<HTMLInputElement>(null);

  // Revenue form state
  const [revenueForm, setRevenueForm] = useState({
    clientId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'bank_transfer' as const,
    reference: '',
    notes: ''
  });

  // Quick add client state for revenue form
  const [showQuickAddClient, setShowQuickAddClient] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    clientName: '',
    description: '',
    amount: '',
    dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]
  });

  // Record payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash' as 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'other',
    referenceNumber: '',
    notes: ''
  });

  // Hide navbar when any modal is open
  useEffect(() => {
    const isModalOpen = showExpenseForm || showRevenueForm || showPaymentLinkModal || showRecordPaymentModal || showAddChoice || showRecurringForm;
    if (isModalOpen) {
      document.body.classList.add('modal-active');
    } else {
      document.body.classList.remove('modal-active');
    }
    return () => {
      document.body.classList.remove('modal-active');
    };
  }, [showExpenseForm, showRevenueForm, showPaymentLinkModal, showRecordPaymentModal, showAddChoice, showRecurringForm]);

  useEffect(() => {
    fetchInvoices();
    fetchPayments();
    fetchReceipts();
    fetchRecurringExpenses();
    fetchClients();
    fetchProjects();

    // Check tutorial status - Finance tutorial shows on dashboard
    const checkTutorial = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        setTutorialUserId(user.id);
        const financeCompleted = await checkFinanceTutorial(user.id);
        if (!financeCompleted) {
          setShowFinanceTutorial(true);
        }
      }
    };
    checkTutorial();
  }, []);

  useEffect(() => {
    calculateFinancialSummary();
  }, [payments, receipts]);

  // Show payments tutorial when switching to invoices tab
  useEffect(() => {
    const checkInvoiceTutorial = async () => {
      if (activeSection === 'invoices' && tutorialUserId) {
        const completed = await checkPaymentsTutorial(tutorialUserId);
        if (!completed) {
          setShowPaymentsTutorial(true);
        }
      }
    };
    checkInvoiceTutorial();
  }, [activeSection, tutorialUserId]);

  const totalExpenses = (receipts || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const totalRevenue = (payments || []).reduce((sum, rev) => sum + (rev.amount || 0), 0);
  const profit = totalRevenue - totalExpenses;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleAIChat = () => {
    setShowAIChat(true);
    setShowAddChoice(false);
  };

  const handleManual = () => {
    setShowAddChoice(false);
    if (activeSection === 'expenses' || activeSection === 'dashboard') {
      setShowExpenseForm(true);
    } else if (activeSection === 'revenue') {
      setShowRevenueForm(true);
    }
  };

  // Generate payment link for invoice
  const handleGeneratePaymentLink = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentLinkModal(true);
    setPaymentLinkLoading(true);
    setPaymentLink(null);

    try {
      console.log('Creating payment link for invoice:', invoice.id, 'Full invoice:', JSON.stringify(invoice));

      // Validate invoice ID is a proper UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!invoice.id || !uuidRegex.test(invoice.id)) {
        throw new Error('Invalid invoice ID. This invoice may not have been saved properly. Please try creating a new invoice.');
      }

      // Use fetch directly to get better error handling
      const { data: { session } } = await supabase.auth.getSession();

      // Log current user vs invoice owner
      console.log('Current session user ID:', session?.user?.id);
      console.log('Invoice owner user ID:', invoice.userId);

      if (session?.user?.id !== invoice.userId) {
        console.error('USER ID MISMATCH! Session user:', session?.user?.id, 'Invoice owner:', invoice.userId);
        throw new Error('This invoice belongs to a different account. Please sign out and sign back in, or contact support.');
      }
      if (!session) {
        throw new Error('Not authenticated. Please sign in again.');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-invoice-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'create_payment_link',
          invoiceId: invoice.id
        })
      });

      const data = await response.json();
      console.log('Payment link response:', response.status, JSON.stringify(data));

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (data.paymentUrl) {
        setPaymentLink(data.paymentUrl);
      } else {
        throw new Error('No payment URL returned. Please try again.');
      }
    } catch (error: any) {
      console.error('Error generating payment link:', error?.message || error);
      const errorMessage = error?.message || 'Failed to generate payment link. Please ensure your Stripe account is connected in Settings → Payments.';
      alert(errorMessage);
      setShowPaymentLinkModal(false);
    } finally {
      setPaymentLinkLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  // Handle expense form image upload
  const handleExpenseImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setExpenseImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to storage
    try {
      const { uploadReceiptImage } = await import('../services/supabaseStorage');
      const imageUrl = await uploadReceiptImage(file);
      setExpenseForm(prev => ({ ...prev, imageUrl }));
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
  };

  // Submit expense
  const handleSubmitExpense = async () => {
    if (!expenseForm.vendor || !expenseForm.amount) {
      alert('Please fill in vendor and amount');
      return;
    }

    await addReceipt({
      vendor: expenseForm.vendor,
      amount: parseFloat(expenseForm.amount),
      date: expenseForm.date,
      category: expenseForm.category,
      notes: expenseForm.notes,
      imageUrl: expenseForm.imageUrl || undefined,
      status: 'processed'
    });

    setExpenseForm({
      vendor: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: 'Materials',
      notes: '',
      imageUrl: ''
    });
    setExpenseImagePreview(null);
    setShowExpenseForm(false);
  };

  // Handle invoice submission
  const handleSubmitInvoice = async () => {
    if (!invoiceForm.clientName || !invoiceForm.amount) {
      alert('Please fill in client name and amount');
      return;
    }

    try {
      const amount = parseFloat(invoiceForm.amount);
      await addInvoice({
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        clientName: invoiceForm.clientName,
        clientEmail: '',
        items: [{
          description: invoiceForm.description || 'Services',
          quantity: 1,
          unitPrice: amount,
          total: amount
        }],
        subtotal: amount,
        tax: 0,
        totalAmount: amount,
        balance: amount,
        status: 'sent',
        dueDate: invoiceForm.dueDate,
        notes: ''
      });

      setInvoiceForm({
        clientName: '',
        description: '',
        amount: '',
        dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]
      });
      setShowInvoiceForm(false);
      await fetchInvoices();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice: ' + (error?.message || 'Unknown error'));
    }
  };

  // Receipt upload handlers
  const handleCameraCapture = () => {
    setTimeout(() => {
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    }, 100);
  };

  const handleFileUpload = () => {
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 100);
  };

  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview immediately
      const url = URL.createObjectURL(file);
      setReceiptPreviewUrl(url);
      setOcrStatus('processing');

      // Process OCR in background
      processReceiptOCR(file);
    }
  };

  const processReceiptOCR = async (file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '00000000-0000-0000-0000-000000000000';

      // Sanitize filename
      const sanitizedFileName = file.name
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '');
      const fileName = `${userId}/${Date.now()}_${sanitizedFileName}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipt-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setOcrStatus('error');
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipt-images')
        .getPublicUrl(fileName);

      setReceiptFormData(prev => ({ ...prev, imageUrl: publicUrl }));

      // Call n8n webhook for OCR
      const n8nWebhookUrl = 'https://contractorai.app.n8n.cloud/webhook/d718a3b9-fd46-4ce2-b885-f2a18ad4d98a';

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const webhookResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: publicUrl }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (webhookResponse.ok) {
          const responseText = await webhookResponse.text();
          if (responseText.trim()) {
            const ocrData = JSON.parse(responseText);
            setReceiptFormData(prev => ({
              ...prev,
              vendor: ocrData.vendor || prev.vendor,
              date: ocrData.date || prev.date,
              amount: ocrData.amount || prev.amount,
              notes: ocrData.confidence?.overall
                ? `Auto-extracted (${Math.round(ocrData.confidence.overall * 100)}% confidence)`
                : prev.notes,
              imageUrl: publicUrl
            }));
            setOcrStatus('complete');
          }
        } else {
          setOcrStatus('error');
        }
      } catch (error) {
        console.error('OCR webhook failed:', error);
        setOcrStatus('error');
      }
    } catch (error) {
      console.error('Error processing receipt:', error);
      setOcrStatus('error');
    }
  };

  const handleSaveReceipt = async () => {
    if (!receiptFormData.vendor || !receiptFormData.amount || !receiptFormData.category) {
      alert('Please fill in vendor, amount, and category');
      return;
    }

    await addReceipt({
      vendor: receiptFormData.vendor,
      amount: receiptFormData.amount,
      date: receiptFormData.date,
      category: receiptFormData.category,
      projectId: receiptFormData.projectId || undefined,
      notes: receiptFormData.notes,
      imageUrl: receiptFormData.imageUrl || undefined,
      status: 'verified'
    });

    // Reset state
    setReceiptPreviewUrl(null);
    setOcrStatus('idle');
    setReceiptFormData({
      vendor: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: '',
      projectId: '',
      notes: '',
      imageUrl: ''
    });
  };

  const handleCancelReceipt = () => {
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
    }
    setReceiptPreviewUrl(null);
    setOcrStatus('idle');
    setReceiptFormData({
      vendor: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: '',
      projectId: '',
      notes: '',
      imageUrl: ''
    });
  };

  // Recurring expense handlers
  const handleSaveRecurringExpense = async () => {
    if (!recurringFormData.name || !recurringFormData.vendor || !recurringFormData.amount || !recurringFormData.category) {
      alert('Please fill in name, vendor, amount, and category');
      return;
    }

    if (editingRecurring) {
      // updateRecurringExpense expects the full RecurringExpense object
      await updateRecurringExpense({
        ...editingRecurring,
        ...recurringFormData
      });
      setEditingRecurring(null);
    } else {
      await addRecurringExpense(recurringFormData);
    }

    setShowRecurringForm(false);
    setRecurringFormData({
      name: '',
      vendor: '',
      amount: 0,
      category: '',
      frequency: 'monthly',
      nextDueDate: new Date().toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      projectId: '',
      isActive: true
    });
  };

  const handleEditRecurring = (expense: RecurringExpense) => {
    setEditingRecurring(expense);
    setRecurringFormData({
      name: expense.name,
      vendor: expense.vendor,
      amount: expense.amount,
      category: expense.category,
      frequency: expense.frequency,
      nextDueDate: expense.nextDueDate,
      startDate: expense.startDate || new Date().toISOString().split('T')[0],
      projectId: expense.projectId || '',
      isActive: expense.isActive
    });
    setShowRecurringForm(true);
  };

  const handleCancelRecurring = () => {
    setShowRecurringForm(false);
    setEditingRecurring(null);
    setRecurringFormData({
      name: '',
      vendor: '',
      amount: 0,
      category: '',
      frequency: 'monthly',
      nextDueDate: new Date().toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      projectId: '',
      isActive: true
    });
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly';
      case 'yearly': return 'Yearly';
      default: return frequency;
    }
  };

  // Submit revenue
  const handleSubmitRevenue = async () => {
    if (!revenueForm.amount) {
      alert('Please fill in amount');
      return;
    }

    try {
      await addPayment({
        clientId: revenueForm.clientId || 'Direct Payment',
        projectId: '',
        amount: parseFloat(revenueForm.amount),
        date: revenueForm.date,
        method: revenueForm.method,
        reference: revenueForm.reference,
        notes: revenueForm.notes,
        status: 'completed'
      });

      setRevenueForm({
        clientId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'bank_transfer',
        reference: '',
        notes: ''
      });
      setShowRevenueForm(false);
    } catch (error) {
      console.error('Error adding revenue:', error);
      alert('Failed to add revenue. Please try again.');
    }
  };

  // Record invoice payment
  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentForm.amount) {
      alert('Please enter payment amount');
      return;
    }

    await recordInvoicePayment(selectedInvoice.id, {
      amount: parseFloat(paymentForm.amount),
      paymentDate: paymentForm.paymentDate,
      paymentMethod: paymentForm.paymentMethod,
      referenceNumber: paymentForm.referenceNumber || undefined,
      notes: paymentForm.notes || undefined
    });

    setPaymentForm({
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      referenceNumber: '',
      notes: ''
    });
    setShowRecordPaymentModal(false);
    setSelectedInvoice(null);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: any }> = {
      draft: { bg: 'bg-zinc-800', text: '${themeClasses.text.secondary}', icon: FileText },
      sent: { bg: 'bg-blue-900/30', text: 'text-blue-400', icon: Send },
      outstanding: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', icon: Clock },
      partial: { bg: 'bg-orange-900/30', text: 'text-blue-400', icon: DollarSign },
      paid: { bg: 'bg-green-900/30', text: 'text-green-400', icon: CheckCircle },
      overdue: { bg: 'bg-red-900/30', text: 'text-red-400', icon: AlertCircle }
    };
    const c = config[status] || config.draft;
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Quick action cards for dashboard
  const quickActions = [
    { id: 'invoices', label: 'Invoices', icon: FileText, color: 'bg-blue-500/20', count: (invoices || []).filter(i => i.status !== 'paid').length },
    { id: 'revenue', label: 'Revenue', icon: ArrowUpRight, color: 'bg-blue-500/20', count: (payments || []).length },
    { id: 'expenses', label: 'Expenses', icon: ArrowDownRight, color: 'bg-blue-500/20', count: (receipts || []).length },
    { id: 'reports', label: 'Reports', icon: BarChart3, color: 'bg-blue-500/20', count: null }
  ];

  const expenseCategories = [
    'Materials', 'Equipment', 'Labor', 'Fuel', 'Office', 'Insurance',
    'Utilities', 'Marketing', 'Maintenance', 'Other'
  ];

  return (
    <div className={`${embedded ? '' : 'min-h-screen'} ${themeClasses.bg.primary} ${embedded ? '' : 'pb-40'}`}>
      {/* Fixed Header with safe area background - hidden when embedded */}
      {!embedded && (
        <>
          <div className={`fixed top-0 left-0 right-0 z-50 ${themeClasses.bg.secondary} border-b ${themeClasses.border.primary}`}>
            <div className="pt-[env(safe-area-inset-top)]">
              <div className="px-4 pb-5 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-7 h-7 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>Finance</h1>
                      <p className={`text-base ${themeClasses.text.secondary}`}>Track money in & out</p>
                    </div>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-red-600 rounded-2xl p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-red-100 mb-2">
                      <ArrowDownRight className="w-5 h-5" />
                      <span className="text-sm font-semibold">Expenses</span>
                    </div>
                    <p className="font-bold text-xl text-white">{formatCurrency(totalExpenses)}</p>
                  </div>
                  <div className="bg-emerald-600 rounded-2xl p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-100 mb-2">
                      <ArrowUpRight className="w-5 h-5" />
                      <span className="text-sm font-semibold">Revenue</span>
                    </div>
                    <p className="font-bold text-xl text-white">{formatCurrency(totalRevenue)}</p>
                  </div>
                  <div className={`${profit >= 0 ? 'bg-teal-600' : 'bg-blue-600'} rounded-2xl p-4 text-center`}>
                    <div className={`flex items-center justify-center gap-1.5 ${profit >= 0 ? 'text-teal-100' : 'text-blue-100'} mb-2`}>
                      {profit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      <span className="text-sm font-semibold">Profit</span>
                    </div>
                    <p className="font-bold text-xl text-white">{formatCurrency(profit)}</p>
                  </div>
                </div>

                {/* Section Tabs */}
                <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
                  {['dashboard', 'invoices', 'revenue', 'expenses', 'reports'].map((section) => (
                    <button
                      key={section}
                      onClick={() => setActiveSection(section as ActiveSection)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                        activeSection === section
                          ? 'bg-blue-500/20 text-blue-600'
                          : `${themeClasses.text.secondary} hover:${themeClasses.bg.tertiary}`
                      }`}
                    >
                      {section.charAt(0).toUpperCase() + section.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Spacer for fixed header */}
          <div className="pt-[calc(env(safe-area-inset-top)+195px)]" />
        </>
      )}

      {/* Embedded Mode Header - Show summary and tabs */}
      {embedded && (
        <div className="px-4 pb-4">
          {/* Title Row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${themeClasses.text.primary}`}>Finance</h2>
              <p className={`text-sm ${themeClasses.text.secondary}`}>Track money in & out</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-red-600 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-red-100 mb-1">
                <ArrowDownRight className="w-4 h-4" />
                <span className="text-xs font-semibold">Expenses</span>
              </div>
              <p className="font-bold text-lg text-white">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="bg-emerald-600 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-100 mb-1">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-xs font-semibold">Revenue</span>
              </div>
              <p className="font-bold text-lg text-white">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className={`${profit >= 0 ? 'bg-teal-600' : 'bg-blue-600'} rounded-xl p-3 text-center`}>
              <div className={`flex items-center justify-center gap-1 ${profit >= 0 ? 'text-teal-100' : 'text-blue-100'} mb-1`}>
                {profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-xs font-semibold">Profit</span>
              </div>
              <p className="font-bold text-lg text-white">{formatCurrency(profit)}</p>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {['dashboard', 'invoices', 'revenue', 'expenses', 'reports'].map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section as ActiveSection)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  activeSection === section
                    ? 'bg-blue-500/20 text-blue-600'
                    : `${themeClasses.text.secondary} hover:${themeClasses.bg.tertiary}`
                }`}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic CTA Card - Changes based on active tab and sub-tab */}
      {(activeSection === 'invoices' || activeSection === 'revenue' || activeSection === 'expenses') && (
        <div className="px-4 py-4">
          <div className={`${themeClasses.bg.secondary} rounded-2xl border-2 ${themeClasses.border.primary} p-8 text-left relative overflow-hidden min-h-[280px] flex flex-col`}>
            {/* Background icon visual */}
            <div className="absolute top-4 right-4 opacity-20">
              {activeSection === 'invoices' && <ClipboardList className="w-40 h-40 text-blue-500 transform rotate-12" />}
              {activeSection === 'revenue' && <TrendingUp className="w-40 h-40 text-green-500 transform rotate-12" />}
              {activeSection === 'expenses' && expenseSubTab === 'upload' && <Camera className="w-40 h-40 text-red-500 transform rotate-12" />}
              {activeSection === 'expenses' && expenseSubTab === 'recurring' && <RefreshCw className="w-40 h-40 text-red-500 transform rotate-12" />}
              {activeSection === 'expenses' && expenseSubTab === 'manual' && <Receipt className="w-40 h-40 text-red-500 transform rotate-12" />}
            </div>

            {/* Header */}
            <div className="flex items-center gap-5 mb-5 relative z-10">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ${
                activeSection === 'invoices' ? 'bg-blue-500' :
                activeSection === 'revenue' ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {activeSection === 'invoices' && <ClipboardList className="w-10 h-10 text-white" />}
                {activeSection === 'revenue' && <TrendingUp className="w-10 h-10 text-white" />}
                {activeSection === 'expenses' && expenseSubTab === 'upload' && <Camera className="w-10 h-10 text-white" />}
                {activeSection === 'expenses' && expenseSubTab === 'recurring' && <RefreshCw className="w-10 h-10 text-white" />}
                {activeSection === 'expenses' && expenseSubTab === 'manual' && <Receipt className="w-10 h-10 text-white" />}
              </div>
              <div>
                <h3 className={`font-bold text-2xl ${themeClasses.text.primary}`}>
                  {activeSection === 'invoices' && 'Create Invoice'}
                  {activeSection === 'revenue' && 'Add Revenue'}
                  {activeSection === 'expenses' && expenseSubTab === 'upload' && 'Add Receipt'}
                  {activeSection === 'expenses' && expenseSubTab === 'recurring' && 'Add Recurring Expense'}
                  {activeSection === 'expenses' && expenseSubTab === 'manual' && 'Add Expense'}
                </h3>
                <p className={`text-lg ${themeClasses.text.secondary}`}>
                  {activeSection === 'invoices' && 'Bill your clients'}
                  {activeSection === 'revenue' && 'Track your income'}
                  {activeSection === 'expenses' && expenseSubTab === 'upload' && 'Scan your receipts'}
                  {activeSection === 'expenses' && expenseSubTab === 'recurring' && 'Set up auto-tracking'}
                  {activeSection === 'expenses' && expenseSubTab === 'manual' && 'Log your costs'}
                </p>
              </div>
            </div>

            {/* Description */}
            <p className={`text-lg ${themeClasses.text.secondary} mb-6 relative z-10 leading-relaxed font-medium italic flex-grow`}>
              {activeSection === 'invoices' && 'Create professional invoices and get paid faster.'}
              {activeSection === 'revenue' && 'Record payments and income to track your earnings.'}
              {activeSection === 'expenses' && expenseSubTab === 'upload' && 'Take a photo or upload a receipt to automatically extract expense details.'}
              {activeSection === 'expenses' && expenseSubTab === 'recurring' && 'Set up recurring expenses to automatically track regular costs.'}
              {activeSection === 'expenses' && expenseSubTab === 'manual' && 'Manually enter expense details for better budgeting.'}
            </p>

            {/* CTA Button(s) */}
            {activeSection === 'expenses' && expenseSubTab === 'upload' ? (
              <div className="flex gap-3 relative z-10">
                <button
                  onClick={handleCameraCapture}
                  className="flex-1 py-5 px-6 bg-red-500 hover:bg-red-600 text-white text-lg font-semibold rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <Camera className="w-6 h-6" />
                  Take Photo
                </button>
                <button
                  onClick={handleFileUpload}
                  className={`flex-1 py-5 px-6 ${themeClasses.bg.tertiary} hover:opacity-80 ${themeClasses.text.secondary} text-lg font-semibold rounded-xl border-2 ${themeClasses.border.primary} active:scale-[0.98] transition-all flex items-center justify-center gap-3`}
                >
                  <Upload className="w-6 h-6" />
                  Upload
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (activeSection === 'invoices') setShowInvoiceForm(true);
                  else if (activeSection === 'revenue') setShowRevenueForm(true);
                  else if (activeSection === 'expenses' && expenseSubTab === 'recurring') setShowRecurringForm(true);
                  else if (activeSection === 'expenses' && expenseSubTab === 'manual') setShowExpenseForm(true);
                }}
                className={`w-full py-5 px-6 text-white text-xl font-semibold rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${
                  activeSection === 'invoices' ? 'bg-blue-500 hover:bg-blue-600' :
                  activeSection === 'revenue' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                <Plus className="w-7 h-7" />
                {activeSection === 'invoices' && 'Create Invoice'}
                {activeSection === 'revenue' && 'Add Revenue'}
                {activeSection === 'expenses' && expenseSubTab === 'recurring' && 'Add Recurring Expense'}
                {activeSection === 'expenses' && expenseSubTab === 'manual' && 'Add Expense'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content based on active section */}
      <div className="px-4 space-y-4">
        {/* Dashboard Section */}
        {activeSection === 'dashboard' && (
          <>
            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => setActiveSection(action.id as ActiveSection)}
                    className={`${themeClasses.bg.secondary} rounded-2xl p-5 border-2 ${themeClasses.border.primary} shadow-sm text-left active:scale-[0.98] transition-transform hover:opacity-90 relative`}
                  >
                    <ChevronRight className="w-5 h-5 text-gray-400 absolute top-4 right-4" />
                    <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className={`font-bold text-lg ${themeClasses.text.primary}`}>{action.label}</p>
                    {action.count !== null && (
                      <p className={`text-base ${themeClasses.text.secondary}`}>{action.count} items</p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Recent Transactions */}
            <div className={`${themeClasses.bg.secondary} rounded-2xl border-2 ${themeClasses.border.primary}`}>
              <div className={`p-5 border-b-2 ${themeClasses.border.primary}`}>
                <h3 className={`font-bold text-lg ${themeClasses.text.primary}`}>Recent Transactions</h3>
              </div>
              <div className="p-4 space-y-3">
                {(financialSummary?.recentTransactions || []).slice(0, 5).map((tx) => (
                  <div key={tx.id} className={`p-5 flex items-center justify-between ${themeClasses.bg.secondary} rounded-2xl border-2 ${themeClasses.border.primary} shadow-sm`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                        tx.type === 'income' ? 'bg-emerald-600' : 'bg-red-600'
                      }`}>
                        {tx.type === 'income' ? (
                          <ArrowUpRight className="w-7 h-7 text-white" />
                        ) : (
                          <ArrowDownRight className="w-7 h-7 text-white" />
                        )}
                      </div>
                      <div>
                        <p className={`font-semibold text-lg ${themeClasses.text.primary}`}>{tx.description}</p>
                        <p className={`text-base ${themeClasses.text.secondary}`}>{new Date(tx.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`font-bold text-xl ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
                {(financialSummary?.recentTransactions || []).length === 0 && (
                  <div className={`p-8 text-center ${themeClasses.text.secondary}`}>
                    No transactions yet
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Invoices Section */}
        {activeSection === 'invoices' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
              </div>
            ) : (invoices || []).length === 0 ? (
              <div className={`text-center py-12 ${themeClasses.bg.secondary} rounded-xl border border-blue-500/30`}>
                <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className={`${themeClasses.text.secondary} font-medium`}>No invoices yet</p>
                <p className="text-sm text-zinc-500 mt-1">Create an invoice or convert estimates to invoices</p>
              </div>
            ) : (
              (invoices || []).map((invoice) => (
                <div key={invoice.id} className={`${themeClasses.bg.secondary} rounded-xl border border-blue-500/30 overflow-hidden`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className={`font-semibold ${themeClasses.text.primary}`}>
                          Invoice #{invoice.invoiceNumber || invoice.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-zinc-500">
                          Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Not set'}
                        </p>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-zinc-500">Total</p>
                        <p className={`font-bold ${themeClasses.text.primary}`}>{formatCurrency(invoice.totalAmount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-zinc-500">Balance</p>
                        <p className="font-bold text-blue-400">{formatCurrency(invoice.balance)}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    {invoice.status !== 'paid' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleGeneratePaymentLink(invoice)}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 ${themeClasses.text.primary} rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20 active:bg-blue-600 transition-colors`}
                        >
                          <Link2 className="w-4 h-4" />
                          Payment Link
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setPaymentForm(prev => ({ ...prev, amount: invoice.balance.toString() }));
                            setShowRecordPaymentModal(true);
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 ${themeClasses.text.primary} rounded-lg text-sm font-medium shadow-lg shadow-green-500/20`}
                        >
                          <DollarSign className="w-4 h-4" />
                          Record Payment
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Revenue Section */}
        {activeSection === 'revenue' && (
          <div className="space-y-3">
            {(payments || []).length === 0 ? (
              <div className={`text-center py-12 ${themeClasses.bg.secondary} rounded-xl border border-blue-500/30`}>
                <Wallet className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className={`${themeClasses.text.secondary} font-medium`}>No revenue recorded</p>
                <p className="text-sm text-zinc-500 mt-1">Add payments you've received</p>
              </div>
            ) : (
              (payments || []).map((payment) => {
                // Look up project name using projectId, or use clientId if it's a readable name
                const project = projects.find(p => p.id === payment.projectId);
                const displayName = project?.name || project?.clientName ||
                  (payment.clientId && !payment.clientId.includes('-') ? payment.clientId : 'Payment');

                return (
                  <div key={payment.id} className={`${themeClasses.bg.secondary} rounded-xl border border-blue-500/30 p-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                          <ArrowUpRight className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className={`font-semibold ${themeClasses.text.primary}`}>{displayName}</p>
                          <p className="text-sm text-zinc-500">{new Date(payment.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-400">+{formatCurrency(payment.amount)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Expenses Section */}
        {activeSection === 'expenses' && (
          <div className="space-y-4">
            {/* Expense Sub-Tabs */}
            <div className={`flex gap-2 ${themeClasses.bg.secondary} rounded-xl p-1.5 border border-blue-500/30`}>
              <button
                onClick={() => setExpenseSubTab('upload')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  expenseSubTab === 'upload'
                    ? 'bg-blue-500 text-white'
                    : `${themeClasses.text.secondary} hover:${themeClasses.text.primary}`
                }`}
              >
                <Receipt className="w-4 h-4" />
                Receipts
              </button>
              <button
                onClick={() => setExpenseSubTab('recurring')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  expenseSubTab === 'recurring'
                    ? 'bg-blue-500 text-white'
                    : `${themeClasses.text.secondary} hover:${themeClasses.text.primary}`
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                Recurring
              </button>
              <button
                onClick={() => setExpenseSubTab('manual')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  expenseSubTab === 'manual'
                    ? 'bg-blue-500 text-white'
                    : `${themeClasses.text.secondary} hover:${themeClasses.text.primary}`
                }`}
              >
                <Edit2 className="w-4 h-4" />
                Manual
              </button>
            </div>

            {/* Upload Receipt Sub-Tab */}
            {expenseSubTab === 'upload' && (
              <div className="space-y-4">
                {receiptPreviewUrl && (
                  <div className={`${themeClasses.bg.secondary} rounded-xl border border-blue-500/30 p-4 space-y-4`}>
                    {/* OCR Status Banner */}
                    {ocrStatus !== 'idle' && (
                      <div className={`rounded-lg p-3 ${
                        ocrStatus === 'processing' ? 'bg-blue-900/30 border border-blue-500/30' :
                        ocrStatus === 'complete' ? 'bg-green-900/30 border border-green-500/30' :
                        'bg-yellow-900/30 border border-yellow-500/30'
                      }`}>
                        <div className="flex items-center gap-2">
                          {ocrStatus === 'processing' && (
                            <>
                              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                              <span className="text-sm text-blue-400">AI is extracting data...</span>
                            </>
                          )}
                          {ocrStatus === 'complete' && (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              <span className="text-sm text-green-400">Receipt data extracted!</span>
                            </>
                          )}
                          {ocrStatus === 'error' && (
                            <span className="text-sm text-yellow-400">OCR failed - enter manually</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Preview + Form */}
                    <div className="flex gap-4">
                      <div className="w-24 h-32 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={receiptPreviewUrl} alt="Receipt" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className={`block text-xs font-medium ${themeClasses.text.secondary} mb-1`}>Vendor</label>
                          <input
                            type="text"
                            value={receiptFormData.vendor}
                            onChange={(e) => setReceiptFormData(prev => ({ ...prev, vendor: e.target.value }))}
                            className={`w-full px-3 py-2 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-lg ${themeClasses.text.primary} text-sm placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            placeholder="Store name"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={`block text-xs font-medium ${themeClasses.text.secondary} mb-1`}>Amount</label>
                            <input
                              type="number"
                              step="0.01"
                              value={receiptFormData.amount || ''}
                              onChange={(e) => setReceiptFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                              className={`w-full px-3 py-2 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-lg ${themeClasses.text.primary} text-sm placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-medium ${themeClasses.text.secondary} mb-1`}>Date</label>
                            <input
                              type="date"
                              value={receiptFormData.date}
                              onChange={(e) => setReceiptFormData(prev => ({ ...prev, date: e.target.value }))}
                              className={`w-full px-3 py-2 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-lg ${themeClasses.text.primary} text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-medium ${themeClasses.text.secondary} mb-1`}>Category</label>
                        <select
                          value={receiptFormData.category}
                          onChange={(e) => setReceiptFormData(prev => ({ ...prev, category: e.target.value }))}
                          className={`w-full px-3 py-2 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-lg ${themeClasses.text.primary} text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        >
                          <option value="">Select</option>
                          {expenseCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs font-medium ${themeClasses.text.secondary} mb-1`}>Project</label>
                        <select
                          value={receiptFormData.projectId}
                          onChange={(e) => setReceiptFormData(prev => ({ ...prev, projectId: e.target.value }))}
                          className={`w-full px-3 py-2 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-lg ${themeClasses.text.primary} text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        >
                          <option value="">None</option>
                          {(projects || []).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelReceipt}
                        className={`flex-1 px-4 py-2.5 bg-zinc-700 ${themeClasses.text.primary} rounded-lg font-medium`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveReceipt}
                        disabled={!receiptFormData.vendor || !receiptFormData.amount || !receiptFormData.category}
                        className={`flex-1 px-4 py-2.5 bg-blue-500 ${themeClasses.text.primary} rounded-lg font-medium disabled:bg-zinc-600 disabled:${themeClasses.text.secondary}`}
                      >
                        Save Receipt
                      </button>
                    </div>
                  </div>
                )}

                {/* Hidden file inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleReceiptFileChange}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleReceiptFileChange}
                  className="hidden"
                />

                {/* All Receipts/Expenses */}
                <div className={`${themeClasses.bg.secondary} rounded-xl border border-blue-500/30 p-4`}>
                  <h4 className={`font-semibold ${themeClasses.text.primary} mb-3`}>All Receipts ({(receipts || []).length})</h4>
                  {(receipts || []).length === 0 ? (
                    <div className="text-center py-6">
                      <Receipt className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                      <p className="text-zinc-500 text-sm">No receipts yet</p>
                      <p className="text-zinc-600 text-xs mt-1">Take a photo or upload a receipt above</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(receipts || []).map((expense) => (
                        <div key={expense.id} className={`flex items-center justify-between p-3 ${themeClasses.bg.input} rounded-lg`}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-700 rounded overflow-hidden flex items-center justify-center">
                              {expense.imageUrl ? (
                                <img src={expense.imageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Receipt className="w-5 h-5 text-zinc-500" />
                              )}
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${themeClasses.text.primary}`}>{expense.vendor}</p>
                              <p className="text-xs text-zinc-500">{expense.category} • {new Date(expense.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <span className="font-semibold text-red-400">-{formatCurrency(expense.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recurring Expenses Sub-Tab */}
            {expenseSubTab === 'recurring' && (
              <div className="space-y-4">
                {!showRecurringForm ? (
                  <button
                    onClick={() => setShowRecurringForm(true)}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 ${themeClasses.bg.secondary} border-2 border-dashed border-blue-500/50 text-blue-400 rounded-xl font-medium`}
                  >
                    <Plus className="w-5 h-5" />
                    Add Recurring Expense
                  </button>
                ) : (
                  <div className={`${themeClasses.bg.secondary} rounded-xl border border-blue-500/30 p-4 space-y-4`}>
                    <div className="flex items-center justify-between">
                      <h4 className={`font-semibold ${themeClasses.text.primary}`}>
                        {editingRecurring ? 'Edit Recurring Expense' : 'New Recurring Expense'}
                      </h4>
                      <button onClick={handleCancelRecurring} className={`p-1 text-zinc-500 hover:${themeClasses.text.primary}`}>
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className={`block text-xs font-medium ${themeClasses.text.secondary} mb-1`}>Expense Name</label>
                        <input
                          type="text"
                          value={recurringFormData.name}
                          onChange={(e) => setRecurringFormData(prev => ({ ...prev, name: e.target.value }))}
                          className={`w-full px-3 py-2.5 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-lg ${themeClasses.text.primary} text-sm placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                          placeholder="e.g., Software Subscription"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className={`block text-xs font-medium ${themeClasses.text.secondary} mb-1`}>Vendor</label>
                        <input
                          type="text"
                          value={recurringFormData.vendor}
                          onChange={(e) => setRecurringFormData(prev => ({ ...prev, vendor: e.target.value }))}
                          className={`w-full px-3 py-2.5 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-lg ${themeClasses.text.primary} text-sm placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                          placeholder="e.g., Adobe, QuickBooks"
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium ${themeClasses.text.secondary} mb-1`}>Amount</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <input
                            type="number"
                            step="0.01"
                            value={recurringFormData.amount || ''}
                            onChange={(e) => setRecurringFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                            className={`w-full pl-9 pr-3 py-2.5 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-lg ${themeClasses.text.primary} text-sm placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className={`block text-xs font-medium ${themeClasses.text.secondary} mb-1`}>Frequency</label>
                        <select
                          value={recurringFormData.frequency}
                          onChange={(e) => setRecurringFormData(prev => ({ ...prev, frequency: e.target.value as any }))}
                          className={`w-full px-3 py-2.5 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-lg ${themeClasses.text.primary} text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        >
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs font-medium ${themeClasses.text.secondary} mb-1`}>Category</label>
                        <select
                          value={recurringFormData.category}
                          onChange={(e) => setRecurringFormData(prev => ({ ...prev, category: e.target.value }))}
                          className={`w-full px-3 py-2.5 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-lg ${themeClasses.text.primary} text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        >
                          <option value="">Select</option>
                          {expenseCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs font-medium ${themeClasses.text.secondary} mb-1`}>Next Due</label>
                        <input
                          type="date"
                          value={recurringFormData.nextDueDate}
                          onChange={(e) => setRecurringFormData(prev => ({ ...prev, nextDueDate: e.target.value }))}
                          className={`w-full px-3 py-2.5 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-lg ${themeClasses.text.primary} text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={recurringFormData.isActive}
                        onChange={(e) => setRecurringFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="w-4 h-4 text-blue-500 bg-zinc-700 border-zinc-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="isActive" className="text-sm text-zinc-300">Active</label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelRecurring}
                        className={`flex-1 px-4 py-2.5 bg-zinc-700 ${themeClasses.text.primary} rounded-lg font-medium`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveRecurringExpense}
                        className={`flex-1 px-4 py-2.5 bg-blue-500 ${themeClasses.text.primary} rounded-lg font-medium`}
                      >
                        {editingRecurring ? 'Update' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Recurring Expenses List */}
                {(recurringExpenses || []).length === 0 ? (
                  <div className={`text-center py-12 ${themeClasses.bg.secondary} rounded-xl border border-blue-500/30`}>
                    <RefreshCw className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <p className={`${themeClasses.text.secondary} font-medium`}>No recurring expenses</p>
                    <p className="text-sm text-zinc-500 mt-1">Add subscriptions & regular bills</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(recurringExpenses || []).map((expense) => (
                      <div key={expense.id} className={`${themeClasses.bg.secondary} rounded-xl border border-blue-500/30 p-4`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${expense.isActive ? 'bg-blue-500/20' : 'bg-zinc-700'}`}>
                              <RefreshCw className={`w-5 h-5 ${expense.isActive ? 'text-blue-500' : 'text-zinc-500'}`} />
                            </div>
                            <div>
                              <p className={`font-semibold ${themeClasses.text.primary}`}>{expense.name}</p>
                              <p className="text-sm text-zinc-500">{expense.vendor}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-400">-{formatCurrency(expense.amount)}</p>
                            <p className="text-xs text-zinc-500">{getFrequencyLabel(expense.frequency)}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-blue-500/20">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${expense.isActive ? 'bg-green-900/30 text-green-400' : 'bg-zinc-700 ${themeClasses.text.secondary}'}`}>
                              {expense.isActive ? 'Active' : 'Paused'}
                            </span>
                            <span className="text-xs text-zinc-500">
                              Next: {new Date(expense.nextDueDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleRecurringExpense(expense.id, !expense.isActive)}
                              className="p-2 text-zinc-500 hover:text-blue-400 rounded-lg"
                            >
                              {expense.isActive ? <Clock className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleEditRecurring(expense)}
                              className="p-2 text-zinc-500 hover:text-blue-400 rounded-lg"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteRecurringExpense(expense.id)}
                              className="p-2 text-zinc-500 hover:text-red-400 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Manual Entry Sub-Tab */}
            {expenseSubTab === 'manual' && (
              <div className="space-y-3">
                {(receipts || []).length === 0 ? (
                  <div className={`text-center py-12 ${themeClasses.bg.secondary} rounded-xl border border-blue-500/30`}>
                    <Receipt className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <p className={`${themeClasses.text.secondary} font-medium`}>No expenses recorded</p>
                    <p className="text-sm text-zinc-500 mt-1">Track your business expenses</p>
                  </div>
                ) : (
                  (receipts || []).map((expense) => (
                    <div key={expense.id} className={`${themeClasses.bg.secondary} rounded-xl border border-blue-500/30 p-4`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-900/30 rounded-xl flex items-center justify-center">
                            <ArrowDownRight className="w-5 h-5 text-red-400" />
                          </div>
                          <div>
                            <p className={`font-semibold ${themeClasses.text.primary}`}>{expense.vendor}</p>
                            <p className="text-sm text-zinc-500">{expense.category} • {new Date(expense.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-red-400">-{formatCurrency(expense.amount)}</span>
                          <button
                            onClick={() => deleteReceipt(expense.id)}
                            className="p-2 text-zinc-500 hover:text-red-400 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Reports Section */}
        {activeSection === 'reports' && (
          <div className="space-y-4">
            <div className={`${themeClasses.bg.secondary} rounded-xl border border-blue-500/30 p-4`}>
              <h3 className={`font-semibold ${themeClasses.text.primary} mb-4`}>Financial Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-blue-500/20">
                  <span className={`${themeClasses.text.secondary}`}>Total Revenue</span>
                  <span className="font-semibold text-green-400">{formatCurrency(financialSummary?.totalRevenue || 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-blue-500/20">
                  <span className={`${themeClasses.text.secondary}`}>Total Expenses</span>
                  <span className="font-semibold text-red-400">{formatCurrency(financialSummary?.totalExpenses || 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-blue-500/20">
                  <span className={`${themeClasses.text.secondary}`}>Net Profit</span>
                  <span className={`font-semibold ${(financialSummary?.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(financialSummary?.profit || 0)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className={`${themeClasses.text.secondary}`}>Profit Margin</span>
                  <span className={`font-semibold ${themeClasses.text.primary}`}>{(financialSummary?.profitMargin || 0).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Expenses by Category */}
            {(financialSummary?.expensesByCategory || []).length > 0 && (
              <div className={`${themeClasses.bg.secondary} rounded-xl border border-blue-500/30 p-4`}>
                <h3 className={`font-semibold ${themeClasses.text.primary} mb-4`}>Expenses by Category</h3>
                <div className="space-y-2">
                  {(financialSummary?.expensesByCategory || []).map((cat) => (
                    <div key={cat.category} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-zinc-300">{cat.category}</span>
                          <span className={`text-sm font-medium ${themeClasses.text.primary}`}>{formatCurrency(cat.amount)}</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500 w-12 text-right">{cat.percentage.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Choice Modal */}
      <AddChoiceModal
        isOpen={showAddChoice}
        onClose={() => setShowAddChoice(false)}
        onAIChat={handleAIChat}
        onManual={handleManual}
        title="Add Transaction"
        aiLabel="AI Assistant"
        aiDescription="Tell me about the expense or payment"
        manualLabel="Manual Entry"
        manualDescription="Enter transaction details yourself"
      />

      {/* AI Chat Popup */}
      <AIChatPopup
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        mode="finance"
      />

      {/* Payment Link Modal */}
      {showPaymentLinkModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-end sm:items-center justify-center">
          <div className={`${themeClasses.bg.secondary} w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-auto`}>
            <div className={`sticky top-0 ${themeClasses.bg.secondary} p-4 border-b border-blue-500/30 flex items-center justify-between z-10`}>
              <button
                onClick={() => {
                  setShowPaymentLinkModal(false);
                  setSelectedInvoice(null);
                  setPaymentLink(null);
                }}
                className={`${themeClasses.text.secondary} text-base font-medium active:text-zinc-300`}
              >
                Close
              </button>
              <h3 className={`font-semibold ${themeClasses.text.primary}`}>Payment Link</h3>
              <div className="w-12"></div>
            </div>
            <div className="p-4 space-y-4">
              <div className={`${themeClasses.bg.input} rounded-xl p-4`}>
                <p className="text-sm text-zinc-500">Invoice</p>
                <p className={`font-semibold ${themeClasses.text.primary}`}>#{selectedInvoice.invoiceNumber || selectedInvoice.id.slice(0, 8)}</p>
                <p className="text-sm text-zinc-500 mt-2">Amount Due</p>
                <p className={`font-bold text-2xl ${themeClasses.text.primary}`}>{formatCurrency(selectedInvoice.balance)}</p>
              </div>

              {paymentLinkLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                </div>
              ) : paymentLink ? (
                <div className="space-y-3">
                  <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="font-medium text-green-400">Payment Link Ready!</span>
                    </div>
                    <p className="text-sm text-green-300 break-all">{paymentLink}</p>
                  </div>

                  <button
                    onClick={handleCopyLink}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 ${themeClasses.text.primary} rounded-xl font-medium shadow-lg shadow-purple-500/20`}
                  >
                    {linkCopied ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copy Link
                      </>
                    )}
                  </button>

                  <p className="text-xs text-center text-zinc-500">
                    Share this link with your customer to collect payment
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-end sm:items-center justify-center">
          <div className={`${themeClasses.bg.secondary} w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-auto`}>
            <div className={`sticky top-0 ${themeClasses.bg.secondary} p-4 border-b border-blue-500/30 flex items-center justify-between z-10`}>
              <button
                onClick={() => {
                  setShowRecordPaymentModal(false);
                  setSelectedInvoice(null);
                }}
                className={`${themeClasses.text.secondary} text-base font-medium active:text-zinc-300`}
              >
                Cancel
              </button>
              <h3 className={`font-semibold ${themeClasses.text.primary}`}>Record Payment</h3>
              <button
                onClick={handleRecordPayment}
                className="text-blue-500 text-base font-semibold active:text-blue-400"
              >
                Save
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className={`${themeClasses.bg.input} rounded-xl p-4`}>
                <p className="text-sm text-zinc-500">Invoice #{selectedInvoice.invoiceNumber}</p>
                <p className={`font-medium ${themeClasses.text.primary}`}>Balance: {formatCurrency(selectedInvoice.balance)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    className={`w-full pl-10 pr-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Date</label>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                  className={`w-full px-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                  className={`w-full px-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Reference (Optional)</label>
                <input
                  type="text"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                  className={`w-full px-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                  placeholder="Check #, Transaction ID"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-end sm:items-center justify-center">
          <div className={`${themeClasses.bg.secondary} w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-auto`}>
            <div className={`sticky top-0 ${themeClasses.bg.secondary} p-4 border-b border-blue-500/30 flex items-center justify-between z-10`}>
              <button
                onClick={() => setShowExpenseForm(false)}
                className={`${themeClasses.text.secondary} text-base font-medium active:text-zinc-300`}
              >
                Cancel
              </button>
              <h3 className={`font-semibold ${themeClasses.text.primary}`}>Add Expense</h3>
              <button
                onClick={handleSubmitExpense}
                className="text-blue-500 text-base font-semibold active:text-blue-400"
              >
                Save
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Vendor/Description</label>
                <input
                  type="text"
                  value={expenseForm.vendor}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, vendor: e.target.value }))}
                  className={`w-full px-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} placeholder-zinc-500 focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                  placeholder="Home Depot, Gas Station..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                    className={`w-full pl-10 pr-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} placeholder-zinc-500 focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Date</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                  className={`w-full px-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                  className={`w-full px-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                >
                  {expenseCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Receipt Image Upload */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Receipt Image (Optional)</label>
                <input
                  ref={expenseImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleExpenseImageUpload}
                  className="hidden"
                />
                {expenseImagePreview ? (
                  <div className="relative">
                    <img
                      src={expenseImagePreview}
                      alt="Receipt preview"
                      className="w-full h-40 object-cover rounded-xl border border-blue-500/30"
                    />
                    <button
                      onClick={() => {
                        setExpenseImagePreview(null);
                        setExpenseForm(prev => ({ ...prev, imageUrl: '' }));
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500 rounded-full text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => expenseImageInputRef.current?.click()}
                    className={`w-full flex items-center justify-center gap-3 p-4 ${themeClasses.bg.input} border-2 border-dashed border-blue-500/50 rounded-xl hover:border-blue-500 active:scale-[0.98] transition-all`}
                  >
                    <Camera className="w-6 h-6 text-blue-500" />
                    <span className={`font-medium ${themeClasses.text.secondary}`}>Add Receipt Photo</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Notes (Optional)</label>
                <textarea
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                  className={`w-full px-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} placeholder-zinc-500 focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                  rows={2}
                  placeholder="Additional details..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Form Modal */}
      {showRevenueForm && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-end sm:items-center justify-center">
          <div className={`${themeClasses.bg.secondary} w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-auto`}>
            <div className={`sticky top-0 ${themeClasses.bg.secondary} p-4 border-b border-blue-500/30 flex items-center justify-between z-10`}>
              <button
                onClick={() => {
                  setShowRevenueForm(false);
                  setShowQuickAddClient(false);
                  setQuickClientName('');
                }}
                className={`${themeClasses.text.secondary} text-base font-medium active:text-zinc-300`}
              >
                Cancel
              </button>
              <h3 className={`font-semibold ${themeClasses.text.primary}`}>Add Revenue</h3>
              <button
                onClick={handleSubmitRevenue}
                className="text-blue-500 text-base font-semibold active:text-blue-400"
              >
                Save
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Client (Optional)</label>
                {!showQuickAddClient ? (
                  <div className="space-y-2">
                    <select
                      value={revenueForm.clientId}
                      onChange={(e) => setRevenueForm(prev => ({ ...prev, clientId: e.target.value }))}
                      className={`w-full px-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                    >
                      <option value="">Select a client...</option>
                      {(clients || []).map(client => (
                        <option key={client.id} value={client.name}>{client.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddClient(true)}
                      className="flex items-center gap-2 text-blue-500 text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Client
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={quickClientName}
                        onChange={(e) => setQuickClientName(e.target.value)}
                        className={`flex-1 px-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        placeholder="Enter client name..."
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (quickClientName.trim()) {
                            try {
                              await addClient({
                                name: quickClientName.trim(),
                                email: '',
                                phone: '',
                                address: '',
                                notes: ''
                              });
                              setRevenueForm(prev => ({ ...prev, clientId: quickClientName.trim() }));
                              setQuickClientName('');
                              setShowQuickAddClient(false);
                              await fetchClients();
                            } catch (error) {
                              console.error('Error adding client:', error);
                            }
                          }
                        }}
                        className={`px-4 py-3 bg-blue-500 ${themeClasses.text.primary} rounded-xl font-medium active:bg-blue-600`}
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickClientName('');
                          setShowQuickAddClient(false);
                        }}
                        className={`px-4 py-3 bg-zinc-700 ${themeClasses.text.primary} rounded-xl font-medium active:bg-zinc-600`}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500">Enter name and tap check to add client</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="number"
                    value={revenueForm.amount}
                    onChange={(e) => setRevenueForm(prev => ({ ...prev, amount: e.target.value }))}
                    className={`w-full pl-10 pr-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Date</label>
                <input
                  type="date"
                  value={revenueForm.date}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, date: e.target.value }))}
                  className={`w-full px-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Payment Method</label>
                <select
                  value={revenueForm.method}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, method: e.target.value as any }))}
                  className={`w-full px-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Reference (Optional)</label>
                <input
                  type="text"
                  value={revenueForm.reference}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, reference: e.target.value }))}
                  className={`w-full px-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                  placeholder="Check #, Transaction ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Notes (Optional)</label>
                <textarea
                  value={revenueForm.notes}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, notes: e.target.value }))}
                  className={`w-full px-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                  rows={2}
                  placeholder="Additional details..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Form Modal */}
      {showInvoiceForm && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-end sm:items-center justify-center">
          <div className={`${themeClasses.bg.secondary} w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-auto`}>
            <div className={`sticky top-0 ${themeClasses.bg.secondary} p-4 border-b border-blue-500/30 flex items-center justify-between z-10`}>
              <button
                onClick={() => setShowInvoiceForm(false)}
                className={`${themeClasses.text.secondary} text-base font-medium active:text-zinc-300`}
              >
                Cancel
              </button>
              <h3 className={`font-semibold ${themeClasses.text.primary}`}>Create Invoice</h3>
              <button
                onClick={handleSubmitInvoice}
                className="text-blue-500 text-base font-semibold active:text-blue-400"
              >
                Save
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Client Name <span className="text-red-400">*</span></label>
                <select
                  value={invoiceForm.clientName}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, clientName: e.target.value }))}
                  className={`w-full px-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                >
                  <option value="">Select a client...</option>
                  {(clients || []).map(client => (
                    <option key={client.id} value={client.name}>{client.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
                <input
                  type="text"
                  value={invoiceForm.description}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, description: e.target.value }))}
                  className={`w-full px-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="Services rendered..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Amount <span className="text-red-400">*</span></label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="number"
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, amount: e.target.value }))}
                    className={`w-full pl-10 pr-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Due Date</label>
                <input
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  className={`w-full px-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-xl ${themeClasses.text.primary} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finance Tutorial Modal - shows on dashboard */}
      <FinanceTutorialModal
        isOpen={showFinanceTutorial}
        onComplete={(dontShowAgain) => {
          setShowFinanceTutorial(false);
          if (dontShowAgain && tutorialUserId) {
            setFinanceTutorialCompleted(tutorialUserId, true);
          }
        }}
      />

      {/* Payments Tutorial Modal - shows on invoices tab */}
      <PaymentsTutorialModal
        isOpen={showPaymentsTutorial}
        onComplete={(dontShowAgain) => {
          setShowPaymentsTutorial(false);
          if (dontShowAgain && tutorialUserId) {
            setPaymentsTutorialCompleted(tutorialUserId, true);
          }
        }}
      />
    </div>
  );
};

export default FinanceHub;
