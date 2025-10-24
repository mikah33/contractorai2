import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Loader2, DollarSign, History, Plus, X, TrendingUp, TrendingDown } from 'lucide-react';
import { SAUL_WELCOME_MESSAGE } from '../../lib/ai/saul-config';
import saulLogo from '../../assets/icons/saul-logo.svg';

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

interface ChatSession {
  id: string;
  sessionId: string;
  title: string;
  messages: Message[];
  financialContext: FinancialContext;
  updatedAt: string;
}

export const SaulChatbot: React.FC = () => {
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
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      // Call Supabase Edge Function for Saul AI processing
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/saul-finance-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          financialContext
        })
      });

      if (!response.ok) throw new Error('API request failed');

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
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
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
    setShowHistory(false);
  };

  const profitMargin = financialContext.currentMonth.revenue > 0
    ? (financialContext.currentMonth.profit / financialContext.currentMonth.revenue) * 100
    : 0;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] sm:h-[calc(100vh-200px)] max-w-6xl mx-auto gap-2 sm:gap-4">
      {/* Chat History Sidebar - Full screen on mobile */}
      {showHistory && (
        <div className="fixed inset-0 lg:relative lg:w-80 bg-white lg:rounded-lg shadow-lg p-4 overflow-y-auto z-50 lg:z-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Chat History</h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <button
            onClick={handleNewChat}
            className="w-full mb-4 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>

          <div className="space-y-2">
            {chatHistory.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No chat history yet
              </p>
            ) : (
              chatHistory.map((session) => (
                <div
                  key={session.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {session.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(session.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col bg-white rounded-lg shadow-lg min-h-0">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600 flex-shrink-0">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2 sm:gap-3">
              <img
                src={saulLogo}
                alt="Saul"
                className="w-6 h-6 sm:w-8 sm:h-8"
              />
              <div>
                <h2 className="text-base sm:text-lg font-bold">Saul</h2>
                <p className="text-[10px] sm:text-xs text-green-100 hidden sm:block">Your AI Finance Manager</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Mobile Financial Summary Toggle */}
              <button
                onClick={() => setShowFinancials(!showFinancials)}
                className="lg:hidden p-2 hover:bg-green-600 rounded-lg transition-colors"
                title="View Financial Summary"
              >
                <DollarSign className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-2 hover:bg-green-600 rounded-lg transition-colors"
                title="Chat History"
              >
                <History className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-blue-500 hidden sm:flex'
                    : 'bg-green-500'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                ) : (
                  <img
                    src={saulLogo}
                    alt="Saul"
                    className="w-5 h-5 sm:w-6 sm:h-6"
                  />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`flex-1 sm:max-w-[80%] px-3 py-2 sm:px-4 sm:py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white ml-auto'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap break-words text-sm sm:text-base">
                  {message.content}
                </div>
                <div
                  className={`text-[10px] sm:text-xs mt-1 ${
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
              <div className="bg-gray-100 px-4 py-3 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-green-500" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-2 sm:p-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 sm:px-4 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Financial Summary Panel - Desktop: Sidebar, Mobile: Modal */}
      <div className={`
        ${showFinancials ? 'fixed inset-0 z-50 lg:relative' : 'hidden lg:block'}
        lg:w-80 bg-white rounded-lg shadow-lg p-4 overflow-y-auto
      `}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Financial Summary
          </h3>
          {/* Mobile close button */}
          <button
            onClick={() => setShowFinancials(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700 p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Current Month Overview */}
        <div className="space-y-3 mb-6">
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
            <div className="text-sm text-green-700 mb-1">Revenue</div>
            <div className="text-2xl font-bold text-green-900">
              {formatCurrency(financialContext.currentMonth.revenue)}
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
              <TrendingUp className="w-3 h-3" />
              This month
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
            <div className="text-sm text-red-700 mb-1">Expenses</div>
            <div className="text-2xl font-bold text-red-900">
              {formatCurrency(financialContext.currentMonth.expenses)}
            </div>
            <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
              <TrendingDown className="w-3 h-3" />
              This month
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700 mb-1">Net Profit</div>
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(financialContext.currentMonth.profit)}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {profitMargin.toFixed(1)}% margin
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Activity</h4>
          {financialContext.recentTransactions.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No recent transactions
            </p>
          ) : (
            <div className="space-y-2">
              {financialContext.recentTransactions.slice(0, 5).map((transaction, index) => (
                <div
                  key={index}
                  className="p-2 bg-gray-50 rounded border border-gray-200 text-sm"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-gray-900 font-medium">
                      {transaction.description}
                    </span>
                    <span className={`font-semibold ${
                      transaction.type === 'revenue' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'revenue' ? '+' : '-'}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(transaction.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaulChatbot;
