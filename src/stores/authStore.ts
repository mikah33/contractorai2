import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

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
  signUp: (email: string, password: string, metadata?: SignUpMetadata) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  initialize: () => Promise<void>;
}

// Track if initialization has been called
let initializationPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: false,
  initialized: false,

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata?.fullName,
            company_name: metadata?.companyName,
            phone: metadata?.phoneNumber,
          }
        }
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

        // Send registration data to n8n webhook
        try {
          await fetch('https://contractorai.app.n8n.cloud/webhook/170d14a9-ace1-49cf-baab-49dd8aec1245', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              fullName: metadata?.fullName || '',
              companyName: metadata?.companyName || '',
              phoneNumber: metadata?.phoneNumber || '',
              userId: data.user.id,
              timestamp: new Date().toISOString(),
              source: 'ContractorAI Web App',
            }),
          });
        } catch (webhookError) {
          console.error('Webhook notification failed:', webhookError);
          // Don't fail the signup if webhook fails
        }
      }

      return { error: null };
    } catch (error) {
      set({ loading: false });
      return { error: error as Error };
    }
  },

  signOut: async () => {
    set({ loading: true });
    try {
      await supabase.auth.signOut();
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
      try {
        console.log('🔐 Initializing auth...');

        // Get initial session with longer timeout (30 seconds for slow connections)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth initialization timeout')), 30000)
        );

        const sessionPromise = supabase.auth.getSession();

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

        console.log('✅ Session retrieved:', session ? 'Logged in' : 'Not logged in');

        if (session) {
          set({
            user: session.user,
            session,
            initialized: true
          });

          // Fetch user profile in background (don't block)
          get().fetchProfile().catch(err =>
            console.error('Failed to fetch profile:', err)
          );
        } else {
          set({ initialized: true });
        }

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('🔄 Auth state changed:', event);

            if (session) {
              set({
                user: session.user,
                session
              });

              // Fetch profile on sign in (in background)
              if (event === 'SIGNED_IN') {
                get().fetchProfile().catch(err =>
                  console.error('Failed to fetch profile:', err)
                );
              }
            } else {
              set({
                user: null,
                profile: null,
                session: null
              });
            }
          }
        );

        // Clean up subscription on unmount
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        // Always mark as initialized even on error to prevent infinite loading
        set({
          initialized: true,
          user: null,
          session: null,
          profile: null
        });
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