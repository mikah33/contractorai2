export interface AdAccount {
  id: string;
  platform: 'google' | 'facebook' | 'instagram' | 'linkedin';
  name: string;
  accountId: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  lastSync: string;
  currency: string;
  timeZone: string;
}

export interface AdCampaign {
  id: string;
  accountId: string;
  name: string;
  status: 'active' | 'paused' | 'ended';
  budget: number;
  budgetType: 'daily' | 'lifetime';
  startDate: string;
  endDate?: string;
  objective: string;
  platform: string;
}

export interface AdMetrics {
  campaignId: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpm: number;
  cpc: number;
  cpa: number;
  roas: number;
  reach?: number;
  frequency?: number;
}

export interface AIInsight {
  id: string;
  type: 'optimization' | 'warning' | 'opportunity' | 'trend';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  recommendation: string;
  actionable: boolean;
  estimatedImprovement?: string;
  relatedCampaigns: string[];
  createdAt: string;
}

export interface AdRecommendation {
  id: string;
  type: 'budget' | 'targeting' | 'creative' | 'bidding' | 'schedule';
  title: string;
  description: string;
  currentValue: string;
  suggestedValue: string;
  expectedImpact: string;
  confidence: number;
  campaignId: string;
  status: 'pending' | 'applied' | 'dismissed';
}

export interface CompetitorData {
  id: string;
  name: string;
  domain: string;
  estimatedSpend: number;
  topKeywords: string[];
  adCopy: string[];
  landingPages: string[];
  lastUpdated: string;
}

export interface ABTest {
  id: string;
  name: string;
  campaignId: string;
  status: 'running' | 'completed' | 'paused';
  startDate: string;
  endDate?: string;
  variants: ABTestVariant[];
  winner?: string;
  confidence: number;
  metric: string;
}

export interface ABTestVariant {
  id: string;
  name: string;
  creative: {
    headline: string;
    description: string;
    imageUrl?: string;
    callToAction: string;
  };
  metrics: AdMetrics;
  trafficSplit: number;
}