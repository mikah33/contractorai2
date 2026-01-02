import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { revenueCatService } from '../services/revenueCatService';
import { Capacitor } from '@capacitor/core';
import { RevenueCatUI } from '@revenuecat/purchases-capacitor-ui';
import { useAuthStore } from '../stores/authStore';

const SubscriptionsIOS: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showingPaywall, setShowingPaywall] = useState(false);

  useEffect(() => {
    initializeRevenueCat();
  }, [user]);

  const initializeRevenueCat = async () => {
    try {
      if (Capacitor.getPlatform() !== 'ios') {
        setError('This page is only available on iOS');
        setLoading(false);
        return;
      }

      console.log('[SubscriptionsIOS] Initializing RevenueCat with user:', user?.id);
      // Pass user ID to maintain consistent RevenueCat identity
      await revenueCatService.initialize(user?.id);

      console.log('[SubscriptionsIOS] Checking subscription status...');
      const hasSubscription = await revenueCatService.hasActiveSubscription();

      if (hasSubscription) {
        console.log('[SubscriptionsIOS] User has active subscription, redirecting...');
        // User already has subscription, reload to grant access
        window.location.reload();
        return;
      }

      setLoading(false);
    } catch (error: any) {
      console.error('[SubscriptionsIOS] Initialization error:', error);
      setError(error.message || 'Failed to initialize subscription system');
      setLoading(false);
    }
  };

  const showPaywall = async () => {
    try {
      setShowingPaywall(true);
      console.log('[SubscriptionsIOS] Presenting paywall...');

      // Use presentPaywall instead of presentPaywallIfNeeded to avoid potential loop issues
      const result = await RevenueCatUI.presentPaywall();

      console.log('[SubscriptionsIOS] Paywall result:', result);

      // Always refresh customer info after paywall dismisses
      console.log('[SubscriptionsIOS] Refreshing customer info...');
      await revenueCatService.refreshCustomerInfo();

      // Check if user now has subscription
      const hasSubscription = await revenueCatService.hasActiveSubscription();
      console.log('[SubscriptionsIOS] Subscription status after paywall:', hasSubscription);

      if (hasSubscription) {
        console.log('[SubscriptionsIOS] Purchase successful! Reloading app...');
        // Add small delay to ensure RevenueCat sync completes
        await new Promise(resolve => setTimeout(resolve, 500));
        window.location.reload();
        return; // Exit early to prevent setShowingPaywall(false)
      }

      setShowingPaywall(false);
    } catch (error: any) {
      console.error('[SubscriptionsIOS] Paywall error:', error);
      setShowingPaywall(false);

      if (error.code !== '1' && !error.userCancelled) {
        setError(`Failed to show subscription options: ${error.message || 'Please configure products in RevenueCat dashboard first.'}`);
      }
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[SubscriptionsIOS] Restoring purchases...');
      const customerInfo = await revenueCatService.restorePurchases();

      if (customerInfo) {
        const hasSubscription = await revenueCatService.hasActiveSubscription();

        if (hasSubscription) {
          alert('Purchases restored successfully!');
          window.location.reload();
        } else {
          alert('No previous purchases found.');
        }
      } else {
        alert('No previous purchases found.');
      }

      setLoading(false);
    } catch (error: any) {
      console.error('[SubscriptionsIOS] Restore error:', error);
      setError('Failed to restore purchases. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading subscription options...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold"
            >
              Try Again
            </button>
            <button
              onClick={handleRestorePurchases}
              className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-semibold"
            >
              Restore Purchases
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 w-screen max-w-full overflow-x-hidden">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Subscribe to ContractorAI Pro
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Unlock all premium features for your contracting business
          </p>
        </div>

        {/* Feature List */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What's Included:</h2>
          <ul className="space-y-4">
            {[
              'Unlimited job estimates & invoices',
              'Real-time profit tracking',
              'Crew scheduling & management',
              'Professional roofing reports',
              'Mobile app (iOS & Android)',
              'Customer database & CRM',
              'Payment tracking',
              'Priority support',
            ].map((feature, index) => (
              <li key={index} className="flex items-start">
                <svg className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700 text-lg">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={showPaywall}
            disabled={showingPaywall}
            className="w-full py-4 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition-colors flex items-center justify-center"
          >
            {showingPaywall ? (
              <>
                <Loader2 className="animate-spin h-6 w-6 mr-2" />
                Loading...
              </>
            ) : (
              'View Subscription Plans'
            )}
          </button>

          <button
            onClick={handleRestorePurchases}
            disabled={loading || showingPaywall}
            className="w-full py-3 px-6 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            Restore Previous Purchases
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            All plans include a 7-day free trial
          </p>
        </div>

        {/* Subscription Details - Required by Apple Guideline 3.1.2 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Auto-Renewable Subscription</h3>

          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <strong>Subscription Name:</strong> ContractorAI Pro
            </div>

            <div>
              <strong>Pricing & Duration:</strong>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Monthly Plan: $34.99 per month</li>
                <li>Quarterly Plan: $84.99 every 3 months</li>
                <li>Annual Plan: $349.99 per year</li>
              </ul>
            </div>

            <div>
              <strong>Free Trial:</strong> 7 days
            </div>

            <div>
              <strong>Auto-Renewal:</strong> Your subscription automatically renews unless cancelled at least 24 hours before the end of the current period. You will be charged for renewal within 24 hours prior to the end of the current period.
            </div>

            <div>
              <strong>Payment:</strong> Payment will be charged to your Apple ID at confirmation of purchase.
            </div>

            <div>
              <strong>Manage Subscription:</strong> You can manage and cancel subscriptions in your Apple ID Account Settings after purchase.
            </div>
          </div>
        </div>

        {/* Terms and Privacy */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-3">
            By subscribing, you agree to our{' '}
            <Link to="/legal/terms" className="text-blue-600 hover:text-blue-700 font-semibold underline">
              Terms of Service (EULA)
            </Link>
            {' '}and{' '}
            <Link to="/legal/privacy" className="text-blue-600 hover:text-blue-700 font-semibold underline">
              Privacy Policy
            </Link>
          </p>
        </div>

        {/* Support */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-2">Need help?</p>
          <a
            href="mailto:admin@elevatedsystems.info"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionsIOS;
