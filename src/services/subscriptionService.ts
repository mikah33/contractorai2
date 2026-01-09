import { Capacitor } from '@capacitor/core';
import { revenueCatService } from './revenueCatService';
import { revenueCatWebService } from './revenueCatWebService';
import { supabase } from '../lib/supabase';

/**
 * Unified subscription service that works across iOS and Web
 * Handles cross-platform subscription linking and verification
 */
class SubscriptionService {
  private currentUserId: string | null = null;

  /**
   * Initialize subscription service for current user
   */
  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;

    try {
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        // Initialize iOS RevenueCat
        await revenueCatService.initialize(userId);
      } else {
        // Initialize Web RevenueCat
        await revenueCatWebService.initialize(userId);
      }

      // Always check and sync subscription status from the initialized platform
      await this.syncSubscriptionStatus();
    } catch (error) {
      console.error('[SubscriptionService] Initialization failed:', error);
    }
  }

  /**
   * Check if user has active subscription from any platform
   */
  async hasActiveSubscription(): Promise<boolean> {
    if (!this.currentUserId) {
      return false;
    }

    try {
      // First check Supabase database for ANY subscription
      const { data: subscriptions, error } = await supabase
        .from('user_subscriptions')
        .select('is_active, platform, expires_at, product_id')
        .eq('user_id', this.currentUserId);

      if (!error && subscriptions && subscriptions.length > 0) {
        // Check for active subscription first
        const activeSubscription = subscriptions.find(s => s.is_active);
        if (activeSubscription) {
          console.log('[SubscriptionService] Found active subscription in database:', activeSubscription.platform);
          return true;
        }

        // Cross-platform override: If iOS subscription exists (even if is_active: false)
        // grant access because web can't verify iOS subscriptions
        const iosSubscription = subscriptions.find(s => s.platform === 'ios');
        if (iosSubscription) {
          console.log('[SubscriptionService] Found iOS subscription in database, granting cross-platform access');
          return true;
        }
      }

      // If not in database or inactive, check current platform
      const isNative = Capacitor.isNativePlatform();
      let hasSubscription = false;

      if (isNative) {
        hasSubscription = await revenueCatService.hasActiveSubscription();
        if (hasSubscription) {
          console.log('[SubscriptionService] Found active subscription on iOS, syncing...');
          await revenueCatService.syncSubscriptionToSupabase();
        }
      } else {
        hasSubscription = await revenueCatWebService.hasActiveSubscription();
        if (hasSubscription) {
          console.log('[SubscriptionService] Found active subscription on Web, syncing...');
          await revenueCatWebService.syncSubscriptionToSupabase();
        }
      }

      return hasSubscription;
    } catch (error) {
      console.error('[SubscriptionService] Error checking subscription:', error);
      return false;
    }
  }

  /**
   * Force sync subscription status from current platform to Supabase
   */
  async syncSubscriptionStatus(): Promise<void> {
    if (!this.currentUserId) {
      return;
    }

    try {
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        await revenueCatService.syncSubscriptionToSupabase();
      } else {
        await revenueCatWebService.syncSubscriptionToSupabase();
      }

      console.log('[SubscriptionService] Subscription status synced');
    } catch (error) {
      console.error('[SubscriptionService] Sync failed:', error);
    }
  }

  /**
   * Link user accounts between iOS and Web RevenueCat projects
   */
  async linkCrossPlatformSubscriptions(): Promise<void> {
    if (!this.currentUserId) {
      return;
    }

    try {
      // Check if user has subscription on either platform
      const { data: existingSubscriptions } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', this.currentUserId);

      console.log('[SubscriptionService] Existing subscriptions:', existingSubscriptions?.length || 0);

      // Check for ANY subscription (iOS cross-platform support)
      const iosSubscription = existingSubscriptions?.find(s => s.platform === 'ios');
      const webSubscription = existingSubscriptions?.find(s => s.platform === 'web' && s.is_active);

      // Cross-platform override: If iOS subscription exists, grant access on web
      // This is necessary because web RevenueCat can't verify iOS subscriptions
      if (iosSubscription) {
        console.log('[SubscriptionService] iOS subscription detected, granting cross-platform access');
        return true;
      }

      if (iosSubscription && !webSubscription) {
        console.log('[SubscriptionService] iOS subscription found, creating web link...');

        // Create a web subscription entry based on iOS subscription
        const { error } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: this.currentUserId,
            revenuecat_app_user_id: iosSubscription.revenuecat_app_user_id,
            is_active: true,
            product_id: iosSubscription.product_id,
            entitlement_id: iosSubscription.entitlement_id,
            expires_at: iosSubscription.expires_at,
            will_renew: iosSubscription.will_renew,
            platform: 'web',
            linked_from_platform: 'ios',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,platform'
          });

        if (error) {
          console.error('[SubscriptionService] Failed to link subscription:', error);
        } else {
          console.log('[SubscriptionService] Successfully linked iOS subscription to web');
        }
      }

      if (webSubscription && !iosSubscription) {
        console.log('[SubscriptionService] Web subscription found, creating iOS link...');

        // Create an iOS subscription entry based on web subscription
        const { error } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: this.currentUserId,
            revenuecat_app_user_id: webSubscription.revenuecat_app_user_id,
            is_active: true,
            product_id: webSubscription.product_id,
            entitlement_id: webSubscription.entitlement_id,
            expires_at: webSubscription.expires_at,
            will_renew: webSubscription.will_renew,
            platform: 'ios',
            linked_from_platform: 'web',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,platform'
          });

        if (error) {
          console.error('[SubscriptionService] Failed to link subscription:', error);
        } else {
          console.log('[SubscriptionService] Successfully linked web subscription to iOS');
        }
      }
    } catch (error) {
      console.error('[SubscriptionService] Cross-platform linking failed:', error);
    }
  }

  /**
   * Get subscription details from database
   */
  async getSubscriptionDetails() {
    if (!this.currentUserId) {
      return null;
    }

    const { data } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', this.currentUserId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    return data;
  }

  /**
   * Force refresh subscription from current platform
   */
  async refreshSubscription(): Promise<boolean> {
    if (!this.currentUserId) {
      return false;
    }

    try {
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        // Restore purchases on iOS to get latest subscription state
        await revenueCatService.restorePurchases();
        await revenueCatService.syncSubscriptionToSupabase();
      } else {
        // Refresh customer info on web
        await revenueCatWebService.syncSubscriptionToSupabase();
      }

      // Link cross-platform subscriptions
      await this.linkCrossPlatformSubscriptions();

      // Check final status
      return await this.hasActiveSubscription();
    } catch (error) {
      console.error('[SubscriptionService] Refresh failed:', error);
      return false;
    }
  }
}

// Export singleton
export const subscriptionService = new SubscriptionService();