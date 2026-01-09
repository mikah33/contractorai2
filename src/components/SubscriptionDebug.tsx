import { useState } from 'react';
import { subscriptionService } from '../services/subscriptionService';
import { useAuthStore } from '../stores/authStore';
import { useSubscription } from '../hooks/useSubscription';

export const SubscriptionDebug = () => {
  const { user } = useAuthStore();
  const subscription = useSubscription();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleRefresh = async () => {
    if (!user?.id) return;

    setLoading(true);
    setResult(null);

    try {
      console.log('🔄 Starting subscription refresh...');

      // Force refresh subscription from current platform
      const hasSubscription = await subscriptionService.refreshSubscription();

      // Get subscription details from database
      const details = await subscriptionService.getSubscriptionDetails();

      setResult(`
✅ Subscription Status: ${hasSubscription ? 'ACTIVE' : 'INACTIVE'}
📱 Platform: ${subscription.isNativePlatform ? 'iOS' : 'Web'}
💳 Provider: ${subscription.paymentProvider}
📊 Details: ${JSON.stringify(details, null, 2)}
      `);

      // Refresh the subscription hook
      subscription.refresh();
    } catch (error) {
      console.error('❌ Subscription refresh failed:', error);
      setResult(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="p-4 text-gray-500">Please sign in to debug subscriptions</div>;
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Subscription Debug</h3>

      <div className="space-y-2 mb-4">
        <p><strong>User ID:</strong> {user.id}</p>
        <p><strong>Platform:</strong> {subscription.isNativePlatform ? 'iOS' : 'Web'}</p>
        <p><strong>Has Subscription:</strong> {subscription.hasSubscription ? '✅ Yes' : '❌ No'}</p>
        <p><strong>Status:</strong> {subscription.subscriptionStatus || 'None'}</p>
        <p><strong>Source:</strong> {subscription.subscriptionSource || 'None'}</p>
        <p><strong>Loading:</strong> {subscription.loading ? 'Yes' : 'No'}</p>
      </div>

      <button
        onClick={handleRefresh}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? 'Refreshing...' : 'Force Sync Subscription'}
      </button>

      {result && (
        <div className="mt-4 p-3 bg-white rounded border">
          <h4 className="font-bold mb-2">Refresh Result:</h4>
          <pre className="text-xs overflow-auto">{result}</pre>
        </div>
      )}
    </div>
  );
};