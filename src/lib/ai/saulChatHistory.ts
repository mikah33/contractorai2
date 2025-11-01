import { supabase } from '../../lib/supabase';

export interface SaulChatSession {
  id: string;
  sessionId: string;
  title: string;
  messages: any[];
  financialContext: any;
  createdAt: string;
  updatedAt: string;
}

class SaulChatHistoryManager {
  private autoSaveTimeout: NodeJS.Timeout | null = null;

  // Auto-save chat session
  async autoSave(sessionId: string, messages: any[], financialContext: any) {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Generate title from first user message
        const firstUserMessage = messages.find(m => m.role === 'user');
        const title = firstUserMessage
          ? firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
          : 'Financial Chat';

        // Check if session exists
        const { data: existingSession } = await supabase
          .from('saul_chat_sessions')
          .select('id')
          .eq('session_id', sessionId)
          .eq('user_id', user.id)
          .single();

        if (existingSession) {
          // Update existing session
          await supabase
            .from('saul_chat_sessions')
            .update({
              title,
              messages,
              financial_context: financialContext,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSession.id);
        } else {
          // Create new session
          await supabase
            .from('saul_chat_sessions')
            .insert({
              user_id: user.id,
              session_id: sessionId,
              title,
              messages,
              financial_context: financialContext
            });
        }
      } catch (error) {
        console.error('Error auto-saving Saul chat:', error);
      }
    }, 1000); // Debounce by 1 second
  }

  // Get all chat sessions for current user
  async getAllSessions(): Promise<SaulChatSession[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('saul_chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(session => ({
        id: session.id,
        sessionId: session.session_id,
        title: session.title,
        messages: session.messages || [],
        financialContext: session.financial_context || {},
        createdAt: session.created_at,
        updatedAt: session.updated_at
      }));
    } catch (error) {
      console.error('Error loading Saul chat sessions:', error);
      return [];
    }
  }

  // Delete a chat session
  async deleteSession(sessionId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('saul_chat_sessions')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error deleting Saul chat session:', error);
    }
  }

  // Load a specific session
  async loadSession(sessionId: string): Promise<SaulChatSession | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('saul_chat_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        sessionId: data.session_id,
        title: data.title,
        messages: data.messages || [],
        financialContext: data.financial_context || {},
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error loading Saul chat session:', error);
      return null;
    }
  }
}

export const saulChatHistoryManager = new SaulChatHistoryManager();
