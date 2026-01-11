import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  X,
  Loader2,
  Calculator,
  Users,
  DollarSign,
  Briefcase,
  Minus,
  FileText,
  ChevronRight,
  Trash2,
  History,
  Plus,
  Camera
} from 'lucide-react';
import { MODE_WELCOME_MESSAGES, ContractorMode } from '../../lib/ai/contractor-config';
import { useAuthStore } from '../../stores/authStore';
import ChatMessageContent from './ChatMessageContent';
import { contractorChatHistoryManager, ContractorChatSession } from '../../lib/ai/contractorChatHistory';
import { supabase } from '../../lib/supabase';

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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface AIChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ContractorMode;
  onEstimateCreated?: (estimate: any) => void;
  onProjectUpdate?: (updates: any) => void;
  initialSession?: ContractorChatSession;
  initialContext?: {
    estimateId?: string;
    title?: string;
    clientName?: string;
    projectName?: string;
    items?: any[];
    subtotal?: number;
    taxRate?: number;
    taxAmount?: number;
    total?: number;
    notes?: string;
  };
  projectContext?: {
    id: string;
    name: string;
    client?: string;
    description?: string;
    status?: string;
    priority?: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
    spent?: number;
    progress?: number;
    team?: any[];
  };
}

const modeConfig: Record<ContractorMode, { color: string; bgColor: string; icon: React.ReactNode; label: string }> = {
  estimating: { color: 'orange', bgColor: 'from-orange-500 to-orange-600', icon: <Calculator className="w-5 h-5" />, label: 'Estimating' },
  projects: { color: 'purple', bgColor: 'from-purple-500 to-purple-600', icon: <Briefcase className="w-5 h-5" />, label: 'Projects' },
  crm: { color: 'blue', bgColor: 'from-blue-500 to-blue-600', icon: <Users className="w-5 h-5" />, label: 'Clients' },
  finance: { color: 'green', bgColor: 'from-green-500 to-green-600', icon: <DollarSign className="w-5 h-5" />, label: 'Finance' },
  general: { color: 'gray', bgColor: 'from-gray-600 to-gray-700', icon: <Briefcase className="w-5 h-5" />, label: 'General' }
};

const AIChatPopup: React.FC<AIChatPopupProps> = ({ isOpen, onClose, mode, onEstimateCreated, onProjectUpdate, initialSession, initialContext, projectContext }) => {
  const { session } = useAuthStore();
  const navigate = useNavigate();
  const [sessionId] = useState(() => initialSession?.sessionId || `popup-session-${Date.now()}`);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentEstimate, setCurrentEstimate] = useState<EstimateLineItem[]>([]);
  const [showEstimatePanel, setShowEstimatePanel] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<ContractorChatSession[]>([]);

  // Photo upload state for finance mode
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ url: string; file: File } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = modeConfig[mode];
  const totalEstimate = currentEstimate.reduce((sum, item) => sum + item.totalPrice, 0);

  // Load chat history
  useEffect(() => {
    const loadHistory = async () => {
      const sessions = await contractorChatHistoryManager.getAllSessions();
      // Filter by mode if needed
      const filtered = sessions.filter(s => s.mode === mode);
      setChatHistory(filtered);
    };
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, mode]);

  // Auto-save chat
  useEffect(() => {
    if (messages.length <= 1) return;

    const saveTimer = setTimeout(async () => {
      await contractorChatHistoryManager.autoSave(
        sessionId,
        messages,
        currentEstimate,
        mode
      );
      // Refresh history
      const sessions = await contractorChatHistoryManager.getAllSessions();
      const filtered = sessions.filter(s => s.mode === mode);
      setChatHistory(filtered);
    }, 1000);

    return () => clearTimeout(saveTimer);
  }, [messages, currentEstimate, mode, sessionId]);

  // Format estimate context for AI
  const formatEstimateContext = () => {
    if (!initialContext) return '';

    let contextStr = `\n\n📋 **Current Estimate:**\n`;
    if (initialContext.title) contextStr += `• Title: ${initialContext.title}\n`;
    if (initialContext.clientName) contextStr += `• Client: ${initialContext.clientName}\n`;
    if (initialContext.projectName) contextStr += `• Project: ${initialContext.projectName}\n`;

    if (initialContext.items && initialContext.items.length > 0) {
      contextStr += `\n**Line Items:**\n`;
      initialContext.items.forEach((item, i) => {
        contextStr += `${i + 1}. ${item.description} - Qty: ${item.quantity} ${item.unit || ''} @ $${item.unitPrice?.toFixed(2) || '0.00'} = $${item.totalPrice?.toFixed(2) || '0.00'}\n`;
      });
    }

    contextStr += `\n**Totals:**\n`;
    contextStr += `• Subtotal: $${initialContext.subtotal?.toFixed(2) || '0.00'}\n`;
    if (initialContext.taxRate) contextStr += `• Tax (${initialContext.taxRate}%): $${initialContext.taxAmount?.toFixed(2) || '0.00'}\n`;
    contextStr += `• Total: $${initialContext.total?.toFixed(2) || '0.00'}\n`;

    if (initialContext.notes) contextStr += `\n**Notes:** ${initialContext.notes}\n`;

    return contextStr;
  };

  // Format project context for AI
  const formatProjectContext = () => {
    if (!projectContext) return '';

    let contextStr = `\n\n📁 **Current Project:**\n`;
    contextStr += `• Name: ${projectContext.name}\n`;
    if (projectContext.client) contextStr += `• Client: ${projectContext.client}\n`;
    if (projectContext.description) contextStr += `• Description: ${projectContext.description}\n`;
    if (projectContext.status) contextStr += `• Status: ${projectContext.status}\n`;
    if (projectContext.priority) contextStr += `• Priority: ${projectContext.priority}\n`;
    if (projectContext.startDate) contextStr += `• Start Date: ${new Date(projectContext.startDate).toLocaleDateString()}\n`;
    if (projectContext.endDate) contextStr += `• End Date: ${new Date(projectContext.endDate).toLocaleDateString()}\n`;
    if (projectContext.budget !== undefined) contextStr += `• Budget: $${projectContext.budget.toLocaleString()}\n`;
    if (projectContext.spent !== undefined) contextStr += `• Spent: $${projectContext.spent.toLocaleString()}\n`;
    if (projectContext.progress !== undefined) contextStr += `• Progress: ${projectContext.progress}%\n`;
    if (projectContext.team && projectContext.team.length > 0) {
      contextStr += `• Team: ${projectContext.team.map((m: any) => typeof m === 'string' ? m : m.name).join(', ')}\n`;
    }

    return contextStr;
  };

  // Initialize messages when opened or mode changes
  useEffect(() => {
    if (isOpen) {
      // If we have an initial session from history, load it
      if (initialSession && initialSession.messages.length > 0) {
        const loadedMessages = initialSession.messages
          .filter(m => m.role !== 'system') // Filter out system messages
          .map(m => ({
            id: m.id || String(Date.now() + Math.random()),
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)
          }));
        setMessages(loadedMessages);
        if (initialSession.estimate && initialSession.estimate.length > 0) {
          setCurrentEstimate(initialSession.estimate);
        }
        setIsMinimized(false);
        setTimeout(() => inputRef.current?.focus(), 300);
        return;
      }

      let welcomeMessage = MODE_WELCOME_MESSAGES[mode] || MODE_WELCOME_MESSAGES.general;

      // Add custom welcome for editing existing estimate
      if (initialContext && initialContext.estimateId) {
        welcomeMessage = `Hey! I can help you edit this estimate. Here's what I see:${formatEstimateContext()}\nWhat would you like to change? I can add items, adjust prices, update quantities, or make any other modifications.`;
      }

      // Add custom welcome for project context
      if (projectContext && projectContext.id) {
        welcomeMessage = `Hey! I can help you manage this project. Here's what I see:${formatProjectContext()}\nWhat would you like to do? I can update the project name, client, dates, status, priority, budget, or description.`;
      }

      setMessages([{
        id: '1',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      }]);
      setIsMinimized(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, mode, initialContext?.estimateId, projectContext?.id, initialSession]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      const authToken = session?.access_token;
      if (!authToken) throw new Error('Please log in to continue.');

      const response = await fetch(`${supabaseUrl}/functions/v1/contractor-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          mode,
          currentEstimate,
          estimateContext: initialContext || undefined,
          projectContext: projectContext || undefined
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

      // Handle estimate creation callback
      if (data.updatedEstimate && data.updatedEstimate.length > 0) {
        setCurrentEstimate(data.updatedEstimate);
        setShowEstimatePanel(true);
        if (onEstimateCreated) {
          onEstimateCreated(data.updatedEstimate);
        }
      }

      // Handle project update callback
      if (data.projectUpdates && onProjectUpdate) {
        onProjectUpdate(data.projectUpdates);
      }

    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error.message || "Something went wrong. Please try again.",
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

  // Photo upload handlers for finance mode
  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      // Create preview URL
      const url = URL.createObjectURL(file);
      setAttachedImage({ url, file });

      // Upload to Supabase storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `receipt_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipt-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipt-images')
        .getPublicUrl(uploadData.path);

      // Process with OCR
      await processReceiptOCR(file, publicUrl);

    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
      setAttachedImage(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const processReceiptOCR = async (file: File, imageUrl: string) => {
    try {
      const n8nWebhookUrl = 'https://contractorai.app.n8n.cloud/webhook/d718a3b9-fd46-4ce2-b885-f2a18ad4d98a';

      const formData = new FormData();
      formData.append('file', file);

      const webhookResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        body: formData,
      });

      if (webhookResponse.ok) {
        const responseText = await webhookResponse.text();
        if (responseText) {
          // Send OCR results automatically to AI chat
          const ocrMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: `I uploaded a receipt image. Here's what OCR extracted: ${responseText}. Please help me process this expense and extract the key details like vendor, amount, date, and category.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, ocrMessage]);

          // Trigger AI response
          sendMessageToAI(ocrMessage.content, imageUrl);
        }
      }
    } catch (error) {
      console.error('OCR processing failed:', error);
      // Still send the image to AI even if OCR fails
      const imageMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `I uploaded a receipt image. Can you help me extract the vendor, amount, date, and category from this receipt?`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, imageMessage]);
      sendMessageToAI(imageMessage.content, imageUrl);
    }
  };

  const sendMessageToAI = async (content: string, imageUrl?: string) => {
    setIsLoading(true);
    try {
      const authToken = session?.access_token;
      if (!authToken) throw new Error('Please log in to continue.');

      const contextualPrompt = mode === 'finance' && imageUrl
        ? `${content}\n\nImage URL: ${imageUrl}\n\nContext: I need help processing this receipt/expense. Please extract key details like vendor, amount, date, and suggest an expense category.`
        : content;

      const response = await fetch(`${supabaseUrl}/functions/v1/contractor-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          message: contextualPrompt,
          mode: mode,
          sessionId: sessionId,
          context: initialContext,
          projectContext: projectContext
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'I apologize, but I encountered an error processing your request.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Save to history
      await contractorChatHistoryManager.saveMessage(sessionId, {
        role: 'user',
        content: content,
        timestamp: new Date().toISOString(),
        mode: mode
      });

      await contractorChatHistoryManager.saveMessage(sessionId, {
        role: 'assistant',
        content: aiMessage.content,
        timestamp: new Date().toISOString(),
        mode: mode
      });

    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const removeAttachedImage = () => {
    if (attachedImage?.url) {
      URL.revokeObjectURL(attachedImage.url);
    }
    setAttachedImage(null);
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

    // Close popup and navigate to estimates page with the data
    onClose();
    navigate('/estimates', { state: { fromCalculator: true, calculatorData: newEstimate } });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleNewChat = () => {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: MODE_WELCOME_MESSAGES[mode] || MODE_WELCOME_MESSAGES.general,
      timestamp: new Date()
    }]);
    setCurrentEstimate([]);
    setShowHistory(false);
  };

  const handleLoadSession = (chatSession: ContractorChatSession) => {
    const loadedMessages = chatSession.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        id: m.id || String(Date.now() + Math.random()),
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)
      }));
    setMessages(loadedMessages);
    setCurrentEstimate(chatSession.estimate || []);
    setShowHistory(false);
  };

  const handleDeleteSession = async (e: React.MouseEvent, chatSessionId: string) => {
    e.stopPropagation();
    await contractorChatHistoryManager.deleteSession(chatSessionId);
    const sessions = await contractorChatHistoryManager.getAllSessions();
    const filtered = sessions.filter(s => s.mode === mode);
    setChatHistory(filtered);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-[#1A1A1A]" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Full Screen Chat Container */}
      <div className="h-full w-full flex flex-col">

        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b border-white/10`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-r ${config.bgColor} rounded-full flex items-center justify-center text-white`}>
              {config.icon}
            </div>
            <div>
              <h3 className="font-bold text-white">{config.label} Assistant</h3>
              <p className="text-xs text-zinc-400">AI-powered help</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-full hover:bg-white/10 ${showHistory ? 'text-orange-500' : 'text-zinc-400 hover:text-white'}`}
            >
              <History className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10"
            >
              <Minus className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* History Panel - overlays messages when showHistory is true */}
        {!isMinimized && showHistory && (
          <div className="absolute inset-x-0 top-[72px] bottom-0 bg-[#1A1A1A] z-10 flex flex-col">
            {/* History Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h4 className="font-semibold text-white">Chat History</h4>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {chatHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 font-medium">No chat history yet</p>
                  <p className="text-sm text-zinc-500 mt-1">Start a conversation to save it here</p>
                </div>
              ) : (
                chatHistory.map((chatSession) => (
                  <button
                    key={chatSession.id}
                    onClick={() => handleLoadSession(chatSession)}
                    className="w-full flex items-center gap-3 p-3 bg-[#242424] rounded-xl border border-white/10 hover:border-orange-500/50 active:scale-[0.98] transition-all text-left"
                  >
                    <div className={`w-10 h-10 bg-gradient-to-r ${config.bgColor} rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {chatSession.messages[1]?.content?.slice(0, 40) || 'New conversation'}...
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {chatSession.messages.length} messages • {new Date(chatSession.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(e, chatSession.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Messages - hidden when minimized */}
        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#1A1A1A]">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                      message.role === 'user'
                        ? 'bg-[#3A3A3A] text-white rounded-br-md'
                        : 'bg-[#242424] text-white rounded-bl-md border border-white/10'
                    }`}
                  >
                    <ChatMessageContent
                      content={message.content}
                      isUser={message.role === 'user'}
                    />
                    <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#242424] px-4 py-3 rounded-2xl rounded-bl-md border border-white/10">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Estimate Panel - Shows when estimate items exist */}
            {currentEstimate.length > 0 && (
              <div className="border-t border-white/10 bg-[#141414] px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-500" />
                    <span className="font-semibold text-white text-sm">Current Estimate</span>
                    <span className="text-xs text-zinc-400">({currentEstimate.length} items)</span>
                  </div>
                  <span className="font-bold text-orange-500">{formatCurrency(totalEstimate)}</span>
                </div>

                <div className="max-h-20 overflow-y-auto space-y-1 mb-2">
                  {currentEstimate.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-[#242424] rounded-lg px-2 py-1.5 text-xs">
                      <div className="flex-1 truncate">
                        <span className="font-medium text-white">{item.name}</span>
                        <span className="text-zinc-400 ml-1">({item.quantity} {item.unit})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{formatCurrency(item.totalPrice)}</span>
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
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Create Estimate
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Image Preview for Finance Mode */}
            {attachedImage && mode === 'finance' && (
              <div className="p-3 border-t border-white/10 bg-[#1A1A1A]">
                <div className="relative">
                  <img
                    src={attachedImage.url}
                    alt="Uploaded receipt"
                    className="w-full max-w-xs mx-auto h-32 object-cover rounded-lg border border-zinc-700"
                  />
                  <button
                    onClick={removeAttachedImage}
                    className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-white/10 bg-[#1A1A1A]">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Ask about ${config.label.toLowerCase()}...`}
                  className="flex-1 px-4 py-3 text-base bg-[#141414] border border-white/10 rounded-full text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={isLoading}
                />

                {/* Camera button for Finance mode */}
                {mode === 'finance' && (
                  <button
                    onClick={handleCameraCapture}
                    disabled={isLoading || uploadingPhoto}
                    className="px-4 py-3 bg-[#2C2C2E] hover:bg-[#3C3C3E] text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title="Upload receipt photo"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                  </button>
                )}

                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className={`px-4 py-3 bg-gradient-to-r ${config.bgColor} text-white rounded-full hover:opacity-90 disabled:bg-zinc-700 disabled:cursor-not-allowed transition-all`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              {/* Hidden file input for camera/photo selection */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AIChatPopup;
