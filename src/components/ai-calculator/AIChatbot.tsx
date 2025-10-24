import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Loader2, FileText, History, Trash2, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WELCOME_MESSAGE } from '../../lib/ai/chatbot-config';
import { chatHistoryManager, ChatSession } from '../../lib/ai/chatHistory';

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

export const AIChatbot: React.FC = () => {
  const navigate = useNavigate();
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: WELCOME_MESSAGE,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentEstimate, setCurrentEstimate] = useState<EstimateLineItem[]>([]);

  const handleRemoveItem = (itemId: string) => {
    setCurrentEstimate(prev => prev.filter(item => item.id !== itemId));
  };
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount and load chat history
  useEffect(() => {
    inputRef.current?.focus();
    const loadHistory = async () => {
      const sessions = await chatHistoryManager.getAllSessions();
      setChatHistory(sessions);
    };
    loadHistory();
  }, []);

  // Auto-save chat on every message or estimate change
  useEffect(() => {
    if (messages.length > 1) { // Don't save just the welcome message
      const saveChat = async () => {
        await chatHistoryManager.autoSave(sessionId, messages, currentEstimate);
        const sessions = await chatHistoryManager.getAllSessions();
        setChatHistory(sessions);
      };
      saveChat();
    }
  }, [messages, currentEstimate, sessionId]);

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
      // Call Supabase Edge Function for AI processing
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-calculator-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          currentEstimate
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

      // Update current estimate if AI modified it
      if (data.updatedEstimate) {
        setCurrentEstimate(data.updatedEstimate);
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

  const totalEstimate = currentEstimate.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleNewChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: WELCOME_MESSAGE,
        timestamp: new Date()
      }
    ]);
    setCurrentEstimate([]);
    setShowHistory(false);
  };

  const handleLoadSession = (session: ChatSession) => {
    // Convert timestamp strings back to Date objects
    const messagesWithDates = session.messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
    setMessages(messagesWithDates);
    setCurrentEstimate(session.estimate);
    setShowHistory(false);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await chatHistoryManager.deleteSession(sessionId);
    const sessions = await chatHistoryManager.getAllSessions();
    setChatHistory(sessions);
  };

  const handleGenerateEstimate = () => {
    // Generate UUID v4 for estimate ID
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // Create estimate items from AI chatbot line items
    const items = currentEstimate.map((item) => ({
      id: item.id,
      description: item.name,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      type: item.type
    }));

    // Create new estimate
    const newEstimate = {
      id: generateUUID(),
      title: 'AI Generated Estimate',
      clientName: '',
      projectName: '',
      items: items,
      subtotal: totalEstimate,
      taxRate: 0,
      taxAmount: 0,
      total: totalEstimate,
      status: 'draft' as const,
      notes: 'Generated from AI Estimating Assistant',
      terms: 'Valid for 30 days from the date of issue.',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toDateString()
    };

    // Navigate to estimate page with the AI data
    navigate('/estimates', { state: { fromCalculator: true, calculatorData: newEstimate } });
  };

  return (
    <div className="flex h-[calc(100vh-200px)] max-w-6xl mx-auto gap-4">
      {/* Chat History Sidebar */}
      {showHistory && (
        <div className="w-80 bg-white rounded-lg shadow-lg p-4 overflow-y-auto">
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
            className="w-full mb-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
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
                  onClick={() => handleLoadSession(session)}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
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
                        {session.messages.length} messages • {session.estimate.length} items
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(session.sessionId, e)}
                      className="text-red-500 hover:text-red-700 p-1"
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
      <div className="flex-1 flex flex-col bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-orange-600">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <img
                src="/src/assets/icons/hank-logo.svg"
                alt="Hank"
                className="w-8 h-8"
              />
              <div>
                <h2 className="text-lg font-bold">Hank</h2>
                <p className="text-xs text-orange-100">Your AI Estimating Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 hover:bg-orange-600 rounded-lg transition-colors"
              title="Chat History"
            >
              <History className="w-5 h-5" />
            </button>
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
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-blue-500'
                    : 'bg-orange-500'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <img
                    src="/src/assets/icons/hank-logo.svg"
                    alt="Hank"
                    className="w-6 h-6"
                  />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`flex-1 max-w-[80%] px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white ml-auto'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
                <div
                  className={`text-xs mt-1 ${
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
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                <img
                  src="/src/assets/icons/hank-logo.svg"
                  alt="Hank"
                  className="w-6 h-6"
                />
              </div>
              <div className="bg-gray-100 px-4 py-3 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Estimate Preview Panel */}
      <div className="w-80 bg-white rounded-lg shadow-lg p-4 overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Current Estimate
        </h3>

        {currentEstimate.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            No items yet. Start chatting to build your estimate!
          </p>
        ) : (
          <div className="space-y-3">
            {currentEstimate.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200 group hover:border-red-300 transition-colors"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm text-gray-900 flex-1">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {item.isCustom && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                        Custom
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                      title="Remove item"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}
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
                className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                <FileText className="w-5 h-5" />
                Generate Estimate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChatbot;
