import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  thumbnail_url?: string;
  published_at: string;
  created_at: string;
  is_active: boolean;
}

interface NewsState {
  articles: NewsArticle[];
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;

  // Actions
  fetchNews: () => Promise<void>;
  refreshNews: () => Promise<void>;
}

export const useNewsStore = create<NewsState>((set, get) => ({
  articles: [],
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchNews: async () => {
    // Don't refetch if we already have recent data (within 5 minutes)
    const lastFetched = get().lastFetched;
    if (lastFetched && (Date.now() - lastFetched.getTime()) < 5 * 60 * 1000) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('industry_news')
        .select('*')
        .eq('is_active', true)
        .order('published_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      set({
        articles: data || [],
        isLoading: false,
        lastFetched: new Date()
      });
    } catch (error: any) {
      console.error('Error fetching news:', error);
      set({
        error: error.message,
        isLoading: false
      });
    }
  },

  refreshNews: async () => {
    // Force refresh by clearing lastFetched
    set({ lastFetched: null });
    await get().fetchNews();
  }
}));
