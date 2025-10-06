/**
 * Ad Analytics Service
 * Core functions for tracking and analyzing ad performance
 */

import {
  AdEvent,
  AdMetrics,
  UserSession,
  ConversionFunnel,
  AnalyticsSummary,
  RealTimeMetrics,
  AdPlatform,
  UserAction,
  Attribution,
  AttributionModel
} from '../types/analytics';

// ============================================================================
// EVENT TRACKING
// ============================================================================

/**
 * Track an ad event (click, conversion, etc.)
 */
export async function trackAdEvent(event: Omit<AdEvent, 'id' | 'timestamp'>): Promise<AdEvent> {
  const eventData: AdEvent = {
    ...event,
    id: generateEventId(),
    timestamp: new Date().toISOString(),
  };

  // TODO: Save to Supabase
  console.log('📊 Tracking ad event:', eventData);

  return eventData;
}

/**
 * Track page view with UTM parameters
 */
export async function trackPageView(params: {
  page_url: string;
  referrer_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  session_id: string;
}): Promise<void> {
  const deviceInfo = getDeviceInfo();

  await trackAdEvent({
    campaign_id: params.utm_campaign || 'organic',
    platform: mapSourceToPlatform(params.utm_source),
    event_type: 'page_view',
    session_id: params.session_id,
    page_url: params.page_url,
    referrer_url: params.referrer_url,
    utm_source: params.utm_source,
    utm_medium: params.utm_medium,
    utm_campaign: params.utm_campaign,
    utm_term: params.utm_term,
    utm_content: params.utm_content,
    device_type: deviceInfo.device_type,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
  });
}

/**
 * Track calculator usage
 */
export async function trackCalculatorUse(params: {
  calculator_type: string;
  session_id: string;
  campaign_id?: string;
  estimated_value?: number;
}): Promise<void> {
  const deviceInfo = getDeviceInfo();

  await trackAdEvent({
    campaign_id: params.campaign_id || 'organic',
    platform: 'organic',
    event_type: 'calculator_use',
    session_id: params.session_id,
    page_url: window.location.href,
    device_type: deviceInfo.device_type,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    metadata: {
      calculator_type: params.calculator_type,
      estimated_value: params.estimated_value,
    },
  });
}

/**
 * Track conversion (lead, purchase, etc.)
 */
export async function trackConversion(params: {
  conversion_type: string;
  conversion_value: number;
  session_id: string;
  campaign_id?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const deviceInfo = getDeviceInfo();

  await trackAdEvent({
    campaign_id: params.campaign_id || 'organic',
    platform: 'organic',
    event_type: params.conversion_type as UserAction,
    session_id: params.session_id,
    page_url: window.location.href,
    device_type: deviceInfo.device_type,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    conversion_type: params.conversion_type,
    conversion_value: params.conversion_value,
    metadata: params.metadata,
  });
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Start a new user session
 */
export async function startSession(params: {
  initial_source: AdPlatform;
  initial_campaign_id?: string;
  initial_landing_page: string;
}): Promise<UserSession> {
  const deviceInfo = getDeviceInfo();

  const session: UserSession = {
    id: generateSessionId(),
    session_start: new Date().toISOString(),
    initial_source: params.initial_source,
    initial_campaign_id: params.initial_campaign_id,
    initial_landing_page: params.initial_landing_page,
    page_views: 1,
    pages_visited: [params.initial_landing_page],
    time_on_site: 0,
    bounce: false,
    converted: false,
    device_info: deviceInfo,
  };

  // Save to localStorage for session tracking
  localStorage.setItem('analytics_session', JSON.stringify(session));

  // TODO: Save to Supabase
  console.log('📊 Session started:', session);

  return session;
}

/**
 * Get current session or create new one
 */
export function getCurrentSession(): UserSession | null {
  const sessionData = localStorage.getItem('analytics_session');
  if (!sessionData) return null;

  return JSON.parse(sessionData);
}

/**
 * Update session with new activity
 */
export async function updateSession(updates: Partial<UserSession>): Promise<void> {
  const session = getCurrentSession();
  if (!session) return;

  const updatedSession = { ...session, ...updates };
  localStorage.setItem('analytics_session', JSON.stringify(updatedSession));

  // TODO: Update in Supabase
  console.log('📊 Session updated:', updatedSession);
}

/**
 * End current session
 */
export async function endSession(): Promise<void> {
  const session = getCurrentSession();
  if (!session) return;

  const sessionDuration = Date.now() - new Date(session.session_start).getTime();

  await updateSession({
    session_end: new Date().toISOString(),
    time_on_site: Math.floor(sessionDuration / 1000),
  });

  localStorage.removeItem('analytics_session');
}

// ============================================================================
// METRICS CALCULATION
// ============================================================================

/**
 * Calculate metrics for a campaign
 */
export async function calculateCampaignMetrics(
  campaignId: string,
  startDate: string,
  endDate: string
): Promise<AdMetrics> {
  // TODO: Query Supabase for events
  const events: AdEvent[] = []; // Placeholder

  const impressions = events.filter(e => e.event_type === 'page_view').length;
  const clicks = events.filter(e => e.event_type === 'page_view').length;
  const conversions = events.filter(e => e.conversion_value).length;
  const spend = 0; // TODO: Get from campaign budget

  const metrics: AdMetrics = {
    campaign_id: campaignId,
    date: new Date().toISOString().split('T')[0],
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    conversions,
    conversion_rate: clicks > 0 ? (conversions / clicks) * 100 : 0,
    leads: conversions,
    spend,
    cost_per_click: clicks > 0 ? spend / clicks : 0,
    cost_per_conversion: conversions > 0 ? spend / conversions : 0,
    cost_per_lead: conversions > 0 ? spend / conversions : 0,
  };

  return metrics;
}

/**
 * Get conversion funnel data
 */
export async function getConversionFunnel(
  campaignId: string,
  date: string
): Promise<ConversionFunnel> {
  // TODO: Query Supabase for funnel data

  const funnel: ConversionFunnel = {
    campaign_id: campaignId,
    date,
    impressions: 1000,
    clicks: 100,
    landing_page_views: 95,
    calculator_uses: 50,
    form_starts: 30,
    form_completes: 20,
    quotes_requested: 15,
    leads_generated: 12,
    customers: 5,
    click_to_landing: 0.95,
    landing_to_calculator: 0.53,
    calculator_to_form: 0.60,
    form_start_to_complete: 0.67,
    quote_to_lead: 0.80,
    lead_to_customer: 0.42,
  };

  return funnel;
}

/**
 * Get real-time metrics
 */
export async function getRealTimeMetrics(): Promise<RealTimeMetrics> {
  // TODO: Query active sessions from Supabase

  const metrics: RealTimeMetrics = {
    active_users: 0,
    active_sessions: 0,
    current_conversions_today: 0,
    current_spend_today: 0,
    top_traffic_source: 'google_ads',
    most_visited_page: '/',
    recent_conversions: [],
  };

  return metrics;
}

/**
 * Get analytics summary for date range
 */
export async function getAnalyticsSummary(
  startDate: string,
  endDate: string
): Promise<AnalyticsSummary> {
  // TODO: Aggregate data from Supabase

  const summary: AnalyticsSummary = {
    date_range: { start: startDate, end: endDate },
    total_spend: 0,
    total_impressions: 0,
    total_clicks: 0,
    total_conversions: 0,
    total_revenue: 0,
    avg_ctr: 0,
    avg_cpc: 0,
    avg_conversion_rate: 0,
    avg_roas: 0,
    platform_breakdown: [],
    top_campaigns: [],
    daily_metrics: [],
  };

  return summary;
}

// ============================================================================
// ATTRIBUTION
// ============================================================================

/**
 * Calculate attribution for a conversion
 */
export function calculateAttribution(
  touchpoints: { timestamp: string; platform: AdPlatform; campaign_id: string; action: UserAction }[],
  conversionValue: number,
  model: AttributionModel = 'last_click'
): Attribution {
  const attribution: Attribution = {
    conversion_id: generateEventId(),
    model,
    touchpoints: [],
    total_value: conversionValue,
  };

  switch (model) {
    case 'first_click':
      attribution.touchpoints = touchpoints.map((tp, idx) => ({
        ...tp,
        credit_percentage: idx === 0 ? 100 : 0,
      }));
      break;

    case 'last_click':
      attribution.touchpoints = touchpoints.map((tp, idx) => ({
        ...tp,
        credit_percentage: idx === touchpoints.length - 1 ? 100 : 0,
      }));
      break;

    case 'linear':
      const linearCredit = 100 / touchpoints.length;
      attribution.touchpoints = touchpoints.map(tp => ({
        ...tp,
        credit_percentage: linearCredit,
      }));
      break;

    case 'position_based':
      // 40% first, 40% last, 20% distributed middle
      const middleCredit = touchpoints.length > 2 ? 20 / (touchpoints.length - 2) : 0;
      attribution.touchpoints = touchpoints.map((tp, idx) => ({
        ...tp,
        credit_percentage:
          idx === 0 ? 40 :
          idx === touchpoints.length - 1 ? 40 :
          middleCredit,
      }));
      break;
  }

  return attribution;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateSessionId(): string {
  return `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getDeviceInfo(): {
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
} {
  const ua = navigator.userAgent;

  // Detect device type
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android/i.test(ua) && !/Mobile/i.test(ua);

  // Detect browser
  let browser = 'Unknown';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';

  // Detect OS
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS')) os = 'iOS';

  return {
    device_type: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
    browser,
    os,
  };
}

function mapSourceToPlatform(source?: string): AdPlatform {
  if (!source) return 'phone_calls';

  const lowerSource = source.toLowerCase();

  if (lowerSource.includes('google')) return 'google_ads';
  if (lowerSource.includes('facebook') || lowerSource.includes('fb') ||
      lowerSource.includes('instagram') || lowerSource.includes('ig') ||
      lowerSource.includes('meta')) return 'meta_ads';

  return 'referral';
}

/**
 * Extract UTM parameters from URL
 */
export function extractUTMParams(url: string = window.location.href): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
} {
  const params = new URLSearchParams(new URL(url).search);

  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_term: params.get('utm_term') || undefined,
    utm_content: params.get('utm_content') || undefined,
  };
}
