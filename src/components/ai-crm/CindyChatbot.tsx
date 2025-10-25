import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Loader2, Users, History, Plus, X, Trash2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { CINDY_WELCOME_MESSAGE } from '../../lib/ai/cindy-config';
import { cindyChatHistoryManager, CindyChatSession } from '../../lib/ai/cindyChatHistory';
import { useAuthStore } from '../../stores/authStore';
import { useClientsStore } from '../../stores/clientsStore';
import useProjectStore from '../../stores/projectStore';
import { useCalendarStoreSupabase } from '../../stores/calendarStoreSupabase';
import { supabase } from '../../lib/supabase';
import cindyLogo from '../../assets/icons/cindy-logo.svg';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}

export const CindyChatbot: React.FC = () => {
  const { session } = useAuthStore();
  const { clients } = useClientsStore();
  const { projects } = useProjectStore();
  const { events } = useCalendarStoreSupabase();
  const [sessionStartTime] = useState(() => new Date());
  const [sessionId] = useState(() => `cindy-session-${Date.now()}`);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: CINDY_WELCOME_MESSAGE,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [chatHistory, setChatHistory] = useState<CindyChatSession[]>([]);
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate stats from data
  const activeClients = clients.filter(c => c.status === 'active').length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.start);
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    return eventDate >= today && eventDate <= nextWeek;
  }).length;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount, load chat history, and fetch data
  useEffect(() => {
    inputRef.current?.focus();

    const loadHistory = async () => {
      const sessions = await cindyChatHistoryManager.getAllSessions();
      setChatHistory(sessions);
    };

    loadHistory();

    // Fetch clients, projects, and events data
    const { fetchClients } = useClientsStore.getState();
    const { fetchProjects } = useProjectStore.getState();
    const { fetchEvents } = useCalendarStoreSupabase.getState();

    fetchClients();
    fetchProjects();
    fetchEvents();
  }, []);

  // Auto-save chat on every message
  useEffect(() => {
    if (messages.length > 1) {
      const saveChat = async () => {
        await cindyChatHistoryManager.autoSave(sessionId, messages);
        const sessions = await cindyChatHistoryManager.getAllSessions();
        setChatHistory(sessions);
      };
      saveChat();
    }
  }, [messages, sessionId]);

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

      // Call Supabase Edge Function for Cindy AI processing
      const response = await fetch(`${supabaseUrl}/functions/v1/cindy-crm-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Cindy API Error:', {
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

      // Handle email draft if provided
      if (data.emailDraft) {
        setEmailDraft(data.emailDraft);
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

  const handleApproveEmail = async () => {
    if (!emailDraft) return;

    setSendingEmail(true);
    try {
      // Try Gmail API first
      const response = await fetch(`${supabaseUrl}/functions/v1/send-gmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          to: emailDraft.to,
          subject: emailDraft.subject,
          body: emailDraft.body
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // If Gmail not connected, show helpful message
        if (data.error?.includes('Gmail not connected')) {
          const errorMessage: Message = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: `⚠️ Gmail not connected. Please connect your Gmail account in Settings to send emails.\n\nAlternatively, you can copy the email content above and send it manually.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
          return;
        }
        throw new Error(data.error || 'Failed to send email');
      }

      // Add success message
      const successMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `✅ Email sent successfully to ${emailDraft.to} from ${data.from}!`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);
      setEmailDraft(null);

    } catch (error: any) {
      console.error('Error sending email:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `❌ Failed to send email: ${error.message}`,
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
      id: (Date.now() + 2).toString(),
      role: 'assistant',
      content: "Email draft cancelled. Let me know if you'd like me to draft a different message.",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: CINDY_WELCOME_MESSAGE,
        timestamp: new Date()
      }
    ]);
    setShowHistory(false);
    setEmailDraft(null);
  };

  const handleLoadSession = (session: CindyChatSession) => {
    const messagesWithDates = session.messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
    setMessages(messagesWithDates);
    setShowHistory(false);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await cindyChatHistoryManager.deleteSession(sessionId);
    const sessions = await cindyChatHistoryManager.getAllSessions();
    setChatHistory(sessions);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] sm:h-[calc(100vh-120px)] lg:h-[calc(100vh-200px)] max-w-6xl mx-auto gap-0 lg:gap-4">
      {/* Chat History Sidebar */}
      {showHistory && (
        <div className="fixed inset-0 lg:relative lg:w-80 bg-white lg:rounded-lg shadow-lg overflow-y-auto z-50 lg:z-auto">
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
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 font-medium"
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
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 flex-shrink-0 lg:rounded-t-lg">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Cindy</h2>
                <p className="text-xs text-blue-100 hidden sm:block">Your AI Client Manager</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="lg:hidden p-2.5 hover:bg-blue-600 active:bg-blue-700 rounded-lg transition-colors"
                title="View Info"
              >
                <Users className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-2.5 hover:bg-blue-600 active:bg-blue-700 rounded-lg transition-colors"
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
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-gray-500 hidden sm:flex'
                    : 'bg-blue-500'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Users className="w-5 h-5 text-white" />
                )}
              </div>

              <div
                className={`flex-1 max-w-[85%] sm:max-w-[80%] px-4 py-3 rounded-xl ${
                  message.role === 'user'
                    ? 'bg-gray-500 text-white ml-auto rounded-tr-sm'
                    : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                  {message.content}
                </div>
                <div
                  className={`text-xs mt-1.5 ${
                    message.role === 'user' ? 'text-gray-200' : 'text-gray-500'
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
                  <div className="text-sm text-gray-900">{emailDraft.to}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-600">Subject:</div>
                  <div className="text-sm text-gray-900">{emailDraft.subject}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-600">Message:</div>
                  <div className="text-sm text-gray-900 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200">
                    {emailDraft.body}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleApproveEmail}
                  disabled={sendingEmail}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {sendingEmail ? 'Sending...' : 'Approve & Send'}
                </button>
                <button
                  onClick={handleRejectEmail}
                  disabled={sendingEmail}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="bg-gray-100 px-4 py-3 rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 sm:p-4 border-t border-gray-200 flex-shrink-0 bg-white safe-area-inset-bottom">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Cindy about clients, projects, or calendar..."
              className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Info Panel - Desktop: Sidebar, Mobile: Hidden */}
      <div className={`
        ${showInfo ? 'fixed inset-0 z-50 lg:relative' : 'hidden lg:block'}
        lg:w-80 bg-white lg:rounded-lg shadow-lg overflow-hidden
      `}>
        {showInfo && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 -z-10"
            onClick={() => setShowInfo(false)}
          />
        )}

        <div className="h-full overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 lg:border-0 lg:static z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Quick Info
              </h3>
              <button
                onClick={() => setShowInfo(false)}
                className="lg:hidden p-2 -mr-2 text-gray-500 hover:text-gray-700 active:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <div className="text-sm text-blue-700 mb-1 font-medium">Active Clients</div>
              <div className="text-2xl font-bold text-blue-900">{activeClients}</div>
              <div className="text-xs text-blue-600 mt-1">
                {clients.length} total clients
              </div>
            </div>

            <div className="bg-green-50 rounded-xl border border-green-200 p-4">
              <div className="text-sm text-green-700 mb-1 font-medium">Active Projects</div>
              <div className="text-2xl font-bold text-green-900">{activeProjects}</div>
              <div className="text-xs text-green-600 mt-1">
                {projects.length} total projects
              </div>
            </div>

            <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
              <div className="text-sm text-purple-700 mb-1 font-medium">Upcoming Events</div>
              <div className="text-2xl font-bold text-purple-900">{upcomingEvents}</div>
              <div className="text-xs text-purple-600 mt-1">
                Next 7 days
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CindyChatbot;
