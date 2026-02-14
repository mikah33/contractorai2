import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Send,
  Loader2,
  ChevronUp,
  Calculator,
  Users,
  DollarSign,
  Briefcase,
  FileText,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { detectMode, ContractorMode } from '../../lib/ai/contractor-config';
import ChatMessageContent from './ChatMessageContent';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface EstimateLineItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  type: 'material' | 'labor' | 'permit' | 'fee' | 'other';
  isCustom: boolean;
}

const modeConfig: Record<ContractorMode, { icon: React.ReactNode; label: string; color: string }> = {
  estimating: { icon: <Calculator className="w-4 h-4" />, label: 'Estimates', color: 'text-blue-500' },
  projects: { icon: <Briefcase className="w-4 h-4" />, label: 'Projects', color: 'text-purple-500' },
  crm: { icon: <Users className="w-4 h-4" />, label: 'Clients', color: 'text-blue-500' },
  finance: { icon: <DollarSign className="w-4 h-4" />, label: 'Finance', color: 'text-green-500' },
  general: { icon: <Sparkles className="w-4 h-4" />, label: 'General', color: 'text-blue-500' }
};

const GlobalAISearchBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<ContractorMode>('general');
  const [currentEstimate, setCurrentEstimate] = useState<EstimateLineItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalEstimate = currentEstimate.reduce((sum, item) => sum + item.totalPrice, 0);

  // Pages where the search bar should be hidden
  const hiddenPaths = ['/ai-team', '/auth', '/subscriptions', '/legal'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));

  // Auto-detect mode based on current page
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('estimate')) setCurrentMode('estimating');
    else if (path.includes('project')) setCurrentMode('projects');
    else if (path.includes('client')) setCurrentMode('crm');
    else if (path.includes('finance')) setCurrentMode('finance');
    else setCurrentMode('general');
  }, [location.pathname]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for expand event from MobileBottomNav
  useEffect(() => {
    const handleExpandEvent = () => {
      setIsExpanded(true);
    };
    window.addEventListener('openAIChat', handleExpandEvent);
    return () => window.removeEventListener('openAIChat', handleExpandEvent);
  }, []);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isExpanded && messages.length === 0) {
          setIsExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsExpanded(true);

    // Detect mode from message
    const detectedMode = detectMode(input);
    if (detectedMode !== 'general') {
      setCurrentMode(detectedMode);
    }

    try {
      // Format messages for the contractor-chat API (expects array of messages)
      const apiMessages = [
        ...messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        {
          role: 'user' as const,
          content: input.trim()
        }
      ];

      const response = await fetch(`${supabaseUrl}/functions/v1/contractor-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          messages: apiMessages,
          mode: currentMode,
          currentEstimate: currentEstimate
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: data.message || 'I apologize, but I encountered an issue processing your request.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle estimate updates from the AI
      if (data.updatedEstimate && data.updatedEstimate.length > 0) {
        setCurrentEstimate(data.updatedEstimate);
      }

    } catch (error) {
      console.error('AI request error:', error);
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setCurrentEstimate([]);
    setIsExpanded(false);
    setInput('');
  };

  const handleRemoveEstimateItem = (itemId: string) => {
    setCurrentEstimate(prev => prev.filter(item => item.id !== itemId));
  };

  const handleGenerateEstimate = () => {
    if (currentEstimate.length === 0) return;

    // Convert to estimate format
    const items = currentEstimate.map((item) => ({
      id: item.id,
      description: item.name,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      category: item.type
    }));

    const newEstimate = {
      id: crypto.randomUUID(),
      title: 'AI Generated Estimate',
      items,
      subtotal: totalEstimate,
      taxRate: 0,
      taxAmount: 0,
      total: totalEstimate,
      notes: '',
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Close and navigate to estimates page with the data
    setIsExpanded(false);
    navigate('/estimates', { state: { fromCalculator: true, calculatorData: newEstimate } });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (shouldHide) return null;

  if (!isExpanded) return null;

  return (
    <div
      ref={containerRef}
      className={`fixed left-0 right-0 top-0 bottom-0 z-[150] ${themeClasses.bg.primary} transition-all duration-300 ease-out`}
    >
      {/* Expanded Chat View */}
      {isExpanded && (
        <div className="flex flex-col h-full pt-[env(safe-area-inset-top)]">
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-5 ${themeClasses.bg.secondary} border-b ${theme === 'light' ? 'border-blue-300' : 'border-blue-500/30'}`}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="ContractorAI" className="w-14 h-14 object-cover" />
              </div>
              <div>
                <h2 className={`font-bold ${themeClasses.text.primary} text-2xl`}>Contractor AI</h2>
                <div className={`flex items-center gap-1 text-base ${themeClasses.text.secondary}`}>
                  <span className={modeConfig[currentMode].color}>{modeConfig[currentMode].label}</span>
                  <span>Mode</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {messages.length > 0 && (
                <button
                  onClick={handleClear}
                  className={`px-4 py-2 text-sm font-medium ${themeClasses.text.secondary} ${theme === 'light' ? 'bg-gray-200 hover:bg-gray-300' : 'bg-zinc-800 hover:text-white'} rounded-xl transition-colors`}
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className={`w-14 h-14 ${themeClasses.bg.tertiary} rounded-xl flex items-center justify-center ${themeClasses.text.secondary} hover:opacity-70 transition-colors`}
              >
                <ChevronUp className="w-7 h-7" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className={`text-lg font-semibold ${themeClasses.text.primary} mb-2`}>How can I help?</h3>
                <p className={`text-sm ${themeClasses.text.secondary} max-w-xs`}>
                  Ask me anything about estimates, projects, clients, or finances.
                </p>

                {/* Quick suggestions */}
                <div className="mt-6 grid grid-cols-2 gap-2 w-full max-w-sm">
                  {[
                    { text: 'Create an estimate', mode: 'estimating' as ContractorMode },
                    { text: 'Add a new client', mode: 'crm' as ContractorMode },
                    { text: 'Track expenses', mode: 'finance' as ContractorMode },
                    { text: 'Start a project', mode: 'projects' as ContractorMode }
                  ].map((suggestion) => (
                    <button
                      key={suggestion.text}
                      onClick={() => {
                        setInput(suggestion.text);
                        setCurrentMode(suggestion.mode);
                      }}
                      className={`p-3 text-left text-sm ${themeClasses.text.primary} ${themeClasses.bg.card} rounded-lg border ${theme === 'light' ? 'border-blue-300 hover:border-blue-400' : 'border-blue-500/20 hover:border-blue-500/50'} active:scale-[0.98] transition-all`}
                    >
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : `${themeClasses.bg.card} ${themeClasses.text.primary}`
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <ChatMessageContent content={message.content} />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className={`${themeClasses.bg.card} rounded-2xl px-4 py-3`}>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span className={`text-sm ${themeClasses.text.secondary}`}>Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Estimate Panel - Shows when estimate items exist */}
          {currentEstimate.length > 0 && (
            <div className={`border-t ${themeClasses.border.primary} ${themeClasses.bg.secondary} px-4 py-3`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className={`font-semibold ${themeClasses.text.primary} text-sm`}>Current Estimate</span>
                  <span className={`text-xs ${themeClasses.text.secondary}`}>({currentEstimate.length} items)</span>
                </div>
                <span className="font-bold text-blue-500">{formatCurrency(totalEstimate)}</span>
              </div>

              <div className="max-h-32 overflow-y-auto space-y-1 mb-3">
                {currentEstimate.map((item) => (
                  <div key={item.id} className={`flex items-center justify-between ${themeClasses.bg.card} rounded-lg px-3 py-2 text-xs`}>
                    <div className="flex-1 truncate">
                      <span className={`font-medium ${themeClasses.text.primary}`}>{item.name}</span>
                      <span className={`${themeClasses.text.secondary} ml-1`}>({item.quantity} {item.unit})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${themeClasses.text.primary}`}>{formatCurrency(item.totalPrice)}</span>
                      <button
                        onClick={() => handleRemoveEstimateItem(item.id)}
                        className="p-1 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleGenerateEstimate}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors active:scale-[0.98]"
              >
                <FileText className="w-5 h-5" />
                Create Estimate
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Input */}
          <div className={`px-4 pb-4 pt-2 ${themeClasses.bg.primary} border-t ${themeClasses.border.primary}`}>
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className={`w-full px-4 py-3 ${themeClasses.bg.card} ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'} rounded-xl border ${theme === 'light' ? 'border-blue-300 focus:border-blue-500' : 'border-blue-500/30 focus:border-blue-500'} focus:outline-none text-sm`}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-11 h-11 bg-blue-500 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Send className="w-5 h-5 text-white" />
                )}
              </button>
            </form>
            <div className="pb-safe" />
          </div>
        </div>
      )}

      {/* Collapsed state is now handled by MobileBottomNav */}
    </div>
  );
};

export default GlobalAISearchBar;
