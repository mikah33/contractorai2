import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { notificationService } from '../services/notifications/notificationService';
import { CalendarService } from '../services/calendarService';
import { useLeadsStore } from '../stores/leadsStore';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Global app initialization hook with React Query caching
 * PREFETCHES ALL DATA ON LOGIN so every tab is ready immediately
 */
export const useAppInitialization = () => {
  // Use ref to persist initialization state across re-renders
  const hasInitialized = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // If already initialized via ref, always return initialized
    if (hasInitialized.current) {
      if (!isInitialized) {
        setIsInitialized(true);
      }
      return;
    }

    if (!user) {
      // No user = immediately mark as initialized (don't block login screen)
      if (!isInitialized) {
        setIsInitialized(true);
        hasInitialized.current = true;
      }
      return;
    }

    let isMounted = true;

    const prefetchAllData = async () => {
      try {
        console.log('🚀 Loading essential data...');

        // Only prefetch CRITICAL data on login - lazy load the rest
        // This makes login much faster
        const prefetchPromises = [
          // Projects (critical - used in many places)
          queryClient.prefetchQuery({
            queryKey: queryKeys.projects,
            queryFn: async () => {
              const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
              if (error) throw error;
              console.log('  ✅ Projects loaded');
              return data || [];
            },
          }),

          // Clients (critical - used in many places)
          queryClient.prefetchQuery({
            queryKey: queryKeys.clients,
            queryFn: async () => {
              const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
              if (error) throw error;
              console.log('  ✅ Clients loaded');
              return data || [];
            },
          }),
        ];

        // Wait for critical data only
        await Promise.all(prefetchPromises);

        if (isMounted) {
          console.log('✅ Essential data loaded - app ready!');
          console.log('   Other data will load on-demand when you visit each page');
          hasInitialized.current = true;
          setIsInitialized(true);

          // Prefetch other data in background (don't wait)
          setTimeout(() => {
            console.log('🔄 Background loading additional data...');

            // Estimates
            queryClient.prefetchQuery({
              queryKey: queryKeys.estimates,
              queryFn: async () => {
                const { data } = await supabase
                  .from('estimates')
                  .select('*')
                  .eq('user_id', user.id)
                  .order('created_at', { ascending: false });
                return data || [];
              },
            }).catch(() => {});

            // Invoices
            queryClient.prefetchQuery({
              queryKey: queryKeys.invoices,
              queryFn: async () => {
                const { data } = await supabase
                  .from('invoices')
                  .select('*')
                  .eq('user_id', user.id)
                  .order('created_at', { ascending: false });
                return data || [];
              },
            }).catch(() => {});

            // Request notification permissions and sync calendar notifications
            (async () => {
              try {
                console.log('🔔 Requesting notification permissions...');
                const perms = await notificationService.requestPermissions();
                console.log('  ✅ Notification permissions:', perms.display);

                if (perms.display === 'granted') {
                  console.log('🔔 Syncing calendar notifications...');
                  await CalendarService.syncAllEventNotifications(user.id);
                  console.log('  ✅ Calendar notifications synced');

                  // Schedule outreach reminders
                  if (Capacitor.getPlatform() !== 'web') {
                    try {
                      console.log('🔔 Scheduling outreach reminders...');
                      const store = useLeadsStore.getState();
                      // Wait for leads if not loaded yet
                      if (!store.hasLoadedOnce || store.leads.length === 0) {
                        console.log('  ⏳ Leads not loaded yet, fetching...');
                        await store.fetchLeads(true);
                      }
                      const leads = useLeadsStore.getState().leads;
                      console.log(`  📊 Found ${leads.length} leads to check`);

                      // Log each lead's scheduling eligibility
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      let scheduled = 0;
                      for (const lead of leads) {
                        if (['converted', 'lost', 'dead'].includes(lead.status)) {
                          console.log(`  ⏭️ ${lead.name}: skipped (${lead.status})`);
                          continue;
                        }

                        let scheduleDate: Date;
                        if (lead.nextOutreachDate) {
                          const nd = new Date(lead.nextOutreachDate);
                          const ndDay = new Date(nd);
                          ndDay.setHours(0, 0, 0, 0);
                          if (ndDay < today) {
                            console.log(`  ⏭️ ${lead.name}: skipped (nextOutreach ${lead.nextOutreachDate} is past)`);
                            continue;
                          }
                          scheduleDate = nd;
                        } else if (lead.status === 'new' && lead.outreachCount === 0) {
                          scheduleDate = new Date();
                        } else {
                          console.log(`  ⏭️ ${lead.name}: skipped (status=${lead.status}, outreach=${lead.outreachCount}, no nextDate)`);
                          continue;
                        }

                        // Set time based on priority
                        if (lead.outreachCount >= 3 || lead.status === 'cold') {
                          scheduleDate.setHours(9, 0, 0, 0);
                        } else if (lead.outreachCount >= 1) {
                          scheduleDate.setHours(12, 0, 0, 0);
                        } else {
                          scheduleDate.setHours(15, 0, 0, 0);
                        }

                        // Bump to next slot if time passed
                        if (scheduleDate <= new Date()) {
                          const now = new Date();
                          if (now.getHours() < 12) {
                            scheduleDate.setHours(12, 0, 0, 0);
                          } else if (now.getHours() < 15) {
                            scheduleDate.setHours(15, 0, 0, 0);
                          } else {
                            scheduleDate.setDate(scheduleDate.getDate() + 1);
                            scheduleDate.setHours(9, 0, 0, 0);
                          }
                        }

                        if (scheduleDate <= new Date()) {
                          console.log(`  ⏭️ ${lead.name}: skipped (schedule date still in past)`);
                          continue;
                        }

                        const totalAttempts = lead.outreachCount >= 5 ? 7 : 5;
                        let title: string;
                        let body: string;
                        if (lead.outreachCount >= 5) {
                          title = `Last chance — Follow up with ${lead.name}`;
                          body = 'Cold lead — this may be your last shot';
                        } else if (lead.outreachCount >= 3) {
                          title = `Call ${lead.name} today — going cold soon`;
                          body = `Attempt ${lead.outreachCount + 1}/${totalAttempts}`;
                        } else if (lead.outreachCount >= 1) {
                          title = `Call ${lead.name} today`;
                          body = `Attempt ${lead.outreachCount + 1}/${totalAttempts} — don't let this one slip`;
                        } else {
                          title = `New lead — Call ${lead.name} today`;
                          body = 'First contact — strike while the iron is hot';
                        }

                        const notifId = Math.floor(Math.random() * 900000) + 100000;
                        console.log(`  ✅ ${lead.name}: scheduling "${title}" for ${scheduleDate.toLocaleString()} (id: ${notifId})`);

                        await LocalNotifications.schedule({
                          notifications: [{
                            id: notifId,
                            title,
                            body,
                            schedule: { at: scheduleDate },
                            extra: { type: 'outreach_reminder', leadId: lead.id },
                            sound: 'default',
                          }],
                        });
                        scheduled++;
                      }
                      console.log(`  🔔 Outreach: ${scheduled} notifications scheduled`);
                    } catch (outreachErr) {
                      console.error('  ⚠️ Outreach scheduling error:', outreachErr);
                    }
                  }
                }
              } catch (err) {
                console.error('  ⚠️ Notification setup error:', err);
              }
            })();
          }, 2000); // Start background loading after 2 seconds
        }
      } catch (error) {
        console.error('❌ Error loading data:', error);
        if (isMounted) {
          setInitError(error instanceof Error ? error.message : 'Failed to load data');
          hasInitialized.current = true;
          setIsInitialized(true); // Initialize anyway to not block app
        }
      }
    };

    prefetchAllData();

    return () => {
      isMounted = false;
    };
  }, [user, queryClient]); // Add queryClient to dependencies

  return { isInitialized, initError };
};
