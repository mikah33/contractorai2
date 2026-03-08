import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FacebookPageSelector from '../components/settings/FacebookPageSelector';

const MetaOAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'selectPage'>('loading');
  const [message, setMessage] = useState('Connecting to Meta...');
  const [fbAccessToken, setFbAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');
        const errorDescription = params.get('error_description');
        const state = params.get('state') || '';

        if (error) {
          setStatus('error');
          setMessage(`OAuth error: ${error}\n${errorDescription || ''}`);
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received.');
          setTimeout(() => navigate('/settings'), 5000);
          return;
        }

        // If from iOS app, bounce the code back via deep link
        if (state === 'fb_leads_app') {
          setMessage('Redirecting back to app...');
          window.location.href = `contractorai://fb-callback?code=${encodeURIComponent(code)}`;
          // Fallback if deep link doesn't work after 3 seconds
          setTimeout(() => {
            setStatus('error');
            setMessage('Could not redirect back to the app. Please open the OnSite app.');
          }, 3000);
          return;
        }

        // Web flow: exchange token and show page selector
        if (state === 'fb_leads_web' || state === 'fb_leads') {
          setMessage('Exchanging authorization code...');

          const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
            'fb-connect-page',
            {
              body: {
                action: 'exchange_token',
                code,
                redirectUri: 'https://contractorai.tools/meta-oauth-callback',
              },
            }
          );

          if (tokenError || tokenData?.error) {
            throw new Error(tokenData?.error || tokenError?.message || 'Failed to exchange token');
          }

          setFbAccessToken(tokenData.access_token);
          setStatus('selectPage');
          return;
        }

        // Original Meta Ads flow
        setMessage('Exchanging authorization code...');

        const { data, error: functionError } = await supabase.functions.invoke(
          'meta-ads-oauth',
          {
            body: {
              code,
              redirect_uri: `${window.location.origin}/meta-oauth-callback`,
            },
          }
        );

        if (functionError) {
          throw new Error(data?.error || functionError.message || 'Unknown error');
        }

        if (!data || data.error) {
          throw new Error(data?.error || 'Failed to connect Meta Ads account');
        }

        setMessage('Saving account information...');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error: insertError } = await supabase
          .from('ad_accounts')
          .insert({
            user_id: user.id,
            platform: 'meta_ads',
            account_id: data.account_id,
            account_name: data.account_name || 'Meta Ads Account',
            access_token: data.access_token,
            status: 'active',
          });

        if (insertError) throw insertError;

        setStatus('success');
        setMessage('Meta Ads account connected successfully!');
        setTimeout(() => navigate('/ad-accounts'), 2000);

      } catch (error: any) {
        console.error('Meta OAuth callback error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to connect');
      }
    };

    handleCallback();
  }, [navigate]);

  // Page selector for Facebook Lead Ads (web flow)
  if (status === 'selectPage' && fbAccessToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <FacebookPageSelector
          accessToken={fbAccessToken}
          onClose={() => navigate('/settings', { state: { section: 'facebookLeads' } })}
          onConnected={() => {
            navigate('/settings', { state: { section: 'facebookLeads' } });
          }}
        />
      </div>
    );
  }

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
              onClick={() => navigate('/settings')}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Return to Settings
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MetaOAuthCallback;
