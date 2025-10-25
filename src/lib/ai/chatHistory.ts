// Chat History Management for AI Calculator
// Automatically saves and retrieves chat sessions per user account using Supabase

import { supabase } from '../supabase';

export interface ChatSession {
  id: string;
  sessionId: string;
  userId?: string;
  title: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  }>;
  estimate: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    type: 'material' | 'labor' | 'permit' | 'fee' | 'other';
    isCustom: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_KEY = 'contractorai_chat_history'; // Fallback for non-authenticated users
const MAX_SESSIONS = 50; // Keep last 50 sessions

export const chatHistoryManager = {
  // Get current user ID
  async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  // Get all chat sessions (from Supabase if authenticated, localStorage if not)
  async getAllSessions(): Promise<ChatSession[]> {
    try {
      const userId = await this.getCurrentUserId();

      if (userId) {
        // Authenticated user - fetch from Supabase
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(MAX_SESSIONS);

        if (error) {
          console.error('Error loading chat sessions from Supabase:', error);
          return [];
        }

        return (data || []).map((session: any) => ({
          id: session.id,
          sessionId: session.session_id,
          userId: session.user_id,
          title: session.title,
          messages: session.messages,
          estimate: session.estimate,
          createdAt: new Date(session.created_at),
          updatedAt: new Date(session.updated_at)
        }));
      } else {
        // Not authenticated - use localStorage fallback
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];

        const sessions = JSON.parse(data);
        return sessions.map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  },

  // Save a chat session (to Supabase if authenticated, localStorage if not)
  async saveSession(session: ChatSession): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      if (userId) {
        // Authenticated user - save to Supabase
        const { data: existing } = await supabase
          .from('chat_sessions')
          .select('id')
          .eq('session_id', session.sessionId)
          .eq('user_id', userId)
          .single();

        const sessionData = {
          user_id: userId,
          session_id: session.sessionId,
          title: session.title,
          messages: session.messages,
          estimate: session.estimate
        };

        if (existing) {
          // Update existing session
          await supabase
            .from('chat_sessions')
            .update(sessionData)
            .eq('id', existing.id);
        } else {
          // Insert new session
          await supabase
            .from('chat_sessions')
            .insert(sessionData);
        }
      } else {
        // Not authenticated - use localStorage fallback
        const sessions = await this.getAllSessions();
        const existingIndex = sessions.findIndex(s => s.sessionId === session.sessionId);

        if (existingIndex >= 0) {
          sessions[existingIndex] = {
            ...session,
            updatedAt: new Date()
          };
        } else {
          sessions.unshift({
            ...session,
            id: session.sessionId,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        const trimmed = sessions.slice(0, MAX_SESSIONS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      }
    } catch (error) {
      console.error('Error saving chat session:', error);
    }
  },

  // Get a specific session by ID
  async getSession(sessionId: string): Promise<ChatSession | null> {
    const sessions = await this.getAllSessions();
    return sessions.find(s => s.sessionId === sessionId) || null;
  },

  // Delete a session (from Supabase if authenticated, localStorage if not)
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      if (userId) {
        // Authenticated user - delete from Supabase
        await supabase
          .from('chat_sessions')
          .delete()
          .eq('session_id', sessionId)
          .eq('user_id', userId);
      } else {
        // Not authenticated - delete from localStorage
        const sessions = await this.getAllSessions();
        const filtered = sessions.filter(s => s.sessionId !== sessionId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (error) {
      console.error('Error deleting chat session:', error);
    }
  },

  // Clear all sessions (from Supabase if authenticated, localStorage if not)
  async clearAll(): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      if (userId) {
        // Authenticated user - delete all from Supabase
        await supabase
          .from('chat_sessions')
          .delete()
          .eq('user_id', userId);
      } else {
        // Not authenticated - clear localStorage
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  },

  // Generate a title from the first user message
  generateTitle(messages: ChatSession['messages']): string {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return 'New Chat';

    // Take first 50 characters of first user message
    const title = firstUserMessage.content.substring(0, 50);
    return title.length < firstUserMessage.content.length ? `${title}...` : title;
  },

  // Auto-save current session
  async autoSave(
    sessionId: string,
    messages: ChatSession['messages'],
    estimate: ChatSession['estimate']
  ): Promise<void> {
    const session: ChatSession = {
      id: sessionId,
      sessionId: sessionId,
      title: this.generateTitle(messages),
      messages,
      estimate,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveSession(session);
  }
};
