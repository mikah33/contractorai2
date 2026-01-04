import { Purchases } from '@revenuecat/purchases-js';
import { supabase } from '../lib/supabase';

// RevenueCat Web Billing API Key
const REVENUECAT_WEB_API_KEY = 'rcb_pgcHziPmgtouiwlQxXedDkmjYzaQ';

// Entitlement IDs (must match RevenueCat dashboard)
const ENTITLEMENT_ID = 'ContractorAI Pro';
const MARKETING_PREMIUM_ENTITLEMENT = 'Marketing Premium';
const MARKETING_ADS_ENTITLEMENT = 'Marketing Ads';

// Web Product IDs (must match RevenueCat Web Billing products)
export const WEB_PRODUCT_IDS = {
  MONTHLY: 'stripe_monthly',
  QUARTERLY: 'stripe_quarterly',
  YEARLY: 'stripe_yearly',
  MARKETING_PREMIUM: 'stripe_marketing_premium',
  MARKETING_ADS: 'stripe_marketing_ads',
};

class RevenueCatWebService {
  private initialized = false;
  private currentUserId: string | null = null;

  /**
   * Initialize RevenueCat Web SDK
   */
  async initialize(userId?: string): Promise<void> {
    if (this.initialized && this.currentUserId === userId) {
      console.log('[RevenueCatWeb] Already initialized');
      return;
    }

    try {
      console.log('[RevenueCatWeb] Initializing Web SDK with user:', userId);

      this.currentUserId = userId || null;

      // Configure RevenueCat for Web using object syntax
      Purchases.configure({
        apiKey: REVENUECAT_WEB_API_KEY,
        appUserId: userId || 'anonymous',
      });

      console.log('[RevenueCatWeb] Web SDK initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('[RevenueCatWeb] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.getSharedInstance().getCustomerInfo();

      // Log all active entitlements for debugging
      console.log('[RevenueCatWeb] Active entitlements:', Object.keys(customerInfo.entitlements.active));

      // Check for specific entitlement OR any active entitlement
      const hasSpecificEntitlement = ENTITLEMENT_ID in customerInfo.entitlements.active;
      const hasAnyEntitlement = Object.keys(customerInfo.entitlements.active).length > 0;

      console.log('[RevenueCatWeb] Has specific entitlement:', hasSpecificEntitlement);
      console.log('[RevenueCatWeb] Has any entitlement:', hasAnyEntitlement);

      // Return true if user has the specific entitlement or any active subscription
      return hasSpecificEntitlement || hasAnyEntitlement;
    } catch (error) {
      console.error('[RevenueCatWeb] Error checking subscription:', error);
      return false;
    }
  }

  /**
   * Check if user has Marketing Premium subscription
   */
  async hasMarketingPremium(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.getSharedInstance().getCustomerInfo();
      return customerInfo.entitlements.active[MARKETING_PREMIUM_ENTITLEMENT] !== undefined;
    } catch (error) {
      console.error('[RevenueCatWeb] Error checking Marketing Premium:', error);
      return false;
    }
  }

  /**
   * Check if user has Marketing Ads subscription
   */
  async hasMarketingAds(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.getSharedInstance().getCustomerInfo();
      return customerInfo.entitlements.active[MARKETING_ADS_ENTITLEMENT] !== undefined;
    } catch (error) {
      console.error('[RevenueCatWeb] Error checking Marketing Ads:', error);
      return false;
    }
  }

  /**
   * Get all marketing subscription statuses
   */
  async getMarketingSubscriptionStatus(): Promise<{
    hasPremium: boolean;
    hasAds: boolean;
  }> {
    try {
      const customerInfo = await Purchases.getSharedInstance().getCustomerInfo();
      return {
        hasPremium: customerInfo.entitlements.active[MARKETING_PREMIUM_ENTITLEMENT] !== undefined,
        hasAds: customerInfo.entitlements.active[MARKETING_ADS_ENTITLEMENT] !== undefined,
      };
    } catch (error) {
      console.error('[RevenueCatWeb] Error getting marketing status:', error);
      return { hasPremium: false, hasAds: false };
    }
  }

  /**
   * Get available offerings
   */
  async getOfferings() {
    try {
      const offerings = await Purchases.getSharedInstance().getOfferings();
      console.log('[RevenueCatWeb] Offerings:', offerings);
      return offerings;
    } catch (error) {
      console.error('[RevenueCatWeb] Error getting offerings:', error);
      return null;
    }
  }

  /**
   * Purchase a product - opens RevenueCat's web checkout
   */
  async purchaseProduct(productId: string): Promise<{ success: boolean }> {
    try {
      console.log('[RevenueCatWeb] Starting purchase for:', productId);

      const offerings = await this.getOfferings();
      if (!offerings?.current) {
        throw new Error('No offerings available');
      }

      // Find the package with this product
      let packageToPurchase = null;

      // Check current offering
      for (const pkg of offerings.current.availablePackages) {
        if (pkg.rcBillingProduct?.identifier === productId) {
          packageToPurchase = pkg;
          break;
        }
      }

      // Check all offerings if not found
      if (!packageToPurchase && offerings.all) {
        for (const offering of Object.values(offerings.all)) {
          for (const pkg of offering.availablePackages) {
            if (pkg.rcBillingProduct?.identifier === productId) {
              packageToPurchase = pkg;
              break;
            }
          }
          if (packageToPurchase) break;
        }
      }

      if (!packageToPurchase) {
        throw new Error(`Product ${productId} not found in offerings`);
      }

      // Purchase the package - this opens RevenueCat's checkout
      const result = await Purchases.getSharedInstance().purchase({ rcPackage: packageToPurchase });

      console.log('[RevenueCatWeb] Purchase result:', result);

      // Sync to Supabase
      await this.syncSubscriptionToSupabase();

      return { success: true };
    } catch (error: any) {
      console.error('[RevenueCatWeb] Purchase error:', error);

      if (error.userCancelled) {
        return { success: false };
      }

      throw error;
    }
  }

  /**
   * Purchase using current/default offering (auto-detects the right one)
   */
  async purchaseCurrentOffering(): Promise<{ success: boolean }> {
    try {
      console.log('[RevenueCatWeb] Purchasing from current offering');

      const offerings = await this.getOfferings();
      console.log('[RevenueCatWeb] All offerings:', offerings?.all ? Object.keys(offerings.all) : 'none');

      // Try current offering first, then first available offering
      let offering = offerings?.current;

      if (!offering && offerings?.all) {
        const offeringKeys = Object.keys(offerings.all);
        console.log('[RevenueCatWeb] No current offering, available offerings:', offeringKeys);
        if (offeringKeys.length > 0) {
          offering = offerings.all[offeringKeys[0]];
        }
      }

      if (!offering) {
        throw new Error('No offerings available');
      }

      console.log('[RevenueCatWeb] Using offering:', offering.identifier);
      const packageToPurchase = offering.availablePackages[0];

      if (!packageToPurchase) {
        throw new Error('No packages available in offering');
      }

      console.log('[RevenueCatWeb] Purchasing package:', packageToPurchase.identifier);
      const result = await Purchases.getSharedInstance().purchase({ rcPackage: packageToPurchase });

      console.log('[RevenueCatWeb] Purchase result:', result);
      await this.syncSubscriptionToSupabase();

      return { success: true };
    } catch (error: any) {
      console.error('[RevenueCatWeb] Purchase error:', error);

      if (error.userCancelled) {
        return { success: false };
      }

      throw error;
    }
  }

  /**
   * Purchase by offering identifier (e.g., 'Marketing', 'Ads')
   * Searches for offering by identifier or by matching keywords
   */
  async purchaseByOffering(offeringIdentifier: string): Promise<{ success: boolean }> {
    try {
      console.log('[RevenueCatWeb] Purchasing from offering:', offeringIdentifier);

      const offerings = await this.getOfferings();
      console.log('[RevenueCatWeb] Available offerings:', offerings?.all ? Object.keys(offerings.all) : 'none');

      let offering = offerings?.all?.[offeringIdentifier];

      // If not found by exact match, search by keyword
      if (!offering && offerings?.all) {
        const searchTerm = offeringIdentifier.toLowerCase();
        for (const [key, value] of Object.entries(offerings.all)) {
          if (key.toLowerCase().includes(searchTerm) || searchTerm.includes(key.toLowerCase())) {
            console.log('[RevenueCatWeb] Found offering by keyword match:', key);
            offering = value;
            break;
          }
        }
      }

      if (!offering) {
        console.error('[RevenueCatWeb] Available offerings:', offerings?.all ? Object.keys(offerings.all) : 'none');
        throw new Error(`Offering "${offeringIdentifier}" not found. Available: ${offerings?.all ? Object.keys(offerings.all).join(', ') : 'none'}`);
      }

      const packageToPurchase = offering.availablePackages[0]; // Get first package

      if (!packageToPurchase) {
        throw new Error('No packages available in offering');
      }

      console.log('[RevenueCatWeb] Purchasing package:', packageToPurchase.identifier);
      const result = await Purchases.getSharedInstance().purchase({ rcPackage: packageToPurchase });

      console.log('[RevenueCatWeb] Purchase result:', result);
      await this.syncSubscriptionToSupabase();

      return { success: true };
    } catch (error: any) {
      console.error('[RevenueCatWeb] Purchase error:', error);

      if (error.userCancelled) {
        return { success: false };
      }

      throw error;
    }
  }

  /**
   * Sync subscription to Supabase
   */
  async syncSubscriptionToSupabase(): Promise<void> {
    try {
      if (!this.currentUserId) {
        console.log('[RevenueCatWeb] No user ID, skipping sync');
        return;
      }

      const customerInfo = await Purchases.getSharedInstance().getCustomerInfo();
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      const isActive = entitlement !== undefined;

      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: this.currentUserId,
          revenuecat_app_user_id: customerInfo.originalAppUserId,
          is_active: isActive,
          product_id: entitlement?.productIdentifier || null,
          entitlement_id: isActive ? ENTITLEMENT_ID : null,
          expires_at: entitlement?.expirationDate || null,
          will_renew: entitlement?.willRenew || false,
          platform: 'web',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('[RevenueCatWeb] Sync error:', error);
      } else {
        console.log('[RevenueCatWeb] Synced to Supabase');
      }
    } catch (error) {
      console.error('[RevenueCatWeb] Sync error:', error);
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton
export const revenueCatWebService = new RevenueCatWebService();
