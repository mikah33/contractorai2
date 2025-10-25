import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Loader2, Calendar, Users, Briefcase, Mail, X } from 'lucide-react';
import { BILL_WELCOME_MESSAGE } from '../../lib/ai/bill-config';
import { supabase } from '../../lib/supabase';
import billLogo from '../../assets/icons/bill-logo.svg';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface EmailDraft {
  to: string[];
  subject: string;
  body: string;
  id: string;
}

export const BillChatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: BILL_WELCOME_MESSAGE,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<EmailDraft | null>(null);

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
      // Get user session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call Supabase Edge Function for Bill AI processing
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/bill-project-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
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

      // Handle email draft if present
      if (data.emailDraft) {
        setPendingEmail(data.emailDraft);
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

  const handleApproveEmail = async () => {
    if (!pendingEmail) return;

    setIsLoading(true);
    try {
      // Get user session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Send the email via edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/send-employee-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(pendingEmail)
      });

      if (!response.ok) throw new Error('Email send failed');

      const confirmMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ Email sent successfully to: ${pendingEmail.to.join(', ')}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, confirmMessage]);
      setPendingEmail(null);
    } catch (error) {
      console.error('Email error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Failed to send email. Please try again or contact support.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectEmail = () => {
    setPendingEmail(null);
    const rejectMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: "Email cancelled. How else can I help?",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, rejectMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] sm:h-[calc(100vh-200px)] max-w-5xl mx-auto">
      {/* Chat Panel */}
      <div className="flex-1 flex flex-col bg-white rounded-lg shadow-lg min-h-0">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-purple-600 flex-shrink-0">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2 sm:gap-3">
              <img
                src={billLogo}
                alt="Bill"
                className="w-6 h-6 sm:w-8 sm:h-8"
              />
              <div>
                <h2 className="text-base sm:text-lg font-bold">Bill</h2>
                <p className="text-[10px] sm:text-xs text-purple-100 hidden sm:block">Your AI Project Manager</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs">
                <Users className="w-4 h-4" />
                <Calendar className="w-4 h-4" />
                <Briefcase className="w-4 h-4" />
              </div>
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
                    : 'bg-purple-500'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                ) : (
                  <img
                    src={billLogo}
                    alt="Bill"
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
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                <img
                  src={billLogo}
                  alt="Bill"
                  className="w-6 h-6"
                />
              </div>
              <div className="bg-gray-100 px-4 py-3 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Email Approval Modal */}
        {pendingEmail && (
          <div className="border-t border-gray-200 bg-yellow-50 p-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">📧 Email Approval Required</h4>
                <div className="text-sm space-y-1 mb-3">
                  <p><strong>To:</strong> {pendingEmail.to.join(', ')}</p>
                  <p><strong>Subject:</strong> {pendingEmail.subject}</p>
                  <p className="text-gray-600 mt-2">{pendingEmail.body}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleApproveEmail}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    ✓ Send Email
                  </button>
                  <button
                    onClick={handleRejectEmail}
                    disabled={isLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    ✗ Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-2 sm:p-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about employees, projects, or scheduling..."
              className="flex-1 px-3 py-2 sm:px-4 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="px-3 sm:px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillChatbot;
