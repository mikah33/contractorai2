import { useState, useEffect } from 'react';
import { CreditCard, ExternalLink, Check, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StripeAccountStatus {
  connected: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  email?: string;
  businessName?: string;
}

export default function StripeConnectButton() {
  const [status, setStatus] = useState<StripeAccountStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setStatus({ connected: false });
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-onboard`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'status' }),
        }
      );

      const data = await response.json();

      // If there's an error, default to not connected
      if (data.error || !response.ok) {
        console.error('Stripe status check failed:', data.error || 'Unknown error');
        setStatus({ connected: false });
      } else {
        setStatus(data);
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
      // On error, show as not connected
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setActionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert('Please sign in first');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-onboard`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'create' }),
        }
      );

      const data = await response.json();

      // Log the full response for debugging
      console.log('Stripe Connect Response:', data);

      if (data.error) {
        throw new Error(`Stripe Error: ${data.error} (${data.details || 'no details'})`);
      }

      if (data.url) {
        // Redirect to Stripe Connect onboarding
        window.location.href = data.url;
      } else {
        throw new Error('No onboarding URL returned');
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      alert('Failed to connect Stripe account. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDashboard = async () => {
    try {
      setActionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-onboard`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'dashboard' }),
        }
      );

      const data = await response.json();

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening dashboard:', error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 bg-white rounded-lg shadow">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Checking Stripe connection...</span>
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <CreditCard className="h-8 w-8 text-blue-600" />
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              Connect Your Stripe Account
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Connect your Stripe account to receive payments from clients directly.
              You'll be able to generate payment links for invoices and get paid instantly.
            </p>
            <div className="mt-4">
              <button
                onClick={handleConnect}
                disabled={actionLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Connect Stripe Account
                  </>
                )}
              </button>
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <h4 className="text-sm font-medium text-blue-900">What happens next?</h4>
              <ul className="mt-2 text-sm text-blue-700 space-y-1">
                <li>• You'll be redirected to Stripe</li>
                <li>• Sign in or create a new Stripe account</li>
                <li>• Complete your business information</li>
                <li>• Return here to start accepting payments</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100">
              <Check className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">
              Stripe Account Connected
            </h3>
            {status.businessName && (
              <p className="mt-1 text-sm text-gray-600">{status.businessName}</p>
            )}
            {status.email && (
              <p className="text-sm text-gray-500">{status.email}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center">
          {status.chargesEnabled ? (
            <Check className="h-5 w-5 text-green-500 mr-2" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
          )}
          <span className="text-sm text-gray-700">
            {status.chargesEnabled ? 'Payments Enabled' : 'Payments Pending'}
          </span>
        </div>

        <div className="flex items-center">
          {status.payoutsEnabled ? (
            <Check className="h-5 w-5 text-green-500 mr-2" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
          )}
          <span className="text-sm text-gray-700">
            {status.payoutsEnabled ? 'Payouts Enabled' : 'Payouts Pending'}
          </span>
        </div>

        <div className="flex items-center">
          {status.detailsSubmitted ? (
            <Check className="h-5 w-5 text-green-500 mr-2" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
          )}
          <span className="text-sm text-gray-700">
            {status.detailsSubmitted ? 'Setup Complete' : 'Setup Incomplete'}
          </span>
        </div>
      </div>

      {(!status.chargesEnabled || !status.detailsSubmitted) && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Your Stripe account setup is incomplete. Complete it to start accepting payments.
              </p>
              <button
                onClick={handleConnect}
                disabled={actionLoading}
                className="mt-2 text-sm font-medium text-yellow-700 hover:text-yellow-600"
              >
                Complete Setup →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex space-x-3">
        <button
          onClick={handleDashboard}
          disabled={actionLoading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {actionLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4 mr-2" />
          )}
          Open Stripe Dashboard
        </button>

        <button
          onClick={checkStatus}
          disabled={actionLoading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
}
