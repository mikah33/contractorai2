import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import useEstimateStore from '../stores/estimateStore';

interface EstimateRealtimeSubscription {
  subscribe: () => void;
  unsubscribe: () => void;
}

export const useEstimateRealtime = (userId?: string): EstimateRealtimeSubscription => {
  const { fetchEstimates, updateLocalEstimate } = useEstimateStore();

  const subscribe = useCallback(() => {
    if (!userId) return;

    console.log('🔄 Setting up real-time estimate subscriptions...');

    // Subscribe to estimates table changes
    const estimateSubscription = supabase
      .channel('estimates-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'estimates',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('📊 Estimate updated via real-time:', payload);

        if (payload.eventType === 'UPDATE' && payload.new) {
          // Update local store with the new estimate data
          updateLocalEstimate(payload.new.id, payload.new);
        } else if (payload.eventType === 'INSERT' && payload.new) {
          // Refresh estimates to include new one
          fetchEstimates();
        } else if (payload.eventType === 'DELETE') {
          // Refresh estimates to remove deleted one
          fetchEstimates();
        }
      })
      .subscribe((status) => {
        console.log('📡 Estimates subscription status:', status);
      });

    // Subscribe to estimate email responses for status changes
    const responseSubscription = supabase
      .channel('estimate-responses-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'estimate_email_responses'
      }, async (payload) => {
        console.log('📧 Estimate response updated via real-time:', payload);

        if (payload.eventType === 'UPDATE' && payload.new) {
          const { estimate_id, accepted, declined, responded_at } = payload.new;

          if (accepted === true || declined === true) {
            // Customer responded - update estimate status
            const newStatus = accepted ? 'approved' : 'declined';
            console.log(`✅ Customer ${newStatus} estimate ${estimate_id}`);

            // Update the estimate in our store immediately without waiting for database fetch
            // This ensures instant UI updates
            updateLocalEstimate(estimate_id, { status: newStatus });

            // Also trigger a full refresh to ensure we have the latest data
            setTimeout(() => {
              fetchEstimates();
            }, 1000);

            console.log(`🔄 Updated local estimate ${estimate_id} status to ${newStatus}`);
          }
        }
      })
      .subscribe((status) => {
        console.log('📡 Estimate responses subscription status:', status);
      });

    // Store subscription references for cleanup
    (window as any).__estimateSubscriptions = {
      estimates: estimateSubscription,
      responses: responseSubscription
    };

  }, [userId, fetchEstimates, updateLocalEstimate]);

  const unsubscribe = useCallback(() => {
    console.log('🔄 Cleaning up estimate real-time subscriptions...');

    const subscriptions = (window as any).__estimateSubscriptions;
    if (subscriptions) {
      subscriptions.estimates?.unsubscribe();
      subscriptions.responses?.unsubscribe();
      delete (window as any).__estimateSubscriptions;
    }
  }, []);

  useEffect(() => {
    if (userId) {
      subscribe();
      return unsubscribe;
    }
  }, [userId, subscribe, unsubscribe]);

  return { subscribe, unsubscribe };
};

export default useEstimateRealtime;