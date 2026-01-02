import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  User,
  Loader2,
  History,
  Plus,
  X,
  Trash2,
  CheckCircle,
  XCircle,
  Mail,
  Calculator,
  Users,
  DollarSign,
  Briefcase,
  FileText,
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CONTRACTOR_WELCOME_MESSAGE, MODE_WELCOME_MESSAGES, detectMode, ContractorMode } from '../../lib/ai/contractor-config';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { contractorChatHistoryManager, ContractorChatSession } from '../../lib/ai/contractorChatHistory';
import ChatMessageContent from './ChatMessageContent';

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

interface EmailDraft {
  to: string | string[];
  subject: string;
  body: string;
  type: 'client' | 'employee';
}

interface ChatSession {
  id: string;
  sessionId: string;
  title: string;
  messages: Message[];
  estimate: EstimateLineItem[];
  updatedAt: string;
}

// Mode colors and icons
const modeConfig: Record<ContractorMode, { color: string; bgColor: string; icon: React.ReactNode; label: string }> = {
  estimating: { color: 'orange', bgColor: 'from-orange-500 to-orange-600', icon: <Calculator className="w-5 h-5" />, label: 'Estimating' },
  projects: { color: 'purple', bgColor: 'from-purple-500 to-purple-600', icon: <Briefcase className="w-5 h-5" />, label: 'Projects' },
  crm: { color: 'blue', bgColor: 'from-blue-500 to-blue-600', icon: <Users className="w-5 h-5" />, label: 'CRM' },
  finance: { color: 'green', bgColor: 'from-green-500 to-green-600', icon: <DollarSign className="w-5 h-5" />, label: 'Finance' },
  general: { color: 'gray', bgColor: 'from-gray-600 to-gray-700', icon: <Briefcase className="w-5 h-5" />, label: 'General' }
};

interface ContractorChatbotProps {
  initialMode?: ContractorMode;
}

export const ContractorChatbot: React.FC<ContractorChatbotProps> = ({ initialMode = 'general' }) => {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [sessionId] = useState(() => `contractor-session-${Date.now()}`);
  const [currentMode, setCurrentMode] = useState<ContractorMode>(initialMode);

  // Get the appropriate welcome message based on initial mode
  const getWelcomeMessage = (mode: ContractorMode) => {
    return MODE_WELCOME_MESSAGES[mode] || CONTRACTOR_WELCOME_MESSAGE;
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: getWelcomeMessage(initialMode),
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentEstimate, setCurrentEstimate] = useState<EstimateLineItem[]>([]);
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      const sessions = await contractorChatHistoryManager.getAllSessions();
      setChatHistory(sessions);
    };
    loadHistory();
  }, []);

  // Auto-save chat after messages change (debounced)
  useEffect(() => {
    if (messages.length <= 1) return; // Don't save just welcome message

    const saveTimer = setTimeout(async () => {
      await contractorChatHistoryManager.autoSave(
        sessionId,
        messages,
        currentEstimate,
        currentMode
      );
      // Refresh history list
      const sessions = await contractorChatHistoryManager.getAllSessions();
      setChatHistory(sessions);
    }, 1000); // Debounce 1 second

    return () => clearTimeout(saveTimer);
  }, [messages, currentEstimate, currentMode, sessionId]);

  // Detect mode from input
  useEffect(() => {
    if (input.trim()) {
      const detected = detectMode(input);
      if (detected !== 'general') {
        setCurrentMode(detected);
      }
    }
  }, [input]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    // Detect mode from message
    const detectedMode = detectMode(input.trim());
    if (detectedMode !== 'general') {
      setCurrentMode(detectedMode);
    }

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const authToken = session?.access_token;
      if (!authToken) {
        throw new Error('Please log in to continue.');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/contractor-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          currentEstimate,
          mode: currentMode
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Request failed');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle estimate updates
      if (data.updatedEstimate) {
        setCurrentEstimate(data.updatedEstimate);
      }

      // Handle email drafts
      if (data.emailDraft) {
        setEmailDraft(data.emailDraft);
      }

      // Update detected mode
      if (data.detectedMode) {
        setCurrentMode(data.detectedMode);
      }

    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error.message || "I'm having trouble right now. Please try again.",
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

  const handleApproveEmail = async () => {
    if (!emailDraft) return;
    setSendingEmail(true);

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-gmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          to: Array.isArray(emailDraft.to) ? emailDraft.to.join(', ') : emailDraft.to,
          subject: emailDraft.subject,
          body: emailDraft.body
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      const successMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Email sent successfully to ${Array.isArray(emailDraft.to) ? emailDraft.to.join(', ') : emailDraft.to}!`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);
      setEmailDraft(null);

    } catch (error: any) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Failed to send email: ${error.message}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleRejectEmail = () => {
    setEmailDraft(null);
    const message: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: "Email cancelled. Let me know if you'd like to make changes.",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const handleNewChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: getWelcomeMessage(currentMode),
        timestamp: new Date()
      }
    ]);
    setCurrentEstimate([]);
    setEmailDraft(null);
    setShowHistory(false);
  };

  const handleLoadSession = (session: ContractorChatSession) => {
    setMessages(session.messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp)
    })));
    setCurrentEstimate(session.estimate || []);
    setCurrentMode(session.mode || 'general');
    setShowHistory(false);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionIdToDelete: string) => {
    e.stopPropagation(); // Prevent triggering load
    await contractorChatHistoryManager.deleteSession(sessionIdToDelete);
    const sessions = await contractorChatHistoryManager.getAllSessions();
    setChatHistory(sessions);
  };

  const handleRemoveEstimateItem = (itemId: string) => {
    setCurrentEstimate(prev => prev.filter(item => item.id !== itemId));
  };

  const handleGenerateEstimate = () => {
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const items = currentEstimate.map((item) => ({
      id: item.id,
      description: item.name,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      type: item.type
    }));

    const total = currentEstimate.reduce((sum, item) => sum + item.totalPrice, 0);

    const newEstimate = {
      id: generateUUID(),
      title: 'AI Generated Estimate',
      clientName: '',
      projectName: '',
      items: items,
      subtotal: total,
      taxRate: 0,
      taxAmount: 0,
      total: total,
      status: 'draft' as const,
      notes: 'Generated by Contractor AI',
      terms: 'Valid for 30 days.',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toDateString()
    };

    navigate('/estimates', { state: { fromCalculator: true, calculatorData: newEstimate } });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const totalEstimate = currentEstimate.reduce((sum, item) => sum + item.totalPrice, 0);
  const config = modeConfig[currentMode];

  return (
    <div className="flex flex-col lg:flex-row h-full max-w-6xl mx-auto gap-0 lg:gap-4 p-2 sm:p-4 overflow-hidden">
      {/* Chat History Sidebar */}
      {showHistory && (
        <div className="fixed inset-0 lg:relative lg:w-80 bg-white lg:rounded-lg shadow-lg overflow-y-auto z-50 lg:z-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 lg:border-0 lg:static">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Chat History</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 -mr-2 text-gray-500 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handleNewChat}
              className={`w-full px-4 py-3 bg-gradient-to-r ${config.bgColor} text-white rounded-lg hover:opacity-90 flex items-center justify-center gap-2 font-medium`}
            >
              <Plus className="w-5 h-5" />
              New Chat
            </button>
          </div>

          <div className="p-4 space-y-2">
            {chatHistory.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No chat history yet</p>
            ) : (
              chatHistory.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleLoadSession(session)}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer group relative"
                >
                  <p className="text-sm font-medium text-gray-900 truncate pr-8">{session.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(session.updatedAt).toLocaleDateString()}
                  </p>
                  <button
                    onClick={(e) => handleDeleteSession(e, session.sessionId)}
                    className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col bg-[#1A1A1A] lg:rounded-lg shadow-lg min-h-0">
        {/* Header */}
        <div className={`p-4 border-b border-gray-200 bg-gradient-to-r ${config.bgColor} flex-shrink-0 lg:rounded-t-lg`}>
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                {config.icon}
              </div>
              <div>
                <h2 className="text-lg font-bold">Contractor</h2>
                <p className="text-xs opacity-80 hidden sm:block">
                  {config.label} Mode
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Mode Indicator Pills */}
              <div className="hidden sm:flex items-center gap-1 bg-white/20 rounded-full px-2 py-1">
                <button
                  onClick={() => setCurrentMode('estimating')}
                  className={`p-1.5 rounded-full transition-colors ${currentMode === 'estimating' ? 'bg-white/30' : 'hover:bg-white/10'}`}
                  title="Estimating"
                >
                  <Calculator className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentMode('projects')}
                  className={`p-1.5 rounded-full transition-colors ${currentMode === 'projects' ? 'bg-white/30' : 'hover:bg-white/10'}`}
                  title="Projects"
                >
                  <Briefcase className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentMode('crm')}
                  className={`p-1.5 rounded-full transition-colors ${currentMode === 'crm' ? 'bg-white/30' : 'hover:bg-white/10'}`}
                  title="CRM"
                >
                  <Users className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentMode('finance')}
                  className={`p-1.5 rounded-full transition-colors ${currentMode === 'finance' ? 'bg-white/30' : 'hover:bg-white/10'}`}
                  title="Finance"
                >
                  <DollarSign className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="lg:hidden p-2.5 hover:bg-white/20 rounded-lg"
                title="View Details"
              >
                <FileText className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-2.5 hover:bg-white/20 rounded-lg"
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
              className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' ? 'bg-gray-500 hidden sm:flex' : `bg-${config.color}-500`
                }`}
                style={message.role !== 'user' ? { backgroundColor: config.color === 'orange' ? '#f97316' : config.color === 'purple' ? '#a855f7' : config.color === 'blue' ? '#3b82f6' : config.color === 'green' ? '#22c55e' : '#6b7280' } : {}}
              >
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  config.icon
                )}
              </div>

              <div
                className={`flex-1 max-w-[85%] sm:max-w-[80%] px-4 py-3 rounded-xl ${
                  message.role === 'user'
                    ? 'bg-[#3A3A3A] text-white ml-auto rounded-tr-sm'
                    : 'bg-[#242424] text-white rounded-tl-sm border border-white/10'
                }`}
              >
                <ChatMessageContent
                  content={message.content}
                  isUser={message.role === 'user'}
                />
                <div className={`text-xs mt-1.5 ${message.role === 'user' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Email Draft Approval */}
          {emailDraft && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-yellow-800 font-semibold">
                <Mail className="w-5 h-5" />
                Email Draft - Awaiting Approval
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-xs font-semibold text-gray-600">To:</div>
                  <div className="text-sm text-gray-900">
                    {Array.isArray(emailDraft.to) ? emailDraft.to.join(', ') : emailDraft.to}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-600">Subject:</div>
                  <div className="text-sm text-gray-900">{emailDraft.subject}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-600">Message:</div>
                  <div className="text-sm text-gray-900 whitespace-pre-wrap bg-white p-3 rounded border">
                    {emailDraft.body}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleApproveEmail}
                  disabled={sendingEmail}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {sendingEmail ? 'Sending...' : 'Approve & Send'}
                </button>
                <button
                  onClick={handleRejectEmail}
                  disabled={sendingEmail}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: config.color === 'orange' ? '#f97316' : config.color === 'purple' ? '#a855f7' : config.color === 'blue' ? '#3b82f6' : config.color === 'green' ? '#22c55e' : '#6b7280' }}
              >
                {config.icon}
              </div>
              <div className="bg-[#242424] px-4 py-3 rounded-xl border border-white/10">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 sm:p-4 border-t border-white/10 flex-shrink-0 bg-[#1A1A1A]">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Contractor anything..."
              className="flex-1 px-4 py-3 text-base bg-[#141414] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className={`px-4 py-3 bg-gradient-to-r ${config.bgColor} text-white rounded-xl hover:opacity-90 disabled:bg-zinc-700 disabled:cursor-not-allowed transition-all`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Estimate/Context Panel */}
      <div className={`
        ${showSidebar ? 'fixed inset-0 z-50 lg:relative' : 'hidden lg:block'}
        lg:w-80 bg-white lg:rounded-lg shadow-lg overflow-hidden
      `}>
        {showSidebar && (
          <div className="lg:hidden fixed inset-0 bg-black/50 -z-10" onClick={() => setShowSidebar(false)} />
        )}

        <div className="h-full overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 lg:border-0 lg:static z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {currentMode === 'estimating' ? 'Current Estimate' : 'Quick Info'}
              </h3>
              <button
                onClick={() => setShowSidebar(false)}
                className="lg:hidden p-2 -mr-2 text-gray-500 hover:text-gray-700 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-4">
            {currentMode === 'estimating' && currentEstimate.length > 0 ? (
              <div className="space-y-3">
                {currentEstimate.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 group hover:border-red-300"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm text-gray-900 flex-1">{item.name}</span>
                      <button
                        onClick={() => handleRemoveEstimateItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                    <div className="text-xs text-gray-600">
                      {item.quantity} {item.unit} x {formatCurrency(item.unitPrice)}
                    </div>
                    <div className="text-sm font-semibold text-gray-900 mt-1">
                      {formatCurrency(item.totalPrice)}
                    </div>
                  </div>
                ))}

                <div className="pt-3 mt-3 border-t border-gray-300">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-orange-600">
                      {formatCurrency(totalEstimate)}
                    </span>
                  </div>

                  <button
                    onClick={handleGenerateEstimate}
                    className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center justify-center gap-2 font-semibold"
                  >
                    <FileText className="w-5 h-5" />
                    Generate Estimate
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
                  <p className="text-gray-500 text-sm">
                    {currentMode === 'estimating'
                      ? 'Start chatting to build your estimate!'
                      : 'Context information will appear here based on your conversation.'}
                  </p>
                </div>

                {/* Mode-specific quick actions */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick Actions</p>
                  {currentMode === 'finance' && (
                    <>
                      <button className="w-full p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 text-left">
                        Add Expense
                      </button>
                      <button className="w-full p-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 text-left">
                        View Reports
                      </button>
                    </>
                  )}
                  {currentMode === 'projects' && (
                    <>
                      <button className="w-full p-3 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 text-left">
                        View Schedule
                      </button>
                      <button className="w-full p-3 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 text-left">
                        Team Availability
                      </button>
                    </>
                  )}
                  {currentMode === 'crm' && (
                    <>
                      <button className="w-full p-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 text-left">
                        View All Clients
                      </button>
                      <button className="w-full p-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 text-left">
                        Add New Client
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractorChatbot;
