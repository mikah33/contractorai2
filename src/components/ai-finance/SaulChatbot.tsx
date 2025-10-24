import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Loader2, DollarSign, History, Plus, X, TrendingUp, TrendingDown, Trash2, Download } from 'lucide-react';
import { SAUL_WELCOME_MESSAGE } from '../../lib/ai/saul-config';
import { saulChatHistoryManager, SaulChatSession } from '../../lib/ai/saulChatHistory';
import { useAuthStore } from '../../stores/authStore';
import saulLogo from '../../assets/icons/saul-logo.svg';
import { SaulExpenseDashboard } from './SaulExpenseDashboard';
import { downloadFinancialReportPDF } from '../../utils/pdfGenerator';
import { supabase } from '../../lib/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface FinancialContext {
  currentMonth: {
    revenue: number;
    expenses: number;
    profit: number;
  };
  recentTransactions: any[];
  budgets: any[];
}


export const SaulChatbot: React.FC = () => {
  const { session } = useAuthStore();
  const [sessionStartTime] = useState(() => new Date());
  const [sessionId] = useState(() => `saul-session-${Date.now()}`);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: SAUL_WELCOME_MESSAGE,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [financialContext, setFinancialContext] = useState<FinancialContext>({
    currentMonth: {
      revenue: 0,
      expenses: 0,
      profit: 0
    },
    recentTransactions: [],
    budgets: []
  });
  const [showHistory, setShowHistory] = useState(false);
  const [showFinancials, setShowFinancials] = useState(false);
  const [chatHistory, setChatHistory] = useState<SaulChatSession[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount, load chat history, and fetch initial financial data
  useEffect(() => {
    inputRef.current?.focus();

    const loadHistory = async () => {
      const sessions = await saulChatHistoryManager.getAllSessions();
      setChatHistory(sessions);
    };

    const loadFinancialData = async () => {
      if (!session?.user?.id) return;

      try {
        // Get current month date range
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        // Fetch expenses
        const { data: expenses } = await supabase
          .from('finance_expenses')
          .select('amount, category, notes, date')
          .eq('user_id', session.user.id)
          .gte('date', monthStart)
          .lte('date', monthEnd);

        // Fetch revenue
        const { data: payments } = await supabase
          .from('payments')
          .select('amount, description, payment_date')
          .eq('user_id', session.user.id)
          .gte('payment_date', monthStart)
          .lte('payment_date', monthEnd)
          .eq('status', 'completed');

        const totalExpenses = expenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
        const totalRevenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

        // Update financial context
        setFinancialContext({
          currentMonth: {
            revenue: totalRevenue,
            expenses: totalExpenses,
            profit: totalRevenue - totalExpenses
          },
          recentTransactions: [],
          budgets: []
        });
      } catch (error) {
        console.error('Error loading financial data:', error);
      }
    };

    loadHistory();
    loadFinancialData();
  }, [session?.user?.id]);

  // Auto-save chat on every message or financial context change
  useEffect(() => {
    if (messages.length > 1) { // Don't save just the welcome message
      const saveChat = async () => {
        await saulChatHistoryManager.autoSave(sessionId, messages, financialContext);
        const sessions = await saulChatHistoryManager.getAllSessions();
        setChatHistory(sessions);
      };
      saveChat();
    }
  }, [messages, financialContext, sessionId]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get user session token for authentication
      const authToken = session?.access_token;

      if (!authToken) {
        throw new Error('User not authenticated. Please log in and try again.');
      }

      // Call Supabase Edge Function for Saul AI processing
      const response = await fetch(`${supabaseUrl}/functions/v1/saul-finance-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          financialContext
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Saul API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || errorData.message || 'API request failed');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update financial context if Saul modified it
      if (data.updatedContext) {
        setFinancialContext(data.updatedContext);
      }

      // Handle PDF report generation
      if (data.functionResults) {
        const reportResult = data.functionResults.find(
          (result: any) => result.tool === 'generate_report' && result.success && result.data?.format === 'pdf'
        );

        if (reportResult && reportResult.data) {
          const reportData = reportResult.data;

          // Generate and download PDF
          try {
            downloadFinancialReportPDF({
              reportType: reportData.reportType,
              dateRange: reportData.dateRange,
              summary: reportData.summary,
              expenses: reportData.expenses,
              expensesByCategory: reportData.expensesByCategory,
              revenue: reportData.revenue,
              cashFlow: reportData.cashFlow,
              trends: reportData.trends
            });

            // Add a system message about the PDF download
            const pdfMessage: Message = {
              id: (Date.now() + 2).toString(),
              role: 'assistant',
              content: '📄 Your PDF report has been downloaded!',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, pdfMessage]);
          } catch (error) {
            console.error('PDF generation error:', error);
            const errorMsg: Message = {
              id: (Date.now() + 2).toString(),
              role: 'assistant',
              content: 'Sorry, there was an error generating the PDF. Please try again.',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
          }
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error.message || "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleNewChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: SAUL_WELCOME_MESSAGE,
        timestamp: new Date()
      }
    ]);
    setFinancialContext({
      currentMonth: { revenue: 0, expenses: 0, profit: 0 },
      recentTransactions: [],
      budgets: []
    });
    setShowHistory(false);
  };

  const handleLoadSession = (session: SaulChatSession) => {
    const messagesWithDates = session.messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
    setMessages(messagesWithDates);
    setFinancialContext(session.financialContext);
    setShowHistory(false);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await saulChatHistoryManager.deleteSession(sessionId);
    const sessions = await saulChatHistoryManager.getAllSessions();
    setChatHistory(sessions);
  };

  const handleDownloadReport = async () => {
    if (!session?.user?.id) {
      alert('Please log in to download reports');
      return;
    }

    try {
      // Get current month date range
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      // Fetch expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('finance_expenses')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date', { ascending: false });

      if (expensesError) throw expensesError;

      // Fetch revenue
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('payment_date', monthStart)
        .lte('payment_date', monthEnd)
        .eq('status', 'completed')
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Calculate totals
      const totalExpenses = expenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
      const totalRevenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

      // Prepare expense data for PDF
      const expenseList = expenses?.map(e => ({
        date: e.date,
        vendor: e.vendor || 'Unknown',
        category: e.category || 'Other',
        amount: parseFloat(e.amount || 0),
        notes: e.notes || ''
      })) || [];

      // Prepare revenue data for PDF
      const revenueList = payments?.map(p => ({
        date: p.payment_date,
        description: p.description || 'Payment',
        amount: parseFloat(p.amount || 0),
        paymentMethod: p.payment_method || 'Unknown'
      })) || [];

      // Group expenses by category
      const byCategory: Record<string, number> = {};
      expenses?.forEach(e => {
        const cat = e.category || 'Other';
        byCategory[cat] = (byCategory[cat] || 0) + parseFloat(e.amount || 0);
      });

      // Generate PDF
      downloadFinancialReportPDF({
        reportType: 'profit-loss',
        dateRange: { startDate: monthStart, endDate: monthEnd },
        summary: {
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100) : 0
        },
        expensesByCategory: byCategory,
        expenses: expenseList,
        revenue: revenueList
      });

    } catch (error: any) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    }
  };

  const profitMargin = financialContext.currentMonth.revenue > 0
    ? (financialContext.currentMonth.profit / financialContext.currentMonth.revenue) * 100
    : 0;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] sm:h-[calc(100vh-120px)] lg:h-[calc(100vh-200px)] max-w-6xl mx-auto gap-0 lg:gap-4">
      {/* Chat History Sidebar - Full screen on mobile */}
      {showHistory && (
        <div className="fixed inset-0 lg:relative lg:w-80 bg-white lg:rounded-lg shadow-lg overflow-y-auto z-50 lg:z-auto">
          {/* Mobile-optimized header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 lg:border-0 lg:static">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Chat History</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 -mr-2 text-gray-500 hover:text-gray-700 active:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handleNewChat}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              New Chat
            </button>
          </div>

          <div className="p-4 space-y-2">
            {chatHistory.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                No chat history yet
              </p>
            ) : (
              chatHistory.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleLoadSession(session)}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 active:bg-gray-200 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(session.updatedAt).toLocaleDateString()} at{' '}
                        {new Date(session.updatedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {session.messages.length} messages
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(session.sessionId, e)}
                      className="p-2 text-red-500 hover:text-red-700 active:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col bg-white lg:rounded-lg shadow-lg min-h-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600 flex-shrink-0 lg:rounded-t-lg">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <img
                src={saulLogo}
                alt="Saul"
                className="w-8 h-8"
              />
              <div>
                <h2 className="text-lg font-bold">Saul</h2>
                <p className="text-xs text-green-100 hidden sm:block">Your AI Finance Manager</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile Financial Summary Toggle */}
              <button
                onClick={() => setShowFinancials(!showFinancials)}
                className="lg:hidden p-2.5 hover:bg-green-600 active:bg-green-700 rounded-lg transition-colors"
                title="View Financial Summary"
              >
                <DollarSign className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-2.5 hover:bg-green-600 active:bg-green-700 rounded-lg transition-colors"
                title="Chat History"
              >
                <History className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              {/* Avatar - Hidden on mobile for user messages */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-blue-500 hidden sm:flex'
                    : 'bg-green-500'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <img
                    src={saulLogo}
                    alt="Saul"
                    className="w-6 h-6"
                  />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`flex-1 max-w-[85%] sm:max-w-[80%] px-4 py-3 rounded-xl ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white ml-auto rounded-tr-sm'
                    : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                  {message.content}
                </div>
                <div
                  className={`text-xs mt-1.5 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <img
                  src={saulLogo}
                  alt="Saul"
                  className="w-6 h-6"
                />
              </div>
              <div className="bg-gray-100 px-4 py-3 rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin text-green-500" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input - Mobile optimized with larger touch targets */}
        <div className="p-3 sm:p-4 border-t border-gray-200 flex-shrink-0 bg-white safe-area-inset-bottom">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Saul about your finances..."
              className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={handleDownloadReport}
              title="Download Monthly Report"
              className="px-3 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 active:scale-95 transition-all"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Financial Summary Panel - Desktop: Sidebar, Mobile: Bottom Sheet */}
      <div className={`
        ${showFinancials ? 'fixed inset-0 z-50 lg:relative' : 'hidden lg:block'}
        lg:w-80 bg-white lg:rounded-lg shadow-lg overflow-hidden
      `}>
        {/* Mobile overlay */}
        {showFinancials && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 -z-10"
            onClick={() => setShowFinancials(false)}
          />
        )}

        {/* Content container with sticky header on mobile */}
        <div className="h-full overflow-y-auto">
          {/* Sticky header on mobile */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 lg:border-0 lg:static z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Financial Summary
              </h3>
              {/* Mobile close button */}
              <button
                onClick={() => setShowFinancials(false)}
                className="lg:hidden p-2 -mr-2 text-gray-500 hover:text-gray-700 active:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-4">

            {/* Current Month Overview */}
            <div className="space-y-3 mb-6">
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                <div className="text-sm text-green-700 mb-1 font-medium">Revenue</div>
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(financialContext.currentMonth.revenue)}
                </div>
                <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  This month
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                <div className="text-sm text-red-700 mb-1 font-medium">Expenses</div>
                <div className="text-2xl font-bold text-red-900">
                  {formatCurrency(financialContext.currentMonth.expenses)}
                </div>
                <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                  <TrendingDown className="w-3 h-3" />
                  This month
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <div className="text-sm text-blue-700 mb-1 font-medium">Net Profit</div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(financialContext.currentMonth.profit)}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {profitMargin.toFixed(1)}% margin
                </div>
              </div>
            </div>

            {/* Expense Dashboard */}
            <div className="mt-6">
              <SaulExpenseDashboard
                sessionStartTime={sessionStartTime}
                userId={session?.user?.id}
                onRefresh={() => {
                  // Trigger a refresh of the financial context if needed
                  console.log('Expense dashboard refreshed');
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaulChatbot;
