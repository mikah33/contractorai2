import { create } from 'zustand';
import { AdAccount, AdCampaign, AdMetrics, AIInsight, AdRecommendation, CompetitorData, ABTest } from '../types/ads';

interface AdAnalyzerState {
  // Accounts
  accounts: AdAccount[];
  selectedAccount: AdAccount | null;
  
  // Campaigns & Metrics
  campaigns: AdCampaign[];
  metrics: AdMetrics[];
  
  // AI Features
  insights: AIInsight[];
  recommendations: AdRecommendation[];
  
  // Competitor Analysis
  competitors: CompetitorData[];
  
  // A/B Testing
  abTests: ABTest[];
  
  // UI State
  loading: boolean;
  error: string | null;
  dateRange: { start: string; end: string };
  
  // Actions
  connectAccount: (platform: string) => Promise<void>;
  disconnectAccount: (accountId: string) => Promise<void>;
  refreshAccountData: (accountId: string) => Promise<void>;
  setSelectedAccount: (account: AdAccount | null) => void;
  setDateRange: (range: { start: string; end: string }) => void;
  
  // Campaign Actions
  fetchCampaigns: (accountId: string) => Promise<void>;
  updateCampaignStatus: (campaignId: string, status: string) => Promise<void>;
  updateCampaignBudget: (campaignId: string, budget: number) => Promise<void>;
  
  // Metrics Actions
  fetchMetrics: (campaignIds: string[], dateRange: { start: string; end: string }) => Promise<void>;
  
  // AI Actions
  generateInsights: (campaignIds: string[]) => Promise<void>;
  generateRecommendations: (campaignId: string) => Promise<void>;
  applyRecommendation: (recommendationId: string) => Promise<void>;
  dismissRecommendation: (recommendationId: string) => Promise<void>;
  
  // Competitor Actions
  addCompetitor: (domain: string) => Promise<void>;
  removeCompetitor: (competitorId: string) => Promise<void>;
  refreshCompetitorData: (competitorId: string) => Promise<void>;
  
  // A/B Testing Actions
  createABTest: (test: Omit<ABTest, 'id'>) => Promise<void>;
  updateABTest: (testId: string, updates: Partial<ABTest>) => Promise<void>;
  
  // Export Actions
  exportReport: (format: 'pdf' | 'excel', data: any) => Promise<void>;
}

// Mock OAuth implementation
const mockOAuthConnect = async (platform: string): Promise<AdAccount> => {
  // Simulate OAuth flow
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    id: `${platform}-${Date.now()}`,
    platform: platform as any,
    name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Ads Account`,
    accountId: `${platform}_${Math.random().toString(36).substr(2, 9)}`,
    status: 'connected',
    lastSync: new Date().toISOString(),
    currency: 'USD',
    timeZone: 'America/New_York'
  };
};

// Mock API calls
const mockApiCall = async (endpoint: string, data?: any) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true, data };
};

export const useAdAnalyzerStore = create<AdAnalyzerState>((set, get) => ({
  // Initial State - all empty
  accounts: [],
  selectedAccount: null,
  campaigns: [],
  metrics: [],
  insights: [
  ],
  recommendations: [],
  competitors: [],
  abTests: [],
  loading: false,
  error: null,
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  },

  // Account Actions
  connectAccount: async (platform: string) => {
    set({ loading: true, error: null });
    try {
      const newAccount = await mockOAuthConnect(platform);
      set(state => ({
        accounts: [...state.accounts, newAccount],
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to connect account', loading: false });
    }
  },

  disconnectAccount: async (accountId: string) => {
    set({ loading: true });
    try {
      await mockApiCall(`/accounts/${accountId}/disconnect`);
      set(state => ({
        accounts: state.accounts.map(acc => 
          acc.id === accountId ? { ...acc, status: 'disconnected' as const } : acc
        ),
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to disconnect account', loading: false });
    }
  },

  refreshAccountData: async (accountId: string) => {
    set({ loading: true });
    try {
      await mockApiCall(`/accounts/${accountId}/refresh`);
      set(state => ({
        accounts: state.accounts.map(acc => 
          acc.id === accountId ? { ...acc, lastSync: new Date().toISOString() } : acc
        ),
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to refresh account data', loading: false });
    }
  },

  setSelectedAccount: (account: AdAccount | null) => {
    set({ selectedAccount: account });
  },

  setDateRange: (range: { start: string; end: string }) => {
    set({ dateRange: range });
  },

  // Campaign Actions
  fetchCampaigns: async (accountId: string) => {
    set({ loading: true });
    try {
      await mockApiCall(`/accounts/${accountId}/campaigns`);
      // Campaigns are already mocked in initial state
      set({ loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch campaigns', loading: false });
    }
  },

  updateCampaignStatus: async (campaignId: string, status: string) => {
    set({ loading: true });
    try {
      await mockApiCall(`/campaigns/${campaignId}/status`, { status });
      set(state => ({
        campaigns: state.campaigns.map(camp => 
          camp.id === campaignId ? { ...camp, status: status as any } : camp
        ),
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to update campaign status', loading: false });
    }
  },

  updateCampaignBudget: async (campaignId: string, budget: number) => {
    set({ loading: true });
    try {
      await mockApiCall(`/campaigns/${campaignId}/budget`, { budget });
      set(state => ({
        campaigns: state.campaigns.map(camp => 
          camp.id === campaignId ? { ...camp, budget } : camp
        ),
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to update campaign budget', loading: false });
    }
  },

  // Metrics Actions
  fetchMetrics: async (campaignIds: string[], dateRange: { start: string; end: string }) => {
    set({ loading: true });
    try {
      // Generate mock metrics
      const mockMetrics: AdMetrics[] = campaignIds.flatMap(campaignId => 
        Array.from({ length: 30 }, (_, i) => ({
          campaignId,
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          impressions: Math.floor(Math.random() * 10000) + 1000,
          clicks: Math.floor(Math.random() * 500) + 50,
          spend: Math.floor(Math.random() * 200) + 20,
          conversions: Math.floor(Math.random() * 20) + 1,
          ctr: Math.random() * 5 + 1,
          cpm: Math.random() * 20 + 5,
          cpc: Math.random() * 10 + 1,
          cpa: Math.random() * 100 + 20,
          roas: Math.random() * 5 + 1
        }))
      );
      
      set({ metrics: mockMetrics, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch metrics', loading: false });
    }
  },

  // AI Actions
  generateInsights: async (campaignIds: string[]) => {
    set({ loading: true });
    try {
      await mockApiCall('/ai/insights', { campaignIds });
      // Insights are already mocked in initial state
      set({ loading: false });
    } catch (error) {
      set({ error: 'Failed to generate insights', loading: false });
    }
  },

  generateRecommendations: async (campaignId: string) => {
    set({ loading: true });
    try {
      await mockApiCall(`/ai/recommendations/${campaignId}`);
      // Recommendations are already mocked in initial state
      set({ loading: false });
    } catch (error) {
      set({ error: 'Failed to generate recommendations', loading: false });
    }
  },

  applyRecommendation: async (recommendationId: string) => {
    set({ loading: true });
    try {
      await mockApiCall(`/recommendations/${recommendationId}/apply`);
      set(state => ({
        recommendations: state.recommendations.map(rec => 
          rec.id === recommendationId ? { ...rec, status: 'applied' as const } : rec
        ),
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to apply recommendation', loading: false });
    }
  },

  dismissRecommendation: async (recommendationId: string) => {
    set(state => ({
      recommendations: state.recommendations.map(rec => 
        rec.id === recommendationId ? { ...rec, status: 'dismissed' as const } : rec
      )
    }));
  },

  // Competitor Actions
  addCompetitor: async (domain: string) => {
    set({ loading: true });
    try {
      const newCompetitor: CompetitorData = {
        id: `comp-${Date.now()}`,
        name: domain.replace(/^www\./, '').split('.')[0],
        domain,
        estimatedSpend: Math.floor(Math.random() * 50000) + 5000,
        topKeywords: ['deck installation', 'home renovation', 'contractor services'],
        adCopy: ['Professional Deck Installation', 'Transform Your Outdoor Space'],
        landingPages: [`https://${domain}/services`, `https://${domain}/contact`],
        lastUpdated: new Date().toISOString()
      };
      
      set(state => ({
        competitors: [...state.competitors, newCompetitor],
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to add competitor', loading: false });
    }
  },

  removeCompetitor: async (competitorId: string) => {
    set(state => ({
      competitors: state.competitors.filter(comp => comp.id !== competitorId)
    }));
  },

  refreshCompetitorData: async (competitorId: string) => {
    set({ loading: true });
    try {
      await mockApiCall(`/competitors/${competitorId}/refresh`);
      set(state => ({
        competitors: state.competitors.map(comp => 
          comp.id === competitorId ? { ...comp, lastUpdated: new Date().toISOString() } : comp
        ),
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to refresh competitor data', loading: false });
    }
  },

  // A/B Testing Actions
  createABTest: async (test: Omit<ABTest, 'id'>) => {
    set({ loading: true });
    try {
      const newTest: ABTest = {
        ...test,
        id: `test-${Date.now()}`
      };
      
      set(state => ({
        abTests: [...state.abTests, newTest],
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to create A/B test', loading: false });
    }
  },

  updateABTest: async (testId: string, updates: Partial<ABTest>) => {
    set({ loading: true });
    try {
      await mockApiCall(`/ab-tests/${testId}`, updates);
      set(state => ({
        abTests: state.abTests.map(test => 
          test.id === testId ? { ...test, ...updates } : test
        ),
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to update A/B test', loading: false });
    }
  },

  // Export Actions
  exportReport: async (format: 'pdf' | 'excel', data: any) => {
    set({ loading: true });
    try {
      await mockApiCall('/export', { format, data });
      // Trigger download
      const blob = new Blob(['Mock report data'], { type: format === 'pdf' ? 'application/pdf' : 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ad-report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      
      set({ loading: false });
    } catch (error) {
      set({ error: 'Failed to export report', loading: false });
    }
  }
}));