import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { subscriptionService } from '../services/subscriptionService';
import { SiriIntent } from '../plugins/siriIntent';

// TypeScript declaration for Google reCAPTCHA
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  company_name?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

interface SignUpMetadata {
  fullName?: string;
  companyName?: string;
  phoneNumber?: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: SignUpMetadata) => Promise<{ error: Error | null; user?: User | null; session?: Session | null }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  initialize: () => Promise<void>;
}

// Track if initialization has been called
let initializationPromise: Promise<void> | null = null;

// Helper function to get reCAPTCHA v3 token
const getCaptchaToken = async (action: string = 'signup'): Promise<string | null> => {
  return new Promise((resolve) => {
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

    if (!siteKey || siteKey === 'YOUR_RECAPTCHA_V3_SITE_KEY_HERE') {
      console.warn('reCAPTCHA site key not configured');
      resolve(null);
      return;
    }

    if (typeof window !== 'undefined' && window.grecaptcha) {
      window.grecaptcha.ready(() => {
        window.grecaptcha.execute(siteKey, { action })
          .then((token: string) => {
            console.log('reCAPTCHA token generated for action:', action);
            resolve(token);
          })
          .catch((error) => {
            console.error('reCAPTCHA error:', error);
            resolve(null);
          });
      });
    } else {
      console.warn('reCAPTCHA not loaded');
      resolve(null);
    }
  });
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: false,
  initialized: false,

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    try {
      // Get reCAPTCHA token
      const captchaToken = await getCaptchaToken('signin');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: captchaToken ? {
          captchaToken
        } : undefined,
      });

      if (error) {
        set({ loading: false });
        return { error };
      }

      if (data.user) {
        set({
          user: data.user,
          session: data.session,
          loading: false
        });

        // Sync auth tokens to Keychain for Siri intents
        if (Capacitor.isNativePlatform() && data.session) {
          SiriIntent.syncAuthToken({
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token ?? '',
            userId: data.user.id,
          }).then(() => {
            console.log('[AuthStore] Synced auth tokens to Keychain on signIn');
          }).catch((e: any) => {
            console.warn('[AuthStore] Failed to sync on signIn:', e);
          });
        }

        // Initialize subscription service for cross-platform sync
        await subscriptionService.initialize(data.user.id);

        // Fetch user profile after successful login
        await get().fetchProfile();
      }
      
      return { error: null };
    } catch (error) {
      set({ loading: false });
      return { error: error as Error };
    }
  },

  signUp: async (email: string, password: string, metadata?: SignUpMetadata) => {
    set({ loading: true });
    try {
      // Clear all localStorage data before creating new account
      localStorage.clear();

      console.log('[AuthStore] Signing up:', email);

      // Get reCAPTCHA token
      const captchaToken = await getCaptchaToken('signup');

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          captchaToken,
          data: {
            full_name: metadata?.fullName,
            company_name: metadata?.companyName,
            phone: metadata?.phoneNumber,
          }
        }
      });

      console.log('[AuthStore] Signup response:', {
        hasUser: !!data.user,
        hasSession: !!data.session,
        emailConfirmed: data.user?.email_confirmed_at,
        identities: data.user?.identities?.length,
        error: error
      });

      if (error) {
        set({ loading: false });
        return { error };
      }

      if (data.user) {
        // Check if this is a duplicate signup (user exists but no identities)
        // This means the email is already registered
        if (data.user.identities && data.user.identities.length === 0) {
          console.log('[AuthStore] Email already registered - no new identity created');
          set({ loading: false });
          return {
            error: new Error('This email is already registered. Please sign in instead or use password reset if you forgot your password.'),
            user: null,
            session: null
          };
        }

        // Only set user/session if email is confirmed or confirmation is disabled
        if (data.user.email_confirmed_at || data.session) {
          console.log('[AuthStore] Email confirmed or confirmation disabled - logging in');
          set({
            user: data.user,
            session: data.session,
            loading: false
          });

          // Initialize subscription service for cross-platform sync
          await subscriptionService.initialize(data.user.id);
        } else {
          console.log('[AuthStore] Email confirmation required');
          // Email needs confirmation, don't set user yet
          set({ loading: false });
        }

        // Send registration data to n8n webhook (only for new signups)
        if (data.user.identities && data.user.identities.length > 0) {
          try {
            await fetch('https://contractorai.app.n8n.cloud/webhook/47e9a815-fbd7-4ac7-a3d0-0ec212d977fc', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email,
                timestamp: new Date().toISOString(),
                platform: 'webapp'
              }),
            });
          } catch (webhookError) {
            console.error('Webhook notification failed:', webhookError);
            // Don't fail the signup if webhook fails
          }
        }
      }

      set({ loading: false });
      return { error: null, user: data.user, session: data.session };
    } catch (error) {
      console.error('[AuthStore] Signup exception:', error);
      set({ loading: false });
      return { error: error as Error };
    }
  },

  signOut: async () => {
    set({ loading: true });
    try {
      // Clear Siri Keychain tokens before sign out
      if (Capacitor.isNativePlatform()) {
        try {
          await SiriIntent.clearAuthToken();
        } catch (e) {
          console.warn('Failed to clear Keychain tokens:', e);
        }
      }

      await supabase.auth.signOut();

      // Clear all localStorage data on sign out
      localStorage.clear();

      set({
        user: null,
        profile: null,
        session: null,
        loading: false
      });
    } catch (error) {
      console.error('Error signing out:', error);
      set({ loading: false });
    }
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        set({ profile: data });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { user } = get();
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        return { error };
      }

      if (data) {
        set({ profile: data });
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  initialize: async () => {
    // Prevent multiple simultaneous initializations
    if (initializationPromise) {
      console.log('⏳ Auth initialization already in progress, waiting...');
      return initializationPromise;
    }

    // Check if already initialized
    if (get().initialized) {
      console.log('✅ Auth already initialized');
      return Promise.resolve();
    }

    initializationPromise = (async () => {
      let authSubscription: any = null;

      try {
        console.log('🔐 Initializing auth...');

        // Set up auth state change listener FIRST (before getSession)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('🔄 Auth state changed:', event, session ? 'Session active' : 'No session');

            if (session) {
              set({
                user: session.user,
                session,
                initialized: true
              });

              // Sync auth tokens to Keychain for Siri intents
              if (Capacitor.isNativePlatform()) {
                SiriIntent.syncAuthToken({
                  accessToken: session.access_token,
                  refreshToken: session.refresh_token ?? '',
                  userId: session.user.id,
                }).then(() => {
                  console.log('[AuthStore] Synced auth tokens to Keychain for Siri');
                }).catch((e: any) => {
                  console.warn('[AuthStore] Failed to sync auth token to Keychain:', e);
                });
              }

              // Initialize subscription service for cross-platform sync
              subscriptionService.initialize(session.user.id).catch(err =>
                console.error('Failed to initialize subscription service:', err)
              );

              // Fetch profile on sign in (in background)
              if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                get().fetchProfile().catch(err =>
                  console.error('Failed to fetch profile:', err)
                );
              }

              // Send webhook for new OAuth signups (Google/Apple)
              // Only fires on SIGNED_IN (not INITIAL_SESSION which is page reload)
              // and only if the account was created in the last 60 seconds
              if (event === 'SIGNED_IN' && session.user.app_metadata?.provider !== 'email') {
                const createdAt = new Date(session.user.created_at).getTime();
                const now = Date.now();
                if (now - createdAt < 60000) {
                  try {
                    await fetch('https://contractorai.app.n8n.cloud/webhook/47e9a815-fbd7-4ac7-a3d0-0ec212d977fc', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        email: session.user.email,
                        timestamp: new Date().toISOString(),
                        platform: session.user.app_metadata?.provider || 'oauth',
                      }),
                    });
                  } catch (webhookError) {
                    console.error('OAuth signup webhook failed:', webhookError);
                  }
                }
              }
            } else if (event === 'SIGNED_OUT') {
              set({
                user: null,
                profile: null,
                session: null,
                initialized: true
              });
            }
          }
        );

        authSubscription = subscription;

        // Try to get session with aggressive timeout (5 seconds)
        // If it times out, we'll rely on the auth state listener above
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Session check timeout')), 5000)
          );

          const sessionPromise = supabase.auth.getSession();

          const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

          console.log('✅ Session retrieved immediately:', session ? 'Logged in' : 'Not logged in');

          if (session) {
            set({
              user: session.user,
              session,
              initialized: true
            });

            // Sync auth tokens to Keychain for Siri intents
            if (Capacitor.isNativePlatform()) {
              SiriIntent.syncAuthToken({
                accessToken: session.access_token,
                refreshToken: session.refresh_token ?? '',
                userId: session.user.id,
              }).then(() => {
                console.log('[AuthStore] Synced auth tokens to Keychain on getSession');
              }).catch((e: any) => {
                console.warn('[AuthStore] Failed to sync on getSession:', e);
              });
            }

            // Initialize subscription service for cross-platform sync
            subscriptionService.initialize(session.user.id).catch(err =>
              console.error('Failed to initialize subscription service:', err)
            );

            // Fetch user profile in background
            get().fetchProfile().catch(err =>
              console.error('Failed to fetch profile:', err)
            );
          } else {
            set({ initialized: true });
          }
        } catch (timeoutError) {
          console.warn('⚠️  Session check timed out, waiting for auth state event...');

          // Wait a bit for the auth state listener to fire
          await new Promise(resolve => setTimeout(resolve, 1000));

          // If still not initialized, mark as initialized with no user
          if (!get().initialized) {
            console.log('📋 Marking as initialized without session');
            set({ initialized: true });
          }
        }

        // Return cleanup function
        return () => {
          if (authSubscription) {
            authSubscription.unsubscribe();
          }
        };
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        // Always mark as initialized even on error
        set({
          initialized: true,
          user: null,
          session: null,
          profile: null
        });

        if (authSubscription) {
          authSubscription.unsubscribe();
        }
      } finally {
        // Clear the promise so future calls work properly
        initializationPromise = null;
      }
    })();

    return initializationPromise;
  },
}));

// Initialize auth on app start - only once
if (typeof window !== 'undefined') {
  useAuthStore.getState().initialize();
}