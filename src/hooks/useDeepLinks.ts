import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '../lib/supabase';
import { useTimesheetStore } from '../stores/timesheetStore';

export const useDeepLinks = () => {
  const navigate = useNavigate();
  const timesheetStore = useTimesheetStore();
  const processedUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only set up deep link handling on native platforms
    if (!Capacitor.isNativePlatform()) return;

    const handleDeepLink = async (event: URLOpenListenerEvent) => {
      // Prevent processing same URL multiple times
      if (processedUrls.current.has(event.url)) {
        console.log('[DeepLink] URL already processed, skipping:', event.url);
        return;
      }
      processedUrls.current.add(event.url);

      console.log('[DeepLink] Received URL:', event.url);

      // Close the browser if it's open
      try {
        await Browser.close();
      } catch (e) {
        // Browser might not be open
      }

      // Parse the URL
      let url: URL;
      try {
        url = new URL(event.url);
      } catch (e) {
        console.error('[DeepLink] Invalid URL:', event.url);
        return;
      }

      // Handle auth callback
      if (url.pathname === '/auth/callback' || url.host === 'auth' || event.url.includes('auth/callback')) {
        console.log('[DeepLink] Processing auth callback...');

        // Extract params from URL
        const hashParams = new URLSearchParams(url.hash.substring(1));
        const queryParams = new URLSearchParams(url.search);

        // Check for PKCE code first (this is what Supabase sends)
        const code = queryParams.get('code');

        if (code) {
          console.log('[DeepLink] Found authorization code, exchanging for session...');

          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error('[DeepLink] Error exchanging code:', error);
            navigate('/auth/login?error=' + encodeURIComponent(error.message));
          } else {
            console.log('[DeepLink] Session created successfully:', data.user?.email);
            navigate('/');
          }
          return;
        }

        // Check for tokens (implicit flow)
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');

        if (accessToken && refreshToken) {
          console.log('[DeepLink] Found tokens, setting session...');

          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('[DeepLink] Error setting session:', error);
            navigate('/auth/login?error=' + encodeURIComponent(error.message));
          } else {
            console.log('[DeepLink] Session set successfully:', data.user?.email);
            navigate('/');
          }
        } else {
          // Try to get session (might already be set)
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('[DeepLink] Session already exists');
            navigate('/');
          } else {
            console.log('[DeepLink] No code or tokens found in URL');
            navigate('/auth/login');
          }
        }
      }

      // Handle Facebook OAuth callback: contractorai://fb-callback?code=XXX
      if (url.host === 'fb-callback' || url.pathname === '/fb-callback') {
        const code = url.searchParams.get('code');
        console.log('[DeepLink] Facebook callback with code:', code ? 'present' : 'missing');
        if (code) {
          try {
            // Exchange code for access token via edge function
            const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
              'fb-connect-page',
              {
                body: {
                  action: 'exchange_token',
                  code,
                  redirectUri: 'https://contractorai.tools/meta-oauth-callback',
                },
              }
            );

            if (tokenError || tokenData?.error) {
              console.error('[DeepLink] Token exchange failed:', tokenData?.error || tokenError);
              navigate('/settings', { state: { section: 'facebookLeads' } });
              return;
            }

            // Navigate to settings with the access token to show page selector
            navigate('/settings', {
              state: {
                section: 'facebookLeads',
                fbAccessToken: tokenData.access_token,
                showPageSelector: true,
              }
            });
          } catch (e) {
            console.error('[DeepLink] FB callback error:', e);
            navigate('/settings', { state: { section: 'facebookLeads' } });
          }
        }
        return;
      }

      // Handle leads deep link: contractorai://leads
      if (url.pathname === '/leads' || url.host === 'leads') {
        console.log('[DeepLink] Navigating to leads...');
        navigate('/clients-hub', { state: { activeTab: 'leads' } });
        return;
      }

      // Handle single lead deep link: contractorai://lead/{id}
      const leadMatch = (url.pathname || '').match(/^\/lead\/(.+)$/) ||
        (url.host === 'lead' && url.pathname ? url.pathname.match(/^\/(.+)$/) : null);
      if (leadMatch) {
        const leadId = leadMatch[1];
        console.log('[DeepLink] Navigating to lead:', leadId);
        navigate('/clients-hub', { state: { activeTab: 'leads', selectedLeadId: leadId } });
        return;
      }

      // Handle timesheet stop deep link: contractorai://timesheet/stop/{id}
      const timesheetStopMatch = (url.pathname || '').match(/^\/timesheet\/stop\/(.+)$/) ||
        (url.host === 'timesheet' && url.pathname ? url.pathname.match(/^\/stop\/(.+)$/) : null);
      if (timesheetStopMatch) {
        const timesheetId = timesheetStopMatch[1];
        console.log('[DeepLink] Stopping timesheet timer:', timesheetId);
        await timesheetStore.stopTimer(timesheetId);
        navigate('/tracker', { state: { activeTab: 'timesheets' } });
        return;
      }

      // Handle timesheet pause deep link: contractorai://timesheet/pause/{id}
      const timesheetPauseMatch = (url.pathname || '').match(/^\/timesheet\/pause\/(.+)$/) ||
        (url.host === 'timesheet' && url.pathname ? url.pathname.match(/^\/pause\/(.+)$/) : null);
      if (timesheetPauseMatch) {
        const timesheetId = timesheetPauseMatch[1];
        console.log('[DeepLink] Pausing timesheet timer:', timesheetId);
        await timesheetStore.pauseTimer(timesheetId);
        navigate('/tracker', { state: { activeTab: 'timesheets' } });
        return;
      }
    };

    // Listen for deep links when app is already open
    const listener = App.addListener('appUrlOpen', handleDeepLink);

    return () => {
      listener.then(l => l.remove());
    };
  }, [navigate, timesheetStore]);
};
