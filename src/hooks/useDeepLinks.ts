import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '../lib/supabase';

export const useDeepLinks = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Only set up deep link handling on native platforms
    if (!Capacitor.isNativePlatform()) return;

    const handleDeepLink = async (event: URLOpenListenerEvent) => {
      console.log('[DeepLink] Received URL:', event.url);

      // Close the browser if it's open
      try {
        await Browser.close();
      } catch (e) {
        // Browser might not be open
      }

      // Parse the URL
      const url = new URL(event.url);

      // Handle auth callback
      if (url.pathname === '/auth/callback' || url.host === 'auth') {
        console.log('[DeepLink] Processing auth callback...');

        // Extract tokens from URL fragment or query params
        const hashParams = new URLSearchParams(url.hash.substring(1));
        const queryParams = new URLSearchParams(url.search);

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
            console.log('[DeepLink] No tokens found in URL');
            navigate('/auth/login');
          }
        }
      }
    };

    // Listen for deep links
    const listener = App.addListener('appUrlOpen', handleDeepLink);

    // Check if app was opened with a URL
    App.getLaunchUrl().then((result) => {
      if (result?.url) {
        console.log('[DeepLink] App launched with URL:', result.url);
        handleDeepLink({ url: result.url });
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [navigate]);
};
