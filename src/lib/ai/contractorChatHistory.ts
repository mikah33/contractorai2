/**
 * Contractor AI - Unified Chat History Manager
 * Handles persistent chat history in Supabase
 */

import { supabase } from '../supabase';

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

export interface ContractorChatSession {
  id: string;
  sessionId: string;
  title: string;
  messages: Message[];
  estimate: EstimateLineItem[];
  mode: 'estimating' | 'projects' | 'crm' | 'finance' | 'general';
  createdAt: string;
  updatedAt: string;
}

const MAX_SESSIONS = 50;

class ContractorChatHistoryManager {
  private async getUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  }

  async getAllSessions(): Promise<ContractorChatSession[]> {
    try {
      const userId = await this.getUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(MAX_SESSIONS);

      if (error) {
        console.error('Error loading chat sessions:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        sessionId: row.session_id,
        title: row.title,
        messages: row.messages || [],
        estimate: row.estimate || [],
        mode: row.mode || 'general',
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      return [];
    }
  }

  async saveSession(session: ContractorChatSession): Promise<void> {
    try {
      const userId = await this.getUserId();
      if (!userId) {
        console.error('No user logged in, cannot save session');
        return;
      }

      // Check if session exists
      const { data: existing } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('session_id', session.sessionId)
        .single();

      if (existing) {
        // Update existing session
        const { error } = await supabase
          .from('chat_sessions')
          .update({
            title: session.title,
            messages: session.messages,
            estimate: session.estimate,
            mode: session.mode,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) {
          console.error('Error updating chat session:', error);
        }
      } else {
        // Insert new session
        const { error } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: userId,
            session_id: session.sessionId,
            title: session.title,
            messages: session.messages,
            estimate: session.estimate,
            mode: session.mode
          });

        if (error) {
          console.error('Error inserting chat session:', error);
        }

        // Clean up old sessions if over limit
        await this.cleanupOldSessions(userId);
      }
    } catch (error) {
      console.error('Error saving chat session:', error);
    }
  }

  private async cleanupOldSessions(userId: string): Promise<void> {
    try {
      // Get count of sessions
      const { count } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (count && count > MAX_SESSIONS) {
        // Get IDs of sessions to delete (oldest ones beyond limit)
        const { data: oldSessions } = await supabase
          .from('chat_sessions')
          .select('id')
          .eq('user_id', userId)
          .order('updated_at', { ascending: true })
          .limit(count - MAX_SESSIONS);

        if (oldSessions && oldSessions.length > 0) {
          const idsToDelete = oldSessions.map(s => s.id);
          await supabase
            .from('chat_sessions')
            .delete()
            .in('id', idsToDelete);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old sessions:', error);
    }
  }

  async deleteSession(id: string): Promise<void> {
    try {
      const userId = await this.getUserId();
      if (!userId) return;

      // Try deleting by id first (database row ID)
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('user_id', userId)
        .eq('id', id);

      if (error) {
        console.error('Error deleting chat session:', error);
      }
    } catch (error) {
      console.error('Error deleting chat session:', error);
    }
  }

  async getSession(id: string): Promise<ContractorChatSession | null> {
    try {
      const userId = await this.getUserId();
      if (!userId) return null;

      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('Error loading chat session:', error);
        return null;
      }

      return {
        id: data.id,
        sessionId: data.session_id,
        title: data.title,
        messages: data.messages || [],
        estimate: data.estimate || [],
        mode: data.mode || 'general',
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error loading chat session:', error);
      return null;
    }
  }

  async autoSave(
    sessionId: string,
    messages: Message[],
    estimate: EstimateLineItem[] = [],
    mode: ContractorChatSession['mode'] = 'general'
  ): Promise<void> {
    if (messages.length <= 1) return; // Don't save just the welcome message

    const title = this.generateTitle(messages);
    const session: ContractorChatSession = {
      id: sessionId,
      sessionId,
      title,
      messages,
      estimate,
      mode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.saveSession(session);
  }

  private generateTitle(messages: Message[]): string {
    // Find the first user message
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return 'New Chat';

    // Truncate to create a title
    const content = firstUserMessage.content;
    if (content.length <= 40) return content;
    return content.substring(0, 37) + '...';
  }

  async clearAllSessions(): Promise<void> {
    try {
      const userId = await this.getUserId();
      if (!userId) return;

      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error clearing chat sessions:', error);
      }
    } catch (error) {
      console.error('Error clearing chat sessions:', error);
    }
  }
}

export const contractorChatHistoryManager = new ContractorChatHistoryManager();
