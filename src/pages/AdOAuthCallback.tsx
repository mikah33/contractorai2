import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AdOAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting to Google Ads...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');
        const errorDescription = params.get('error_description');

        // Debug: Log all URL parameters
        console.log('OAuth callback URL:', window.location.href);
        console.log('All params:', Object.fromEntries(params.entries()));

        if (error) {
          setStatus('error');
          setMessage(`OAuth error: ${error}\n${errorDescription || ''}`);
          setTimeout(() => navigate('/ad-accounts'), 3000);
          return;
        }

        if (!code) {
          setStatus('error');
          const debugInfo = {
            url: window.location.href,
            origin: window.location.origin,
            pathname: window.location.pathname,
            search: window.location.search,
            hash: window.location.hash,
            params: Object.fromEntries(params.entries()),
            expectedRedirectUri: `${window.location.origin}/ad-oauth-callback`,
          };
          setMessage(`No authorization code received.\n\n⚠️ This usually means:\n1. Redirect URI mismatch in Google Cloud Console\n2. You cancelled the authorization\n3. OAuth consent screen not configured\n\nDebug Info:\n${JSON.stringify(debugInfo, null, 2)}\n\n✅ Expected Redirect URI:\nhttp://localhost:5174/ad-oauth-callback\n\n🔧 Check Google Cloud Console:\n- Click your OAuth client (716912343285...)\n- Verify "Authorized redirect URIs" matches exactly`);
          setTimeout(() => navigate('/ad-accounts'), 10000);
          return;
        }

        setMessage('Exchanging authorization code...');

        // Call Supabase Edge Function to exchange code for tokens
        const { data, error: functionError } = await supabase.functions.invoke(
          'google-ads-oauth',
          {
            body: {
              code,
              redirect_uri: `${window.location.origin}/ad-oauth-callback`,
            },
          }
        );

        console.log('Edge Function response:', { data, functionError });

        if (functionError) {
          // Extract the actual error message from the function
          const errorMsg = data?.error || functionError.message || 'Unknown error';
          throw new Error(errorMsg);
        }

        if (!data || data.error) {
          throw new Error(data?.error || 'Failed to connect Google Ads account');
        }

        setMessage('Saving account information...');

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('User not authenticated');
        }

        // Save account to database
        const { error: insertError } = await supabase
          .from('ad_accounts')
          .insert({
            user_id: user.id,
            platform: 'google_ads',
            account_id: data.account_id,
            account_name: data.account_name || 'Google Ads Account',
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            status: 'active',
          });

        if (insertError) {
          throw insertError;
        }

        setStatus('success');
        setMessage('Google Ads account connected successfully!');
        setTimeout(() => navigate('/ad-accounts'), 2000);

      } catch (error: any) {
        console.error('OAuth callback error:', error);
        setStatus('error');

        // Extract detailed error message
        let errorMsg = error.message || 'Failed to connect Google Ads account';
        if (error.context?.body) {
          errorMsg = `${errorMsg}\n\nDetails: ${JSON.stringify(error.context.body, null, 2)}`;
        }

        setMessage(errorMsg);
        setTimeout(() => navigate('/ad-accounts'), 5000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 mx-auto text-blue-600 animate-spin mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Connecting...</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Success!</h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 mx-auto text-red-600 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Connection Failed</h2>
            <pre className="text-sm text-gray-600 text-left bg-gray-50 p-4 rounded mt-4 max-w-lg overflow-auto">
              {message}
            </pre>
            <button
              onClick={() => navigate('/ad-accounts')}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Return to Ad Accounts
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AdOAuthCallback;
