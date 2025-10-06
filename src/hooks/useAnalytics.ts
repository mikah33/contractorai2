/**
 * Analytics React Hook
 * Easy-to-use hook for tracking events in components
 */

import { useEffect, useCallback, useRef } from 'react';
import {
  trackAdEvent,
  trackPageView,
  trackCalculatorUse,
  trackConversion,
  startSession,
  getCurrentSession,
  updateSession,
  endSession,
  extractUTMParams,
} from '../services/analytics';
import { AdPlatform, UserAction } from '../types/analytics';

export function useAnalytics() {
  const sessionRef = useRef<string | null>(null);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();

    // End session on unmount
    return () => {
      endSession();
    };
  }, []);

  const initializeSession = useCallback(async () => {
    let session = getCurrentSession();

    if (!session) {
      // Extract UTM params from URL
      const utmParams = extractUTMParams();
      const platform = mapSourceToPlatform(utmParams.utm_source);

      session = await startSession({
        initial_source: platform,
        initial_campaign_id: utmParams.utm_campaign,
        initial_landing_page: window.location.pathname,
      });
    }

    sessionRef.current = session.id;
  }, []);

  // Track page view
  const trackPage = useCallback(async (pagePath?: string) => {
    const session = getCurrentSession();
    if (!session) return;

    const utmParams = extractUTMParams();

    await trackPageView({
      page_url: pagePath || window.location.pathname,
      referrer_url: document.referrer,
      session_id: session.id,
      ...utmParams,
    });

    // Update session
    await updateSession({
      page_views: session.page_views + 1,
      pages_visited: [...session.pages_visited, window.location.pathname],
    });
  }, []);

  // Track calculator usage
  const trackCalculator = useCallback(async (
    calculatorType: string,
    estimatedValue?: number
  ) => {
    const session = getCurrentSession();
    if (!session) return;

    await trackCalculatorUse({
      calculator_type: calculatorType,
      session_id: session.id,
      campaign_id: session.initial_campaign_id,
      estimated_value: estimatedValue,
    });
  }, []);

  // Track conversion
  const trackConversionEvent = useCallback(async (
    conversionType: string,
    value: number,
    metadata?: Record<string, any>
  ) => {
    const session = getCurrentSession();
    if (!session) return;

    await trackConversion({
      conversion_type: conversionType,
      conversion_value: value,
      session_id: session.id,
      campaign_id: session.initial_campaign_id,
      metadata,
    });

    // Mark session as converted
    await updateSession({
      converted: true,
      conversion_type: conversionType,
      conversion_value: value,
    });
  }, []);

  // Track custom event
  const track = useCallback(async (
    eventType: UserAction,
    metadata?: Record<string, any>
  ) => {
    const session = getCurrentSession();
    if (!session) return;

    await trackAdEvent({
      campaign_id: session.initial_campaign_id || 'organic',
      platform: session.initial_source,
      event_type: eventType,
      session_id: session.id,
      page_url: window.location.href,
      device_type: session.device_info.type,
      browser: session.device_info.browser,
      os: session.device_info.os,
      metadata,
    });
  }, []);

  return {
    trackPage,
    trackCalculator,
    trackConversion: trackConversionEvent,
    track,
    sessionId: sessionRef.current,
  };
}

// Auto track page views on route change
export function usePageTracking() {
  const { trackPage } = useAnalytics();

  useEffect(() => {
    trackPage();
  }, [window.location.pathname]);
}

// Helper function
function mapSourceToPlatform(source?: string): AdPlatform {
  if (!source) return 'phone_calls';

  const lowerSource = source.toLowerCase();

  if (lowerSource.includes('google')) return 'google_ads';
  if (lowerSource.includes('facebook') || lowerSource.includes('fb') ||
      lowerSource.includes('instagram') || lowerSource.includes('ig') ||
      lowerSource.includes('meta')) return 'meta_ads';

  return 'referral';
}
