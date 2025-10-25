import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const redirectUri = import.meta.env.VITE_GMAIL_REDIRECT_URI || `${window.location.origin}/gmail-oauth-callback`;

export const GmailOAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      // Get authorization code from URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const errorParam = params.get('error');

      if (errorParam) {
        throw new Error(`OAuth error: ${errorParam}`);
      }

      if (!code) {
        throw new Error('No authorization code received');
      }

      console.log('🔐 Processing OAuth callback...');

      // Exchange code for tokens via edge function
      const response = await fetch(`${supabaseUrl}/functions/v1/gmail-oauth-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          code,
          redirectUri,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect Gmail');
      }

      const data = await response.json();
      console.log('✅ Gmail connected:', data.email);

      setEmail(data.email);
      setStatus('success');

      // Notify parent window if opened as popup
      if (window.opener) {
        window.opener.postMessage({
          type: 'GMAIL_OAUTH_SUCCESS',
          email: data.email,
        }, window.location.origin);

        // Close popup after 2 seconds
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        // Redirect to settings after 2 seconds
        setTimeout(() => {
          navigate('/settings');
        }, 2000);
      }

    } catch (error: any) {
      console.error('OAuth callback error:', error);
      setError(error.message || 'Failed to connect Gmail');
      setStatus('error');

      // Notify parent window if opened as popup
      if (window.opener) {
        window.opener.postMessage({
          type: 'GMAIL_OAUTH_ERROR',
          error: error.message,
        }, window.location.origin);

        setTimeout(() => {
          window.close();
        }, 3000);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connecting Gmail...
            </h2>
            <p className="text-gray-600">
              Please wait while we securely connect your Gmail account
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Gmail Connected!
            </h2>
            <p className="text-gray-600 mb-4">
              Successfully connected: <span className="font-medium">{email}</span>
            </p>
            <p className="text-sm text-gray-500">
              {window.opener ? 'This window will close automatically...' : 'Redirecting to settings...'}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connection Failed
            </h2>
            <p className="text-red-600 mb-4">{error}</p>
            {!window.opener && (
              <button
                onClick={() => navigate('/settings')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Settings
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GmailOAuthCallback;
