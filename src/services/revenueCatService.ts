import { Purchases, PurchasesOfferings, CustomerInfo, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';

// RevenueCat Configuration
const REVENUECAT_API_KEY = 'appl_eqImMiOTWqoGHkqkjePGfJrLhMA'; // PUBLIC iOS API key
const ENTITLEMENT_ID = 'ContractorAI Pro';

// Marketing Package Entitlements
const MARKETING_PREMIUM_ENTITLEMENT = 'Marketing Premium';
const MARKETING_ADS_ENTITLEMENT = 'Marketing Ads';

// Product IDs (must match App Store Connect & RevenueCat)
export const PRODUCT_IDS = {
  MARKETING_PREMIUM: 'com.elevated.contractorai.marketing.premium.299',  // $299.99/month
  MARKETING_ADS: 'com.elevated.contractorai.marketing.ads.899',          // $899.99/month
};

class RevenueCatService {
  private initialized = false;
  private customerInfo: CustomerInfo | null = null;
  private currentUserId: string | null = null;

  /**
   * Initialize RevenueCat SDK
   * Should be called once when app starts
   */
  async initialize(userId?: string): Promise<void> {
    if (this.initialized) {
      console.log('[RevenueCat] Already initialized');
      // If user ID changed, log in with new user
      if (userId && userId !== this.currentUserId) {
        console.log('[RevenueCat] User ID changed, identifying new user');
        await this.identify(userId);
      }
      return;
    }

    try {
      const platform = Capacitor.getPlatform();

      if (platform !== 'ios' && platform !== 'android') {
        console.log('[RevenueCat] Not on mobile platform, skipping initialization');
        return;
      }

      console.log('[RevenueCat] Initializing SDK...');

      // Store user ID for later use
      this.currentUserId = userId || null;

      // Configure RevenueCat
      await Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
        appUserID: userId, // Optional: pass user ID from your auth system
      });

      // Set log level for debugging (remove in production)
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

      console.log('[RevenueCat] SDK initialized successfully');
      this.initialized = true;

      // Get initial customer info and sync to Supabase
      await this.refreshCustomerInfo();

      // Sync subscription status to Supabase on init
      if (userId) {
        await this.syncSubscriptionToSupabase();
      }
    } catch (error) {
      console.error('[RevenueCat] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get current customer info
   */
  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      const result = await Purchases.getCustomerInfo();
      this.customerInfo = result.customerInfo;
      return result.customerInfo;
    } catch (error) {
      console.error('[RevenueCat] Failed to get customer info:', error);
      return null;
    }
  }

  /**
   * Refresh customer info from RevenueCat
   */
  async refreshCustomerInfo(): Promise<CustomerInfo | null> {
    return this.getCustomerInfo();
  }

  /**
   * Check if user has active ContractorAI Pro subscription
   */
  async hasActiveSubscription(): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();

      if (!customerInfo) {
        return false;
      }

      // Check if user has the Pro entitlement
      const hasEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

      console.log('[RevenueCat] Active subscription:', hasEntitlement);
      console.log('[RevenueCat] Active entitlements:', Object.keys(customerInfo.entitlements.active));

      return hasEntitlement;
    } catch (error) {
      console.error('[RevenueCat] Error checking subscription:', error);
      return false;
    }
  }

  /**
   * Get available offerings (subscription packages)
   */
  async getOfferings(): Promise<PurchasesOfferings | null> {
    try {
      console.log('[RevenueCat] Fetching offerings...');
      const offerings = await Purchases.getOfferings();
      console.log('[RevenueCat] Offerings:', offerings);
      return offerings;
    } catch (error) {
      console.error('[RevenueCat] Failed to get offerings:', error);
      return null;
    }
  }

  /**
   * Purchase a package
   */
  async purchasePackage(packageId: string): Promise<{ success: boolean; customerInfo?: CustomerInfo }> {
    try {
      console.log('[RevenueCat] Starting purchase for package:', packageId);

      const offerings = await this.getOfferings();
      if (!offerings?.current) {
        throw new Error('No offerings available');
      }

      const packageToPurchase = offerings.current.availablePackages.find(
        (pkg) => pkg.identifier === packageId
      );

      if (!packageToPurchase) {
        throw new Error(`Package ${packageId} not found`);
      }

      const result = await Purchases.purchasePackage({ aPackage: packageToPurchase });

      console.log('[RevenueCat] Purchase successful:', result);
      this.customerInfo = result.customerInfo;

      // Sync subscription to Supabase after successful purchase
      await this.syncSubscriptionToSupabase();

      return {
        success: true,
        customerInfo: result.customerInfo,
      };
    } catch (error: any) {
      console.error('[RevenueCat] Purchase failed:', error);

      // Handle user cancellation
      if (error.code === '1' || error.userCancelled) {
        console.log('[RevenueCat] User cancelled purchase');
        return { success: false };
      }

      throw error;
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<CustomerInfo | null> {
    try {
      console.log('[RevenueCat] Restoring purchases...');
      const result = await Purchases.restorePurchases();
      this.customerInfo = result.customerInfo;
      console.log('[RevenueCat] Purchases restored:', result);

      // Sync subscription to Supabase after restore
      await this.syncSubscriptionToSupabase();

      return result.customerInfo;
    } catch (error) {
      console.error('[RevenueCat] Failed to restore purchases:', error);
      return null;
    }
  }

  /**
   * Set user ID for RevenueCat
   */
  async identify(userId: string): Promise<void> {
    try {
      console.log('[RevenueCat] Identifying user:', userId);
      await Purchases.logIn({ appUserID: userId });
      await this.refreshCustomerInfo();
    } catch (error) {
      console.error('[RevenueCat] Failed to identify user:', error);
    }
  }

  /**
   * Log out user from RevenueCat
   */
  async logout(): Promise<void> {
    try {
      console.log('[RevenueCat] Logging out user');
      await Purchases.logOut();
      this.customerInfo = null;
    } catch (error) {
      console.error('[RevenueCat] Failed to log out:', error);
    }
  }

  /**
   * Get subscription status details
   */
  async getSubscriptionStatus(): Promise<{
    isActive: boolean;
    productId?: string;
    expirationDate?: string;
    willRenew?: boolean;
  }> {
    try {
      const customerInfo = await this.getCustomerInfo();

      if (!customerInfo) {
        return { isActive: false };
      }

      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

      if (!entitlement) {
        return { isActive: false };
      }

      return {
        isActive: true,
        productId: entitlement.productIdentifier,
        expirationDate: entitlement.expirationDate || undefined,
        willRenew: entitlement.willRenew,
      };
    } catch (error) {
      console.error('[RevenueCat] Error getting subscription status:', error);
      return { isActive: false };
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if user has Marketing Premium subscription ($299.99/month)
   */
  async hasMarketingPremium(): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      if (!customerInfo) return false;

      const hasEntitlement = customerInfo.entitlements.active[MARKETING_PREMIUM_ENTITLEMENT] !== undefined;
      console.log('[RevenueCat] Marketing Premium active:', hasEntitlement);
      return hasEntitlement;
    } catch (error) {
      console.error('[RevenueCat] Error checking Marketing Premium:', error);
      return false;
    }
  }

  /**
   * Check if user has Marketing Ads subscription ($899.99/month)
   */
  async hasMarketingAds(): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      if (!customerInfo) return false;

      const hasEntitlement = customerInfo.entitlements.active[MARKETING_ADS_ENTITLEMENT] !== undefined;
      console.log('[RevenueCat] Marketing Ads active:', hasEntitlement);
      return hasEntitlement;
    } catch (error) {
      console.error('[RevenueCat] Error checking Marketing Ads:', error);
      return false;
    }
  }

  /**
   * Purchase a product by its product identifier
   */
  async purchaseProduct(productId: string): Promise<{ success: boolean; customerInfo?: CustomerInfo }> {
    try {
      console.log('[RevenueCat] Starting purchase for product:', productId);

      // First try to get the product directly
      console.log('[RevenueCat] Fetching products for:', [productId]);
      const productsResult = await Purchases.getProducts({ productIdentifiers: [productId] });
      console.log('[RevenueCat] Products result:', productsResult);

      if (productsResult.products && productsResult.products.length > 0) {
        const product = productsResult.products[0];
        console.log('[RevenueCat] Found product, purchasing:', product);
        const result = await Purchases.purchaseStoreProduct({ product });
        this.customerInfo = result.customerInfo;
        await this.syncSubscriptionToSupabase();

        // Send notification for marketing products
        if (this.isMarketingProduct(productId)) {
          await this.notifyMarketingSignup(productId, product.price, result.transaction?.transactionIdentifier);
        }

        return { success: true, customerInfo: result.customerInfo };
      }

      // Fallback: Search through offerings
      console.log('[RevenueCat] Product not found directly, checking offerings...');
      const offerings = await this.getOfferings();
      console.log('[RevenueCat] Offerings:', JSON.stringify(offerings, null, 2));

      if (offerings) {
        let packageToPurchase = null;

        // Check current offering
        if (offerings.current) {
          console.log('[RevenueCat] Current offering packages:', offerings.current.availablePackages.map(p => p.product.identifier));
          packageToPurchase = offerings.current.availablePackages.find(
            (pkg) => pkg.product.identifier === productId
          );
        }

        // Check all offerings if not found in current
        if (!packageToPurchase && offerings.all) {
          for (const offeringKey of Object.keys(offerings.all)) {
            const offering = offerings.all[offeringKey];
            console.log(`[RevenueCat] Offering ${offeringKey} packages:`, offering.availablePackages.map(p => p.product.identifier));
            packageToPurchase = offering.availablePackages.find(
              (pkg) => pkg.product.identifier === productId
            );
            if (packageToPurchase) break;
          }
        }

        if (packageToPurchase) {
          const result = await Purchases.purchasePackage({ aPackage: packageToPurchase });
          console.log('[RevenueCat] Purchase successful:', result);
          this.customerInfo = result.customerInfo;
          await this.syncSubscriptionToSupabase();

          // Send notification for marketing products
          if (this.isMarketingProduct(productId)) {
            await this.notifyMarketingSignup(productId, packageToPurchase.product.price, result.transaction?.transactionIdentifier);
          }

          return { success: true, customerInfo: result.customerInfo };
        }
      }

      throw new Error(`Product ${productId} not found. Please ensure it's configured in App Store Connect and RevenueCat.`);
    } catch (error: any) {
      console.error('[RevenueCat] Purchase failed:', error);

      if (error.code === '1' || error.userCancelled) {
        console.log('[RevenueCat] User cancelled purchase');
        return { success: false };
      }

      throw error;
    }
  }

  /**
   * Check if a product is a marketing product
   */
  private isMarketingProduct(productId: string): boolean {
    return productId === PRODUCT_IDS.MARKETING_PREMIUM || productId === PRODUCT_IDS.MARKETING_ADS;
  }

  /**
   * Send notification for marketing signup to admin
   */
  async notifyMarketingSignup(productId: string, price: number, transactionId?: string): Promise<void> {
    try {
      if (!this.currentUserId) {
        console.log('[RevenueCat] No user ID for marketing notification');
        return;
      }

      const productName = productId === PRODUCT_IDS.MARKETING_PREMIUM
        ? 'Website + Marketing Package'
        : 'Ads & Lead Generation Package';

      console.log('[RevenueCat] Sending marketing signup notification:', {
        userId: this.currentUserId,
        productId,
        productName,
        price,
      });

      const { data, error } = await supabase.functions.invoke('notify-marketing-signup', {
        body: {
          userId: this.currentUserId,
          productId,
          productName,
          price,
          transactionId,
          rcAppUserId: this.customerInfo?.originalAppUserId,
        },
      });

      if (error) {
        console.error('[RevenueCat] Marketing notification error:', error);
      } else {
        console.log('[RevenueCat] Marketing notification sent:', data);
      }
    } catch (error) {
      console.error('[RevenueCat] Failed to send marketing notification:', error);
      // Don't throw - notification failure shouldn't break the purchase flow
    }
  }

  /**
   * Get all marketing subscription statuses
   */
  async getMarketingSubscriptionStatus(): Promise<{
    hasPremium: boolean;
    hasAds: boolean;
    premiumExpires?: string;
    adsExpires?: string;
  }> {
    try {
      // First try to restore purchases to ensure we have latest subscription info
      const customerInfo = await this.restorePurchases() || await this.getCustomerInfo();
      if (!customerInfo) {
        console.log('[RevenueCat] No customer info for marketing status');
        return { hasPremium: false, hasAds: false };
      }

      console.log('[RevenueCat] Checking marketing status...');
      console.log('[RevenueCat] Active entitlements:', Object.keys(customerInfo.entitlements.active));
      console.log('[RevenueCat] Active subscriptions:', customerInfo.activeSubscriptions);

      // Check by entitlement name
      const premiumEntitlement = customerInfo.entitlements.active[MARKETING_PREMIUM_ENTITLEMENT];
      const adsEntitlement = customerInfo.entitlements.active[MARKETING_ADS_ENTITLEMENT];

      // Also check by product ID in active subscriptions (for sandbox testing)
      const hasPremiumByProduct = customerInfo.activeSubscriptions?.includes(PRODUCT_IDS.MARKETING_PREMIUM) || false;
      const hasAdsByProduct = customerInfo.activeSubscriptions?.includes(PRODUCT_IDS.MARKETING_ADS) || false;

      // Also check all entitlements for matching product IDs
      let hasPremiumByEntitlement = premiumEntitlement !== undefined;
      let hasAdsByEntitlement = adsEntitlement !== undefined;
      let premiumExp: string | undefined = premiumEntitlement?.expirationDate || undefined;
      let adsExp: string | undefined = adsEntitlement?.expirationDate || undefined;

      // Check each active entitlement's product identifier
      for (const [key, entitlement] of Object.entries(customerInfo.entitlements.active)) {
        console.log(`[RevenueCat] Entitlement "${key}" has product: ${entitlement.productIdentifier}`);
        if (entitlement.productIdentifier === PRODUCT_IDS.MARKETING_PREMIUM) {
          hasPremiumByEntitlement = true;
          premiumExp = entitlement.expirationDate || undefined;
        }
        if (entitlement.productIdentifier === PRODUCT_IDS.MARKETING_ADS) {
          hasAdsByEntitlement = true;
          adsExp = entitlement.expirationDate || undefined;
        }
      }

      const result = {
        hasPremium: hasPremiumByEntitlement || hasPremiumByProduct,
        hasAds: hasAdsByEntitlement || hasAdsByProduct,
        premiumExpires: premiumExp,
        adsExpires: adsExp,
      };

      console.log('[RevenueCat] Marketing status result:', result);
      return result;
    } catch (error) {
      console.error('[RevenueCat] Error getting marketing status:', error);
      return { hasPremium: false, hasAds: false };
    }
  }

  /**
   * Sync subscription status to Supabase
   * Saves RevenueCat app_user_id and subscription details
   */
  async syncSubscriptionToSupabase(): Promise<void> {
    try {
      if (!this.currentUserId) {
        console.log('[RevenueCat] No user ID, skipping Supabase sync');
        return;
      }

      const customerInfo = this.customerInfo || await this.getCustomerInfo();
      if (!customerInfo) {
        console.log('[RevenueCat] No customer info, skipping Supabase sync');
        return;
      }

      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      const isActive = entitlement !== undefined;

      // Get the RevenueCat app_user_id (might be different from Supabase user_id)
      const rcAppUserId = customerInfo.originalAppUserId;

      console.log('[RevenueCat] Syncing to Supabase:', {
        userId: this.currentUserId,
        rcAppUserId,
        isActive,
        productId: entitlement?.productIdentifier,
      });

      // Upsert subscription data to Supabase
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: this.currentUserId,
          revenuecat_app_user_id: rcAppUserId,
          is_active: isActive,
          product_id: entitlement?.productIdentifier || null,
          entitlement_id: isActive ? ENTITLEMENT_ID : null,
          expires_at: entitlement?.expirationDate || null,
          will_renew: entitlement?.willRenew || false,
          platform: 'ios',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('[RevenueCat] Failed to sync to Supabase:', error);
      } else {
        console.log('[RevenueCat] Successfully synced subscription to Supabase');
      }
    } catch (error) {
      console.error('[RevenueCat] Error syncing to Supabase:', error);
    }
  }
}

// Export singleton instance
export const revenueCatService = new RevenueCatService();
