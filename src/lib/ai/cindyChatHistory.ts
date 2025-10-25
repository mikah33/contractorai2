// Cindy Chat History Manager
// Manages conversation history for Cindy AI client relationship manager

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface CindyChatSession {
  id: string;
  sessionId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

class CindyChatHistoryManager {
  private readonly STORAGE_KEY = 'cindy_chat_history';
  private readonly MAX_SESSIONS = 50;
  private readonly AUTO_SAVE_DEBOUNCE = 1000; // 1 second

  private autoSaveTimer: NodeJS.Timeout | null = null;

  // Get all chat sessions
  async getAllSessions(): Promise<CindyChatSession[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const sessions = JSON.parse(stored);
      return sessions.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
        messages: s.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
      }));
    } catch (error) {
      console.error('Error loading Cindy chat history:', error);
      return [];
    }
  }

  // Save a chat session
  async saveSession(session: CindyChatSession): Promise<void> {
    try {
      const sessions = await this.getAllSessions();

      // Find and update existing session or add new one
      const existingIndex = sessions.findIndex(s => s.sessionId === session.sessionId);
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.unshift(session);
      }

      // Keep only most recent sessions
      const trimmed = sessions.slice(0, this.MAX_SESSIONS);

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Error saving Cindy chat session:', error);
    }
  }

  // Auto-save with debouncing
  async autoSave(
    sessionId: string,
    messages: Message[],
    lastActivity?: any
  ): Promise<void> {
    // Clear existing timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    // Set new timer
    this.autoSaveTimer = setTimeout(async () => {
      try {
        const sessions = await this.getAllSessions();
        const existingSession = sessions.find(s => s.sessionId === sessionId);

        // Generate title from first user message
        const firstUserMessage = messages.find(m => m.role === 'user');
        const title = firstUserMessage
          ? firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
          : 'New Conversation';

        const session: CindyChatSession = {
          id: existingSession?.id || `cindy-${Date.now()}`,
          sessionId,
          title,
          messages,
          createdAt: existingSession?.createdAt || new Date(),
          updatedAt: new Date()
        };

        await this.saveSession(session);
      } catch (error) {
        console.error('Error auto-saving Cindy chat:', error);
      }
    }, this.AUTO_SAVE_DEBOUNCE);
  }

  // Delete a session
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const sessions = await this.getAllSessions();
      const filtered = sessions.filter(s => s.sessionId !== sessionId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting Cindy chat session:', error);
    }
  }

  // Clear all history
  async clearAllHistory(): Promise<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing Cindy chat history:', error);
    }
  }

  // Get a specific session
  async getSession(sessionId: string): Promise<CindyChatSession | null> {
    const sessions = await this.getAllSessions();
    return sessions.find(s => s.sessionId === sessionId) || null;
  }
}

export const cindyChatHistoryManager = new CindyChatHistoryManager();
