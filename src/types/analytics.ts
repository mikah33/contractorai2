/**
 * Ad Analytics Type Definitions
 * Core types for tracking ad performance and user interactions
 */

// Ad Platform Types
export type AdPlatform =
  | 'google_ads'
  | 'meta_ads'        // Facebook & Instagram (Meta Ads Manager)
  | 'organic'
  | 'phone_calls'
  | 'referral';

// Ad Campaign Types
export type CampaignType =
  | 'search'
  | 'display'
  | 'video'
  | 'social'
  | 'retargeting'
  | 'brand_awareness'
  | 'lead_generation'
  | 'conversion';

// User Actions
export type UserAction =
  | 'page_view'
  | 'calculator_use'
  | 'quote_request'
  | 'form_submit'
  | 'phone_click'
  | 'email_click'
  | 'signup'
  | 'purchase'
  | 'download'
  | 'video_view';

// Ad Campaign Schema
export interface AdCampaign {
  id: string;
  name: string;
  platform: AdPlatform;
  campaign_type: CampaignType;
  status: 'active' | 'paused' | 'completed';
  budget: number;
  daily_budget?: number;
  start_date: string;
  end_date?: string;
  target_audience: {
    locations?: string[];
    age_range?: { min: number; max: number };
    interests?: string[];
    demographics?: Record<string, any>;
  };
  created_at: string;
  updated_at: string;
}

// Ad Event/Click Tracking
export interface AdEvent {
  id: string;
  campaign_id: string;
  platform: AdPlatform;
  event_type: UserAction;
  user_id?: string;
  session_id: string;
  timestamp: string;

  // UTM Parameters
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;

  // Page/Context Data
  page_url: string;
  referrer_url?: string;
  landing_page?: string;

  // Device/Browser Info
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip_address?: string;
  geo_location?: {
    country?: string;
    state?: string;
    city?: string;
    zip_code?: string;
  };

  // Conversion Data
  conversion_value?: number;
  conversion_type?: string;

  // Additional metadata
  metadata?: Record<string, any>;
}

// Ad Performance Metrics
export interface AdMetrics {
  campaign_id: string;
  date: string;

  // Reach & Impressions
  impressions: number;
  unique_impressions?: number;
  reach?: number;

  // Engagement
  clicks: number;
  ctr: number; // Click-through rate
  engagement_rate?: number;

  // Conversions
  conversions: number;
  conversion_rate: number;
  leads: number;

  // Financial
  spend: number;
  cost_per_click: number;
  cost_per_conversion: number;
  cost_per_lead: number;
  roas?: number; // Return on ad spend
  revenue?: number;

  // Video (if applicable)
  video_views?: number;
  video_completion_rate?: number;

  // Quality
  quality_score?: number;
  relevance_score?: number;
}

// User Session Tracking
export interface UserSession {
  id: string;
  user_id?: string;
  session_start: string;
  session_end?: string;

  // Attribution
  initial_source: AdPlatform;
  initial_campaign_id?: string;
  initial_landing_page: string;

  // Session behavior
  page_views: number;
  pages_visited: string[];
  time_on_site: number; // seconds
  bounce: boolean;

  // Conversions
  converted: boolean;
  conversion_type?: string;
  conversion_value?: number;

  // Device
  device_info: {
    type: 'desktop' | 'mobile' | 'tablet';
    browser: string;
    os: string;
  };
}

// Conversion Funnel
export interface ConversionFunnel {
  campaign_id: string;
  date: string;

  // Funnel stages
  impressions: number;
  clicks: number;
  landing_page_views: number;
  calculator_uses: number;
  form_starts: number;
  form_completes: number;
  quotes_requested: number;
  leads_generated: number;
  customers: number;

  // Drop-off rates
  click_to_landing: number;
  landing_to_calculator: number;
  calculator_to_form: number;
  form_start_to_complete: number;
  quote_to_lead: number;
  lead_to_customer: number;
}

// A/B Test Variant
export interface ABTestVariant {
  id: string;
  test_id: string;
  name: string;
  variant_type: 'control' | 'variant_a' | 'variant_b' | 'variant_c';

  // What's being tested
  changes: {
    headline?: string;
    cta_text?: string;
    image_url?: string;
    page_layout?: string;
    color_scheme?: string;
    pricing?: number;
    [key: string]: any;
  };

  // Performance
  traffic_split: number; // percentage
  impressions: number;
  conversions: number;
  conversion_rate: number;

  status: 'active' | 'paused' | 'winner';
  created_at: string;
}

// Analytics Dashboard Summary
export interface AnalyticsSummary {
  date_range: {
    start: string;
    end: string;
  };

  // Top-level metrics
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  total_revenue: number;

  // Averages
  avg_ctr: number;
  avg_cpc: number;
  avg_conversion_rate: number;
  avg_roas: number;

  // By platform
  platform_breakdown: {
    platform: AdPlatform;
    spend: number;
    conversions: number;
    roas: number;
  }[];

  // Top campaigns
  top_campaigns: {
    campaign_id: string;
    name: string;
    platform: AdPlatform;
    conversions: number;
    roas: number;
  }[];

  // Trends
  daily_metrics: {
    date: string;
    spend: number;
    clicks: number;
    conversions: number;
    revenue: number;
  }[];
}

// Real-time Analytics
export interface RealTimeMetrics {
  active_users: number;
  active_sessions: number;
  current_conversions_today: number;
  current_spend_today: number;

  // Top performing right now
  top_traffic_source: AdPlatform;
  most_visited_page: string;
  recent_conversions: {
    timestamp: string;
    campaign_id: string;
    conversion_type: string;
    value: number;
  }[];
}

// Attribution Model
export type AttributionModel =
  | 'first_click'
  | 'last_click'
  | 'linear'
  | 'time_decay'
  | 'position_based'
  | 'data_driven';

export interface Attribution {
  conversion_id: string;
  model: AttributionModel;

  // Touch points
  touchpoints: {
    timestamp: string;
    platform: AdPlatform;
    campaign_id: string;
    action: UserAction;
    credit_percentage: number; // How much credit this touchpoint gets
  }[];

  total_value: number;
}
